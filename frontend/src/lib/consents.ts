import { Timestamp, addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from './firebase';
import { asOptionalString, asOptionalTimestamp, asRecord, removeUndefinedDeep } from './firestoreData';
import { getUploadContentType, validateUploadFile } from './uploads';

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

/** Latest consent by upload time, whatever its status — what the member sees. */
export function latestConsent(consents: ReadonlyArray<ConsentRecord>): ConsentRecord | undefined {
  return [...consents].sort((a, b) => (b.uploadedAt?.getTime() ?? 0) - (a.uploadedAt?.getTime() ?? 0))[0];
}

/** When the most recent approved consent stops counting, or null if none is approved. */
export function consentValidUntil(consents: ReadonlyArray<ConsentRecord>): Date | null {
  const approved = consents
    .filter(consent => consent.status === 'approved' && consent.approvedAt)
    .map(consent => consent.approvedAt!.getTime());
  if (!approved.length) return null;

  const expiry = new Date(Math.max(...approved));
  expiry.setMonth(expiry.getMonth() + CONSENT_VALIDITY_MONTHS);
  return expiry;
}

/**
 * Stores a signed consent for the member and opens a pending record for review.
 * Not tied to an event: the same document serves membership and events alike.
 */
export async function uploadSignedConsent(uid: string, file: File): Promise<void> {
  const validationError = validateUploadFile(file);
  if (validationError === 'invalid-type') throw new Error('Only PDF, JPG, and PNG files are allowed.');
  if (validationError === 'file-too-large') throw new Error('Uploaded files must be 10 MB or smaller.');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const documentPath = `users/${uid}/consentDocument-${Date.now()}-${safeName}`;
  await uploadBytes(ref(storage, documentPath), file, { contentType: getUploadContentType(file) });
  await createConsentRecord(uid, { documentName: file.name, documentPath });
}

export async function resolveConsentDocumentUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}

/** Admin decision on a submitted consent. Approving anchors the 12-month clock. */
export async function decideConsent(
  uid: string,
  consentId: string,
  decision: 'approved' | 'rejected',
  adminUid: string
): Promise<void> {
  await updateDoc(doc(consentsRef(uid), consentId), {
    status: decision,
    approvedAt: decision === 'approved' ? serverTimestamp() : null,
    approvedBy: adminUid
  });
}
