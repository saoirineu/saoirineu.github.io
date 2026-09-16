import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { deleteObject, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from './firebase';
import { asOptionalNumber, asOptionalString, asOptionalTimestamp, asRecord } from './firestoreData';
import { getUploadContentType, validateUploadFile } from './uploads';
import type { WorkReviewStatus } from './works';

// Donations a church sent to ICEFLU Brazil, with proof of payment: the bank
// statement for a transfer, or the recipient's receipt for money handed over.
// Recorded by the church's managers (lib/churchManagers.ts); reviewed by admins,
// like work records. Receipts live in Storage under the donation's own folder:
// churches/{churchId}/donations/{donationId}/receipt-*.

export type DonationReason = 'feitio' | 'membership' | 'jurua';
export type DonationMethod = 'bank-transfer' | 'in-person';

export const DONATION_REASONS: DonationReason[] = ['feitio', 'membership', 'jurua'];
export const DONATION_METHODS: DonationMethod[] = ['bank-transfer', 'in-person'];

export type Donation = {
  id: string;
  churchId: string;
  churchName: string;
  /** Day the donation was sent, YYYY-MM-DD. */
  date: string;
  /** EUR. */
  amount: number;
  reason: DonationReason;
  recipient: string;
  method: DonationMethod;
  receiptPath: string;
  receiptName: string;
  reviewStatus: WorkReviewStatus;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  createdBy?: string;
  createdAt?: Timestamp;
  updatedBy?: string;
  updatedAt?: Timestamp;
};

export type DonationInput = Pick<
  Donation,
  'churchId' | 'churchName' | 'date' | 'amount' | 'reason' | 'recipient' | 'method' | 'receiptPath' | 'receiptName'
>;

const donationsRef = collection(db, 'icefluDonations');

function mapDonation(id: string, value: unknown): Donation {
  const data = asRecord(value);
  return {
    id,
    churchId: asOptionalString(data.churchId) ?? '',
    churchName: asOptionalString(data.churchName) ?? '',
    date: asOptionalString(data.date) ?? '',
    amount: asOptionalNumber(data.amount) ?? 0,
    reason: DONATION_REASONS.includes(data.reason as DonationReason) ? (data.reason as DonationReason) : 'feitio',
    recipient: asOptionalString(data.recipient) ?? '',
    method: data.method === 'in-person' ? 'in-person' : 'bank-transfer',
    receiptPath: asOptionalString(data.receiptPath) ?? '',
    receiptName: asOptionalString(data.receiptName) ?? '',
    reviewStatus: data.reviewStatus === 'reviewed' ? 'reviewed' : 'pre-approved',
    reviewedAt: asOptionalTimestamp(data.reviewedAt) ?? undefined,
    reviewedBy: asOptionalString(data.reviewedBy),
    createdBy: asOptionalString(data.createdBy),
    createdAt: asOptionalTimestamp(data.createdAt) ?? undefined,
    updatedBy: asOptionalString(data.updatedBy),
    updatedAt: asOptionalTimestamp(data.updatedAt) ?? undefined
  };
}

function sortDonations(donations: Donation[]) {
  return donations.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

/** Every donation — admins only. */
export async function fetchDonations(): Promise<Donation[]> {
  const snapshot = await getDocs(donationsRef);
  return sortDonations(snapshot.docs.map(docSnapshot => mapDonation(docSnapshot.id, docSnapshot.data())));
}

/** One equality query per church, which is what the rules can prove for a manager. */
export async function fetchDonationsForChurches(churchIds: string[]): Promise<Donation[]> {
  const snapshots = await Promise.all(
    churchIds.map(churchId => getDocs(query(donationsRef, where('churchId', '==', churchId))))
  );
  return sortDonations(snapshots.flatMap(snapshot => snapshot.docs.map(docSnapshot => mapDonation(docSnapshot.id, docSnapshot.data()))));
}

/** The id is chosen before saving, because the receipt is uploaded into the donation's folder first. */
export function newDonationId() {
  return doc(donationsRef).id;
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadDonationReceipt(churchId: string, donationId: string, file: File) {
  const validationError = validateUploadFile(file);
  if (validationError === 'invalid-type') {
    throw new Error('Only PDF, JPG, and PNG files are allowed.');
  }
  if (validationError === 'file-too-large') {
    throw new Error('Uploaded files must be 10 MB or smaller.');
  }

  const path = `churches/${churchId}/donations/${donationId}/receipt-${Date.now()}-${sanitizeFileName(file.name)}`;
  await uploadBytes(ref(storage, path), file, { contentType: getUploadContentType(file) });
  return { path, name: file.name };
}

/** Best effort: an orphaned receipt is harmless, a failed save is not. */
export async function deleteDonationReceipt(path: string) {
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // Already gone, or not ours to remove.
  }
}

function donationPayload(input: DonationInput) {
  return {
    churchId: input.churchId,
    churchName: input.churchName,
    date: input.date,
    amount: input.amount,
    reason: input.reason,
    recipient: input.recipient,
    method: input.method,
    receiptPath: input.receiptPath,
    receiptName: input.receiptName
  };
}

export async function createDonation(id: string, input: DonationInput, uid: string) {
  return setDoc(doc(donationsRef, id), {
    ...donationPayload(input),
    reviewStatus: 'pre-approved' satisfies WorkReviewStatus,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedBy: uid,
    updatedAt: serverTimestamp()
  });
}

/**
 * Saves an edit. A manager's edit sends a reviewed donation back to pre-approved;
 * an admin's own edit keeps its status.
 */
export async function updateDonation(id: string, input: DonationInput, options: { uid: string; keepReview: boolean }) {
  const payload: Record<string, unknown> = {
    ...donationPayload(input),
    updatedBy: options.uid,
    updatedAt: serverTimestamp()
  };

  if (!options.keepReview) {
    payload.reviewStatus = 'pre-approved' satisfies WorkReviewStatus;
    payload.reviewedAt = deleteField();
    payload.reviewedBy = deleteField();
  }

  return updateDoc(doc(donationsRef, id), payload);
}

export async function setDonationReviewStatus(id: string, status: WorkReviewStatus, uid: string) {
  const reviewed = status === 'reviewed';
  return updateDoc(doc(donationsRef, id), {
    reviewStatus: status,
    reviewedAt: reviewed ? serverTimestamp() : deleteField(),
    reviewedBy: reviewed ? uid : deleteField(),
    updatedBy: uid,
    updatedAt: serverTimestamp()
  });
}

/** Removes the record first, so a failure never leaves a donation pointing at a missing receipt. */
export async function deleteDonation(donation: Pick<Donation, 'id' | 'receiptPath'>) {
  await deleteDoc(doc(donationsRef, donation.id));
  if (donation.receiptPath) {
    await deleteDonationReceipt(donation.receiptPath);
  }
}
