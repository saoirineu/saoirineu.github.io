import { collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';

import { db } from './firebase';
import {
  asOptionalBoolean,
  asOptionalNumber,
  asOptionalString,
  asOptionalTimestamp,
  asRecord,
  asStringArray,
  isRecord,
  removeUndefinedDeep
} from './firestoreData';

export type MemberSourceFile = 'complete' | 'importer' | 'certificates';

export type MemberSource = {
  file: MemberSourceFile;
  /** The source record's own identifier (cloud Codice / importer Codice Socio / certificate Codice). */
  code?: string;
  /** 1-based row in the source spreadsheet. */
  line?: number;
};

export type MemberConflicts = Record<string, string[]>;
export type MemberSuperseeded = Record<string, string[]>;

/** Plain text fields shared across the registry sources (used for mapping & merge gap-fill). */
export const MEMBER_TEXT_FIELDS = [
  'surname', 'firstName', 'fullName', 'fiscalCode', 'sex', 'birthDate',
  'birthPlace', 'birthProvince', 'birthCountry', 'email', 'email2', 'phone',
  'mobile', 'address', 'postalCode', 'city', 'province', 'region', 'country',
  'memberCode', 'memberStatus', 'group', 'category', 'cardNumber', 'cardExpiry',
  'referenceSeat', 'originSociety', 'profession', 'nationality', 'citizenship',
  'registrationRequestDate', 'registrationDate', 'renewalDate', 'cancellationDate',
  'firstWorkDate'
] as const;

export type MemberTextField = (typeof MEMBER_TEXT_FIELDS)[number];

export type MemberRecord = {
  id: string;
  sources: MemberSource[];
  conflicts: MemberConflicts;
  superseeded: MemberSuperseeded;
  reviewReasons: string[];
  possibleDuplicateIds: string[];
  needsReview: boolean;
  reviewedBy?: string;
  reviewedAt?: Date | null;
} & Partial<Record<MemberTextField, string>>;

/** Fields the admin may write back (excludes derived bookkeeping handled by mutations). */
export type MemberPatch = Partial<
  Record<MemberTextField, string | undefined>
> & {
  conflicts?: MemberConflicts;
  superseeded?: MemberSuperseeded;
  possibleDuplicateIds?: string[];
  reviewReasons?: string[];
  needsReview?: boolean;
  sources?: MemberSource[];
};

const membersRef = collection(db, 'members');

function mapSource(value: unknown): MemberSource | undefined {
  if (!isRecord(value)) return undefined;
  const file = asOptionalString(value.file);
  if (file !== 'complete' && file !== 'importer' && file !== 'certificates') return undefined;
  return { file, code: asOptionalString(value.code), line: asOptionalNumber(value.line) };
}

function mapConflicts(value: unknown): MemberConflicts {
  const record = asRecord(value);
  const conflicts: MemberConflicts = {};
  for (const [field, raw] of Object.entries(record)) {
    const values = asStringArray(raw);
    if (values) conflicts[field] = values;
  }
  return conflicts;
}

export function mapMember(id: string, value: unknown): MemberRecord {
  const data = asRecord(value);
  const member: MemberRecord = {
    id,
    sources: Array.isArray(data.sources)
      ? data.sources.map(mapSource).filter((s): s is MemberSource => Boolean(s))
      : [],
    conflicts: mapConflicts(data.conflicts),
    superseeded: mapConflicts(data.superseeded),
    reviewReasons: asStringArray(data.reviewReasons) ?? [],
    possibleDuplicateIds: asStringArray(data.possibleDuplicateIds) ?? [],
    needsReview: asOptionalBoolean(data.needsReview) ?? false,
    reviewedBy: asOptionalString(data.reviewedBy),
    reviewedAt: asOptionalTimestamp(data.reviewedAt)?.toDate() ?? null
  };

  for (const field of MEMBER_TEXT_FIELDS) {
    const text = asOptionalString(data[field]);
    if (text !== undefined) member[field] = text;
  }

  return member;
}

export async function fetchMembers(): Promise<MemberRecord[]> {
  const snapshot = await getDocs(membersRef);
  return snapshot.docs.map(docSnap => mapMember(docSnap.id, docSnap.data()));
}

/** Apply a partial field update, refreshing updatedAt. */
export async function updateMember(id: string, patch: MemberPatch): Promise<void> {
  await updateDoc(doc(membersRef, id), {
    ...removeUndefinedDeep(patch),
    updatedAt: serverTimestamp()
  });
}

/** Admin sign-off: stop flagging the record for review. */
export async function markMemberReviewed(id: string, uid: string): Promise<void> {
  await updateDoc(doc(membersRef, id), {
    needsReview: false,
    reviewedBy: uid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function deleteMember(id: string): Promise<void> {
  await deleteDoc(doc(membersRef, id));
}

/**
 * Merge two members: write the already-computed merged fields onto the target
 * and delete the source, atomically. The merged payload is produced by the pure
 * helper `mergeMemberRecords` in pages/members/form.ts.
 */
export async function commitMemberMerge(args: {
  targetId: string;
  targetData: MemberPatch;
  sourceId: string;
}): Promise<void> {
  const batch = writeBatch(db);
  batch.set(
    doc(membersRef, args.targetId),
    { ...removeUndefinedDeep(args.targetData), updatedAt: serverTimestamp() },
    { merge: true }
  );
  batch.delete(doc(membersRef, args.sourceId));
  await batch.commit();
}
