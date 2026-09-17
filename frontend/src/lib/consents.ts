import { Timestamp, addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from './firebase';
import { asOptionalString, asOptionalTimestamp, asRecord, removeUndefinedDeep } from './firestoreData';
import type { SiteLocale } from './siteLocale';
import { getUploadContentType, validateUploadFile } from './uploads';

export type ConsentStatus = 'pending' | 'approved' | 'rejected';

// A signed informed consent is valid for this many months after it was approved.
export const CONSENT_VALIDITY_MONTHS = 12;

// Below this age a member signs the minor form (with those holding parental
// responsibility), and a consent signed on it stops counting on this birthday.
export const CONSENT_MAJORITY_AGE = 18;

export type ConsentFormVariant = 'adult' | 'minor';

/**
 * The blank consent form (effective 10.09.2026), one PDF per variant and
 * language; French exists but the portal has no French locale. Read from
 * Storage docs/ like the privacy notice and the statute, so a new version
 * reaches members without a code deploy; uploaded with
 * scripts/upload-documents.mjs as iceflu-consenso-informato-{adulti|minori}-{locale}.pdf.
 * Not read from event data, since a member signs one consent for the
 * association, not for a particular event.
 */
export function consentFormUrl(variant: ConsentFormVariant, locale: SiteLocale): string {
  const name = `iceflu-consenso-informato-${variant === 'adult' ? 'adulti' : 'minori'}-${locale}.pdf`;
  return `https://firebasestorage.googleapis.com/v0/b/sao-irineu.firebasestorage.app/o/docs%2F${name}?alt=media`;
}

/**
 * The day someone born on `birthDate` (the profile's YYYY-MM-DD) comes of age,
 * at local midnight, or null when the date is missing or not a real date.
 */
export function majorityDate(birthDate: string | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate ?? '');
  if (!match) return null;

  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const born = new Date(year, month, day);
  if (born.getMonth() !== month || born.getDate() !== day) return null;

  return new Date(year + CONSENT_MAJORITY_AGE, month, day);
}

/** Which form the member signs today; null when the birth date is unknown, so both can be offered. */
export function consentFormVariant(birthDate: string | undefined, now: Date = new Date()): ConsentFormVariant | null {
  const majority = majorityDate(birthDate);
  if (!majority) return null;
  return now.getTime() < majority.getTime() ? 'minor' : 'adult';
}

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

/** What the validity rules read from a consent; uploadedAt tells whether it was signed as a minor. */
type ConsentValidityFields = Pick<ConsentRecord, 'status' | 'approvedAt'> & Partial<Pick<ConsentRecord, 'uploadedAt'>>;

/** Whether a consent was sent before the member came of age, so on the minor form. */
export function signedAsMinor(
  consent: Pick<ConsentValidityFields, 'uploadedAt' | 'approvedAt'>,
  birthDate: string | undefined
): boolean {
  const majority = majorityDate(birthDate);
  const signedAt = consent.uploadedAt ?? consent.approvedAt;
  return !!majority && !!signedAt && signedAt.getTime() < majority.getTime();
}

/**
 * When the member's approved consents stop counting, or null if none is approved.
 * An approval lasts {@link CONSENT_VALIDITY_MONTHS}; one signed as a minor also
 * ends at majority, when the adult form becomes due. Without a birth date no
 * consent is treated as a minor's.
 */
export function consentValidUntil(consents: ReadonlyArray<ConsentValidityFields>, birthDate?: string): Date | null {
  const majority = majorityDate(birthDate);
  const expiries = consents
    .filter(consent => consent.status === 'approved' && consent.approvedAt)
    .map(consent => {
      const expiry = new Date(consent.approvedAt!);
      expiry.setMonth(expiry.getMonth() + CONSENT_VALIDITY_MONTHS);
      return majority && signedAsMinor(consent, birthDate) && majority < expiry ? majority : expiry;
    });
  if (!expiries.length) return null;

  return new Date(Math.max(...expiries.map(expiry => expiry.getTime())));
}

/**
 * Item A: the signed informed consent must be asked for when the user has no
 * approved consent on file, or the most recently approved one is older than
 * {@link CONSENT_VALIDITY_MONTHS} or was signed as a minor by someone who has
 * since come of age. "Exactly 12 months old" still counts as valid.
 */
export function consentRequired(
  consents: ReadonlyArray<ConsentValidityFields>,
  now: Date = new Date(),
  birthDate?: string
): boolean {
  const validUntil = consentValidUntil(consents, birthDate);
  return !validUntil || validUntil.getTime() < now.getTime();
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
  consents: ReadonlyArray<ConsentValidityFields>,
  now: Date = new Date(),
  birthDate?: string
): boolean {
  if (policy === 'noviceOnly') return isNovice;
  return isNovice || consentRequired(consents, now, birthDate);
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
