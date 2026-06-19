import { FirebaseError } from 'firebase/app';
import {
  Timestamp,
  Transaction,
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { createConsentRecord } from './consents';
import type { EventRecord } from './events';
import type { LeaderApprovalDecision, RegistrationInterview } from './europeanGathering';
import { getEuropeanGatheringUploadContentType, validateEuropeanGatheringUploadFile } from './europeanGatheringUpload';
import { db, storage } from './firebase';
import {
  asOptionalBoolean,
  asOptionalNumber,
  asOptionalString,
  asOptionalTimestamp,
  asRecord,
  asStringArray,
  removeUndefinedDeep
} from './firestoreData';

// Pure, event-parameterized registration logic (Phase 4c, part 1).
// The Firestore CRUD, capacity transactions, rules and the generic renderer build on these.

export type EventAttendanceMode = 'lodging' | 'meals' | 'spiritual';

export type EventContributionInputs = {
  attendanceMode: EventAttendanceMode;
  checkIn?: string;
  checkOut?: string;
  selectedWorks: string[];
  isInitiated: boolean;
  isIcefluMember: boolean;
  needsExtraLinen: boolean;
};

export type EventContributionBreakdown = {
  nights: number;
  lodging: number;
  spiritualWorks: number;
  extras: number;
  total: number;
};

function asDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateEventNightCount(checkIn?: string, checkOut?: string): number {
  const start = asDate(checkIn);
  const end = asDate(checkOut);
  if (!start || !end) return 0;
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diffDays > 0 ? diffDays : 0;
}

export function calculateEventContribution(event: EventRecord, values: EventContributionInputs): EventContributionBreakdown {
  const nights = values.attendanceMode === 'spiritual' ? 0 : calculateEventNightCount(values.checkIn, values.checkOut);
  const nightRate = values.attendanceMode === 'meals' ? event.pricing.mealsNightRate : event.pricing.lodgingNightRate;
  const lodging = nights * nightRate;

  const tier = values.isIcefluMember
    ? event.pricing.worksByCount.iceflu
    : values.isInitiated
      ? event.pricing.worksByCount.initiated
      : event.pricing.worksByCount.anyone;
  const worksCount = Math.min(values.selectedWorks.length, event.works.length);
  const spiritualWorks = tier[worksCount] ?? 0;

  const extras = values.attendanceMode === 'lodging' && values.needsExtraLinen ? event.pricing.extraLinen : 0;

  return { nights, lodging, spiritualWorks, extras, total: lodging + spiritualWorks + extras };
}

export function calculateEventCautionDeposit(event: EventRecord, total: number): number {
  return Math.round(total * event.cautionDepositRate);
}

// ---- Capacity ---------------------------------------------------------------

export type EventCapacityBucket = { id: string; capacity: number };
export type EventCapacitySnapshotRow = EventCapacityBucket & { reserved: number; available: number };

// 'total' mode → a single bucket id 'total'; 'rooms' mode → one bucket per room name.
export function eventCapacityBuckets(event: EventRecord): EventCapacityBucket[] {
  if (event.capacityMode === 'rooms') {
    return (event.rooms ?? []).map(room => ({ id: room.name, capacity: room.capacity }));
  }
  return [{ id: 'total', capacity: event.totalSlots ?? 0 }];
}

export function totalEventCapacity(event: EventRecord): number {
  return eventCapacityBuckets(event).reduce((sum, bucket) => sum + bucket.capacity, 0);
}

export function buildEventCapacitySnapshot(
  event: EventRecord,
  reservedByBucket: Record<string, number>
): EventCapacitySnapshotRow[] {
  return eventCapacityBuckets(event).map(bucket => {
    const reserved = Math.max(0, Math.min(bucket.capacity, reservedByBucket[bucket.id] ?? 0));
    return { ...bucket, reserved, available: bucket.capacity - reserved };
  });
}

export function totalEventSlotsAvailable(snapshot: EventCapacitySnapshotRow[]): number {
  return snapshot.reduce((sum, row) => sum + row.available, 0);
}

// ---- Validation -------------------------------------------------------------

export type EventRegistrationFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  church: string;
  centerLeader: string;
  centerLeaderEmail: string;
  isInitiated: boolean;
  isIcefluMember: boolean;
  isNovice: boolean;
  attendanceMode: EventAttendanceMode;
  checkIn: string;
  checkOut: string;
  selectedWorks: string[];
  needsExtraLinen: boolean;
};

export type EventRegistrationValidationError =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'country'
  | 'church'
  | 'centerLeader'
  | 'centerLeaderEmail'
  | 'selectedWorks'
  | 'checkIn'
  | 'checkOut'
  | 'identityDocument'
  | 'paymentProof'
  | 'consentDocument';

export function validateEventRegistration(
  values: EventRegistrationFormValues,
  docs: { identityDocument: File | null; paymentProof: File | null; consentDocument: File | null },
  existingPaths: { identityDocumentPath?: string; paymentProofPath?: string; consentDocumentPath?: string },
  requireConsent = false
): EventRegistrationValidationError | null {
  if (!values.firstName.trim()) return 'firstName';
  if (!values.lastName.trim()) return 'lastName';
  if (!values.email.trim()) return 'email';
  if (!values.phone.trim()) return 'phone';
  if (!values.country.trim()) return 'country';
  if (!values.church.trim()) return 'church';
  if (!values.centerLeader.trim()) return 'centerLeader';
  if (!values.centerLeaderEmail.trim()) return 'centerLeaderEmail';
  if (values.selectedWorks.length === 0) return 'selectedWorks';

  if (values.attendanceMode !== 'spiritual') {
    if (!values.checkIn) return 'checkIn';
    if (!values.checkOut) return 'checkOut';
    if (calculateEventNightCount(values.checkIn, values.checkOut) <= 0) return 'checkOut';
  }

  if (!docs.identityDocument && !existingPaths.identityDocumentPath) return 'identityDocument';
  if (!docs.paymentProof && !existingPaths.paymentProofPath) return 'paymentProof';
  if ((values.isNovice || requireConsent) && !docs.consentDocument && !existingPaths.consentDocumentPath) {
    return 'consentDocument';
  }

  return null;
}

// ---- Firestore persistence (Phase 4c.2) -------------------------------------

export type EventRegistrationStatus =
  | 'pending'
  | 'approved'
  | 'under-review'
  | 'payment-overdue'
  | 'rejected'
  | 'archived';

type EventDocumentKey = 'identityDocument' | 'paymentProof' | 'consentDocument';
export type EventUploadableDocuments = Partial<Record<EventDocumentKey, File | null>>;

export type EventRegistrationInput = {
  locale: string;
  firstName: string;
  lastName: string;
  country: string;
  church: string;
  centerLeader: string;
  centerLeaderEmail?: string;
  isInitiated: boolean;
  isIcefluMember: boolean;
  isNovice: boolean;
  attendanceMode: EventAttendanceMode;
  checkIn?: string;
  checkOut?: string;
  selectedWorks: string[];
  needsExtraLinen: boolean;
  capacityBucket?: string;
  identityDocumentName?: string;
  identityDocumentPath?: string;
  paymentProofName?: string;
  paymentProofPath?: string;
  consentDocumentName?: string;
  consentDocumentPath?: string;
  phone?: string;
  phoneCountryCode?: string;
  email?: string;
  contribution: EventContributionBreakdown;
  status: 'pending';
};

export type EventRegistrationRecord = Omit<EventRegistrationInput, 'status'> & {
  id: string;
  eventId: string;
  status: EventRegistrationStatus;
  submittedAt?: Date | null;
  userId?: string;
  leaderApproval?: LeaderApprovalDecision;
  interview?: RegistrationInterview;
};

const capacityBlockingStatuses: EventRegistrationStatus[] = ['pending', 'under-review', 'approved'];

export function eventStatusBlocksCapacity(status: EventRegistrationStatus) {
  return capacityBlockingStatuses.includes(status);
}

function registrationsRef(eventId: string) {
  return collection(db, 'events', eventId, 'registrations');
}

function capacityRef(eventId: string) {
  return collection(db, 'events', eventId, 'capacity');
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function bucketFor(event: EventRecord, input: { capacityBucket?: string }): EventCapacityBucket | null {
  const buckets = eventCapacityBuckets(event);
  if (event.capacityMode === 'rooms') {
    return input.capacityBucket ? buckets.find(bucket => bucket.id === input.capacityBucket) ?? null : null;
  }
  return buckets[0] ?? null;
}

async function deleteStoredDocumentIfPresent(path: string) {
  try {
    await deleteObject(ref(storage, path));
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'storage/object-not-found') return;
    throw error;
  }
}

type StoredDocument = { name: string; path: string };

async function uploadEventRegistrationDocuments(args: {
  eventId: string;
  registrationId: string;
  documents: EventUploadableDocuments;
}): Promise<Partial<Record<EventDocumentKey, StoredDocument>>> {
  const uploaded: StoredDocument[] = [];
  try {
    const entries = await Promise.all(
      Object.entries(args.documents).map(async ([key, file]) => {
        if (!file) return null;
        const validationError = validateEuropeanGatheringUploadFile(file);
        if (validationError === 'invalid-type') throw new Error('Only PDF, JPG, and PNG files are allowed.');
        if (validationError === 'file-too-large') throw new Error('Uploaded files must be 10 MB or smaller.');

        const path = `events/${args.eventId}/registrations/${args.registrationId}/${key}-${sanitizeFileName(file.name)}`;
        await uploadBytes(ref(storage, path), file, { contentType: getEuropeanGatheringUploadContentType(file) });
        const stored = { name: file.name, path };
        uploaded.push(stored);
        return [key, stored] as const;
      })
    );
    return Object.fromEntries(entries.filter((entry): entry is readonly [string, StoredDocument] => entry !== null));
  } catch (error) {
    await Promise.all(uploaded.map(file => deleteStoredDocumentIfPresent(file.path).catch(() => undefined)));
    throw error;
  }
}

async function adjustEventCapacity(eventId: string, bucket: EventCapacityBucket, delta: number, transaction: Transaction) {
  const bucketRef = doc(capacityRef(eventId), bucket.id);
  const snapshot = await transaction.get(bucketRef);
  const currentReserved = snapshot.exists() ? asOptionalNumber(snapshot.data().reserved) ?? 0 : 0;
  const nextReserved = currentReserved + delta;
  if (nextReserved < 0 || nextReserved > bucket.capacity) {
    throw new Error('No remaining availability for this event.');
  }
  transaction.set(bucketRef, {
    capacity: bucket.capacity,
    reserved: nextReserved,
    available: bucket.capacity - nextReserved,
    updatedAt: serverTimestamp()
  });
}

function mapEventLeaderApproval(value: unknown): LeaderApprovalDecision | undefined {
  return value === 'approved' || value === 'approved-interview' || value === 'approved-psychologist' || value === 'rejected'
    ? value
    : undefined;
}

function mapEventInterview(value: unknown): RegistrationInterview | undefined {
  const data = asRecord(value);
  const required = asOptionalString(data.required);
  if (required !== 'standard' && required !== 'psychologist') return undefined;
  const status = asOptionalString(data.status);
  return { required, status: status === 'approved' || status === 'rejected' ? status : 'awaiting' };
}

function mapEventRegistration(id: string, eventId: string, value: unknown): EventRegistrationRecord {
  const data = asRecord(value);
  const contribution = asRecord(data.contribution);
  const submittedAt = asOptionalTimestamp(data.submittedAt);
  const status = (asOptionalString(data.status) as EventRegistrationStatus) ?? 'pending';

  return {
    id,
    eventId,
    locale: asOptionalString(data.locale) ?? 'pt',
    firstName: asOptionalString(data.firstName) ?? '',
    lastName: asOptionalString(data.lastName) ?? '',
    country: asOptionalString(data.country) ?? '',
    church: asOptionalString(data.church) ?? '',
    centerLeader: asOptionalString(data.centerLeader) ?? '',
    centerLeaderEmail: asOptionalString(data.centerLeaderEmail),
    isInitiated: asOptionalBoolean(data.isInitiated) ?? false,
    isIcefluMember: asOptionalBoolean(data.isIcefluMember) ?? false,
    isNovice: asOptionalBoolean(data.isNovice) ?? false,
    attendanceMode: (asOptionalString(data.attendanceMode) as EventAttendanceMode) ?? 'lodging',
    checkIn: asOptionalString(data.checkIn),
    checkOut: asOptionalString(data.checkOut),
    selectedWorks: asStringArray(data.selectedWorks) ?? [],
    needsExtraLinen: asOptionalBoolean(data.needsExtraLinen) ?? false,
    capacityBucket: asOptionalString(data.capacityBucket),
    identityDocumentName: asOptionalString(data.identityDocumentName),
    identityDocumentPath: asOptionalString(data.identityDocumentPath),
    paymentProofName: asOptionalString(data.paymentProofName),
    paymentProofPath: asOptionalString(data.paymentProofPath),
    consentDocumentName: asOptionalString(data.consentDocumentName),
    consentDocumentPath: asOptionalString(data.consentDocumentPath),
    phone: asOptionalString(data.phone),
    phoneCountryCode: asOptionalString(data.phoneCountryCode),
    email: asOptionalString(data.email),
    contribution: {
      nights: asOptionalNumber(contribution.nights) ?? 0,
      lodging: asOptionalNumber(contribution.lodging) ?? 0,
      spiritualWorks: asOptionalNumber(contribution.spiritualWorks) ?? 0,
      extras: asOptionalNumber(contribution.extras) ?? 0,
      total: asOptionalNumber(contribution.total) ?? 0
    },
    status,
    submittedAt: submittedAt instanceof Timestamp ? submittedAt.toDate() : null,
    userId: asOptionalString(data.userId),
    leaderApproval: mapEventLeaderApproval(data.leaderApproval),
    interview: mapEventInterview(data.interview)
  };
}

export async function createEventRegistration(args: {
  event: EventRecord;
  input: EventRegistrationInput;
  userId?: string;
  documents?: EventUploadableDocuments;
}) {
  const registrationRef = doc(registrationsRef(args.event.id));
  const registrationId = registrationRef.id;
  const uploaded = await uploadEventRegistrationDocuments({
    eventId: args.event.id,
    registrationId,
    documents: args.documents ?? {}
  });
  const bucket = bucketFor(args.event, args.input);

  const payload = removeUndefinedDeep({
    ...args.input,
    eventId: args.event.id,
    userId: args.userId,
    capacityBucket: bucket?.id,
    identityDocumentName: uploaded.identityDocument?.name ?? args.input.identityDocumentName,
    identityDocumentPath: uploaded.identityDocument?.path ?? args.input.identityDocumentPath,
    paymentProofName: uploaded.paymentProof?.name ?? args.input.paymentProofName,
    paymentProofPath: uploaded.paymentProof?.path ?? args.input.paymentProofPath,
    consentDocumentName: uploaded.consentDocument?.name ?? args.input.consentDocumentName,
    consentDocumentPath: uploaded.consentDocument?.path ?? args.input.consentDocumentPath,
    submittedAt: serverTimestamp()
  });

  try {
    await runTransaction(db, async transaction => {
      if (bucket && eventStatusBlocksCapacity(args.input.status)) {
        await adjustEventCapacity(args.event.id, bucket, 1, transaction);
      }
      transaction.set(registrationRef, payload);
    });

    if (args.userId && uploaded.consentDocument) {
      await createConsentRecord(args.userId, {
        documentName: uploaded.consentDocument.name,
        documentPath: uploaded.consentDocument.path,
        eventId: registrationId
      }).catch(() => undefined);
    }

    return registrationRef;
  } catch (error) {
    await Promise.all(Object.values(uploaded).map(file => deleteStoredDocumentIfPresent(file.path).catch(() => undefined)));
    if (error instanceof FirebaseError) throw new Error(error.message);
    throw error;
  }
}

export async function fetchMyEventRegistration(eventId: string, userId: string) {
  const snapshot = await getDocs(query(registrationsRef(eventId), where('userId', '==', userId), limit(1)));
  if (snapshot.empty) return null;
  return mapEventRegistration(snapshot.docs[0].id, eventId, snapshot.docs[0].data());
}

export async function fetchEventRegistrations(eventId: string) {
  const snapshot = await getDocs(registrationsRef(eventId));
  return snapshot.docs.map(docSnap => mapEventRegistration(docSnap.id, eventId, docSnap.data()));
}

export async function fetchEventCapacity(event: EventRecord) {
  const snapshot = await getDocs(capacityRef(event.id));
  const reservedByBucket: Record<string, number> = {};
  snapshot.docs.forEach(docSnap => {
    reservedByBucket[docSnap.id] = asOptionalNumber(docSnap.data().reserved) ?? 0;
  });
  return buildEventCapacitySnapshot(event, reservedByBucket);
}

export async function updateMyEventRegistration(args: {
  event: EventRecord;
  id: string;
  input: Omit<EventRegistrationInput, 'status'>;
  documents?: EventUploadableDocuments;
  userId?: string;
}) {
  const registrationDocRef = doc(registrationsRef(args.event.id), args.id);
  const uploaded = await uploadEventRegistrationDocuments({
    eventId: args.event.id,
    registrationId: args.id,
    documents: args.documents ?? {}
  });

  const patch = removeUndefinedDeep({
    ...args.input,
    identityDocumentName: uploaded.identityDocument?.name ?? args.input.identityDocumentName,
    identityDocumentPath: uploaded.identityDocument?.path ?? args.input.identityDocumentPath,
    paymentProofName: uploaded.paymentProof?.name ?? args.input.paymentProofName,
    paymentProofPath: uploaded.paymentProof?.path ?? args.input.paymentProofPath,
    consentDocumentName: uploaded.consentDocument?.name ?? args.input.consentDocumentName,
    consentDocumentPath: uploaded.consentDocument?.path ?? args.input.consentDocumentPath
  });

  try {
    await runTransaction(db, async transaction => {
      const snap = await transaction.get(registrationDocRef);
      if (!snap.exists()) throw new Error('Registration not found.');
      transaction.update(registrationDocRef, patch);
    });

    if (args.userId && uploaded.consentDocument) {
      await createConsentRecord(args.userId, {
        documentName: uploaded.consentDocument.name,
        documentPath: uploaded.consentDocument.path,
        eventId: args.id
      }).catch(() => undefined);
    }
  } catch (error) {
    await Promise.all(Object.values(uploaded).map(file => deleteStoredDocumentIfPresent(file.path).catch(() => undefined)));
    if (error instanceof FirebaseError) throw new Error(error.message);
    throw error;
  }
}

export async function updateEventRegistrationStatus(args: { event: EventRecord; id: string; status: EventRegistrationStatus }) {
  const registrationDocRef = doc(registrationsRef(args.event.id), args.id);
  await runTransaction(db, async transaction => {
    const snap = await transaction.get(registrationDocRef);
    if (!snap.exists()) throw new Error('Registration not found.');
    const registration = mapEventRegistration(args.id, args.event.id, snap.data());
    const bucket = registration.capacityBucket
      ? eventCapacityBuckets(args.event).find(item => item.id === registration.capacityBucket) ?? null
      : null;

    if (bucket) {
      const wasBlocking = eventStatusBlocksCapacity(registration.status);
      const willBlock = eventStatusBlocksCapacity(args.status);
      if (wasBlocking && !willBlock) await adjustEventCapacity(args.event.id, bucket, -1, transaction);
      if (!wasBlocking && willBlock) await adjustEventCapacity(args.event.id, bucket, 1, transaction);
    }

    transaction.update(registrationDocRef, { status: args.status });
  });
}

export async function deleteEventRegistration(args: { event: EventRecord; registration: EventRegistrationRecord }) {
  const paths = [
    args.registration.identityDocumentPath,
    args.registration.paymentProofPath,
    args.registration.consentDocumentPath
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  await Promise.all(paths.map(path => deleteStoredDocumentIfPresent(path).catch(() => undefined)));

  await runTransaction(db, async transaction => {
    const bucket = args.registration.capacityBucket
      ? eventCapacityBuckets(args.event).find(item => item.id === args.registration.capacityBucket) ?? null
      : null;
    if (bucket && eventStatusBlocksCapacity(args.registration.status)) {
      await adjustEventCapacity(args.event.id, bucket, -1, transaction);
    }
    transaction.delete(doc(registrationsRef(args.event.id), args.registration.id));
  });
}

export async function resolveEventDocumentUrl(path: string) {
  return getDownloadURL(ref(storage, path));
}
