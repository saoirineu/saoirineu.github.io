import { Timestamp, addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';

import { db } from './firebase';
import { asOptionalString, asOptionalTimestamp, asRecord, removeUndefinedDeep } from './firestoreData';

export type ConsentStatus = 'pending' | 'approved' | 'rejected';

// A signed informed consent is valid for this many months after it was approved.
export const CONSENT_VALIDITY_MONTHS = 12;

export type ConsentRecord = {
  id: string;
  status: ConsentStatus;
  uploadedAt: Date | null;
  approvedAt: Date | null;
  approvedBy?: string;
  documentName?: string;
  documentPath?: string;
  eventId?: string;
};

export type ConsentCreateInput = {
  documentName?: string;
  documentPath?: string;
  eventId?: string;
};

function consentsRef(uid: string) {
  return collection(db, 'users', uid, 'consents');
}

function normalizeConsentStatus(value: unknown): ConsentStatus {
  if (value === 'approved') return 'approved';
  if (value === 'rejected') return 'rejected';
  return 'pending';
}

function mapConsent(id: string, value: unknown): ConsentRecord {
  const data = asRecord(value);
  const uploadedAt = asOptionalTimestamp(data.uploadedAt);
  const approvedAt = asOptionalTimestamp(data.approvedAt);

  return {
    id,
    status: normalizeConsentStatus(data.status),
    uploadedAt: uploadedAt instanceof Timestamp ? uploadedAt.toDate() : null,
    approvedAt: approvedAt instanceof Timestamp ? approvedAt.toDate() : null,
    approvedBy: asOptionalString(data.approvedBy),
    documentName: asOptionalString(data.documentName),
    documentPath: asOptionalString(data.documentPath),
    eventId: asOptionalString(data.eventId)
  };
}

/**
 * Item A: the signed informed consent must be asked for when the user has no
 * approved consent on file, or the most recently approved one is older than
 * {@link CONSENT_VALIDITY_MONTHS}. "Exactly 12 months old" still counts as valid.
 */
export function consentRequired(
  consents: ReadonlyArray<Pick<ConsentRecord, 'status' | 'approvedAt'>>,
  now: Date = new Date()
): boolean {
  const approvedTimes = consents
    .filter(consent => consent.status === 'approved' && consent.approvedAt)
    .map(consent => consent.approvedAt!.getTime());

  if (approvedTimes.length === 0) {
    return true;
  }

  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - CONSENT_VALIDITY_MONTHS);

  const latestApproved = Math.max(...approvedTimes);
  return latestApproved < cutoff.getTime();
}

/**
 * Whether the signed informed consent must be provided for an event registration.
 *
 * - 'standard' (default): required for first-time participants OR when the user has
 *   no valid consent on file (see {@link consentRequired}).
 * - 'noviceOnly': required only for first-time participants; the 12-month rule does
 *   not apply. Used by the European Gathering.
 */
export function eventConsentNeeded(
  policy: 'standard' | 'noviceOnly' | undefined,
  isNovice: boolean,
  consents: ReadonlyArray<Pick<ConsentRecord, 'status' | 'approvedAt'>>,
  now: Date = new Date()
): boolean {
  if (policy === 'noviceOnly') return isNovice;
  return isNovice || consentRequired(consents, now);
}

export async function fetchUserConsents(uid: string): Promise<ConsentRecord[]> {
  const snapshot = await getDocs(query(consentsRef(uid), orderBy('uploadedAt', 'desc')));
  return snapshot.docs.map(docSnap => mapConsent(docSnap.id, docSnap.data()));
}

export async function createConsentRecord(uid: string, input: ConsentCreateInput): Promise<void> {
  await addDoc(
    consentsRef(uid),
    removeUndefinedDeep({
      status: 'pending',
      uploadedAt: serverTimestamp(),
      documentName: input.documentName,
      documentPath: input.documentPath,
      eventId: input.eventId
    })
  );
}
