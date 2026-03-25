import { FirebaseError } from 'firebase/app';
import { Timestamp, Transaction, collection, doc, getDocs, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

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

export type EncontroEuropeuRegistrationStatus = 'pending' | 'approved' | 'under-review' | 'payment-overdue' | 'rejected' | 'archived';

export type EncontroEuropeuRoomOption = {
  name: string;
  capacity: number;
};

export type EncontroEuropeuRoomAvailability = EncontroEuropeuRoomOption & {
  reserved: number;
  available: number;
};

type EncontroEuropeuDocumentKey = 'identityDocument' | 'paymentProof' | 'consentDocument';

export type EncontroEuropeuUploadableDocuments = Partial<Record<EncontroEuropeuDocumentKey, File | null>>;

export type EncontroEuropeuStoredDocument = {
  name: string;
  path: string;
};

export type EncontroEuropeuRegistrationInput = {
  locale: 'pt' | 'en' | 'es' | 'it';
  firstName: string;
  lastName: string;
  country: string;
  church: string;
  centerLeader: string;
  isFardado: boolean;
  isIcefluMember: boolean;
  isNovice: boolean;
  attendanceMode: 'lodging' | 'meals' | 'spiritual';
  checkIn?: string;
  checkOut?: string;
  selectedWorks: string[];
  needsExtraLinen: boolean;
  roomNumber?: string;
  identityDocumentName?: string;
  identityDocumentPath?: string;
  paymentProofName?: string;
  paymentProofPath?: string;
  consentDocumentName?: string;
  consentDocumentPath?: string;
  contribution: {
    nights: number;
    lodging: number;
    spiritualWorks: number;
    extras: number;
    total: number;
  };
  status: 'pending';
};

export type EncontroEuropeuRegistrationRecord = {
  id: string;
  locale: 'pt' | 'en' | 'es' | 'it';
  firstName: string;
  lastName: string;
  country: string;
  church: string;
  centerLeader: string;
  isFardado: boolean;
  isIcefluMember: boolean;
  isNovice: boolean;
  attendanceMode: 'lodging' | 'meals' | 'spiritual';
  checkIn?: string;
  checkOut?: string;
  selectedWorks: string[];
  needsExtraLinen: boolean;
  roomNumber?: string;
  identityDocumentName?: string;
  identityDocumentPath?: string;
  paymentProofName?: string;
  paymentProofPath?: string;
  consentDocumentName?: string;
  consentDocumentPath?: string;
  contribution: {
    nights: number;
    lodging: number;
    spiritualWorks: number;
    extras: number;
    total: number;
  };
  status: EncontroEuropeuRegistrationStatus;
  submittedAt?: Date | null;
};

const registrationsRef = collection(db, 'encontroEuropeuInscricoes');
const roomAvailabilityRef = collection(db, 'encontroEuropeuQuartos');

export const encontroEuropeuRoomOptions: EncontroEuropeuRoomOption[] = [
  { name: 'Cedro', capacity: 6 },
  { name: 'Luce', capacity: 8 },
  { name: 'Aurora', capacity: 10 },
  { name: 'Bosco', capacity: 12 },
  { name: 'Fonte', capacity: 14 },
  { name: 'Monte', capacity: 16 },
  { name: 'Stella', capacity: 18 }
];

const roomCapacityMap = new Map(encontroEuropeuRoomOptions.map(room => [room.name, room.capacity]));

const roomBlockingStatuses: EncontroEuropeuRegistrationStatus[] = ['pending', 'under-review', 'approved'];

function normalizeStatus(value: unknown): EncontroEuropeuRegistrationStatus {
  switch (value) {
    case 'approved':
      return 'approved';
    case 'under-review':
      return 'under-review';
    case 'payment-overdue':
      return 'payment-overdue';
    case 'rejected':
      return 'rejected';
    case 'archived':
      return 'archived';
    case 'pending-payment':
    case 'pending':
    default:
      return 'pending';
  }
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getRoomCapacity(roomName: string) {
  return roomCapacityMap.get(roomName) ?? null;
}

export function statusBlocksRoomCapacity(status: EncontroEuropeuRegistrationStatus) {
  return roomBlockingStatuses.includes(status);
}

export function buildEncontroEuropeuRoomAvailabilitySnapshot(
  records: Array<{ id: string; capacity?: unknown; reserved?: unknown; available?: unknown }>
) {
  const byId = new Map(records.map(record => [record.id, record]));

  return encontroEuropeuRoomOptions.map(room => {
    const record = byId.get(room.name);
    const reserved = Math.max(0, Math.min(room.capacity, asOptionalNumber(record?.reserved) ?? 0));
    const available = Math.max(0, Math.min(room.capacity, asOptionalNumber(record?.available) ?? room.capacity - reserved));

    return {
      ...room,
      reserved,
      available: room.capacity - reserved === available ? available : room.capacity - reserved
    };
  });
}

async function adjustRoomAvailability(roomName: string, delta: number, transaction: Transaction) {
  const capacity = getRoomCapacity(roomName);
  if (capacity == null) {
    throw new Error('Selected room is invalid.');
  }

  const roomRef = doc(roomAvailabilityRef, roomName);
  const roomSnapshot = await transaction.get(roomRef);
  const currentReserved = roomSnapshot.exists() ? asOptionalNumber(roomSnapshot.data().reserved) ?? 0 : 0;
  const nextReserved = currentReserved + delta;

  if (nextReserved < 0 || nextReserved > capacity) {
    throw new Error('Selected room has no remaining availability.');
  }

  transaction.set(roomRef, {
    capacity,
    reserved: nextReserved,
    available: capacity - nextReserved,
    updatedAt: serverTimestamp()
  });
}

function buildDocumentPath(registrationId: string, key: EncontroEuropeuDocumentKey, fileName: string) {
  return `encontroEuropeuInscricoes/${registrationId}/${key}-${sanitizeFileName(fileName)}`;
}

export async function uploadEncontroEuropeuDocuments(args: { documents: EncontroEuropeuUploadableDocuments; registrationId: string }) {
  const uploadedFiles: EncontroEuropeuStoredDocument[] = [];

  try {
    const entries = await Promise.all(
      Object.entries(args.documents).map(async ([key, file]) => {
        if (!file) {
          return null;
        }

        const storagePath = buildDocumentPath(args.registrationId, key as EncontroEuropeuDocumentKey, file.name);
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, file, { contentType: file.type || undefined });
        const storedDocument = { name: file.name, path: storagePath };
        uploadedFiles.push(storedDocument);
        return [key, storedDocument] as const;
      })
    );

    return Object.fromEntries(entries.filter((entry): entry is readonly [string, EncontroEuropeuStoredDocument] => entry !== null));
  } catch (error) {
    await Promise.all(uploadedFiles.map(file => deleteObject(ref(storage, file.path)).catch(() => undefined)));
    throw error;
  }
}

function mapRegistration(id: string, value: unknown): EncontroEuropeuRegistrationRecord {
  const data = asRecord(value);
  const contribution = asRecord(data.contribution);
  const submittedAt = asOptionalTimestamp(data.submittedAt);

  return {
    id,
    locale: (asOptionalString(data.locale) as EncontroEuropeuRegistrationRecord['locale']) ?? 'pt',
    firstName: asOptionalString(data.firstName) ?? '',
    lastName: asOptionalString(data.lastName) ?? '',
    country: asOptionalString(data.country) ?? '',
    church: asOptionalString(data.church) ?? '',
    centerLeader: asOptionalString(data.centerLeader) ?? '',
    isFardado: asOptionalBoolean(data.isFardado) ?? false,
    isIcefluMember: asOptionalBoolean(data.isIcefluMember) ?? false,
    isNovice: asOptionalBoolean(data.isNovice) ?? false,
    attendanceMode: (asOptionalString(data.attendanceMode) as EncontroEuropeuRegistrationRecord['attendanceMode']) ?? 'lodging',
    checkIn: asOptionalString(data.checkIn),
    checkOut: asOptionalString(data.checkOut),
    selectedWorks: asStringArray(data.selectedWorks) ?? [],
    needsExtraLinen: asOptionalBoolean(data.needsExtraLinen) ?? false,
    roomNumber: asOptionalString(data.roomNumber),
    identityDocumentName: asOptionalString(data.identityDocumentName),
    identityDocumentPath: asOptionalString(data.identityDocumentPath),
    paymentProofName: asOptionalString(data.paymentProofName),
    paymentProofPath: asOptionalString(data.paymentProofPath),
    consentDocumentName: asOptionalString(data.consentDocumentName),
    consentDocumentPath: asOptionalString(data.consentDocumentPath),
    contribution: {
      nights: asOptionalNumber(contribution.nights) ?? 0,
      lodging: asOptionalNumber(contribution.lodging) ?? 0,
      spiritualWorks: asOptionalNumber(contribution.spiritualWorks) ?? 0,
      extras: asOptionalNumber(contribution.extras) ?? 0,
      total: asOptionalNumber(contribution.total) ?? 0
    },
    status: normalizeStatus(data.status),
    submittedAt: submittedAt instanceof Timestamp ? submittedAt.toDate() : null
  };
}

export async function createEncontroEuropeuRegistration(args: {
  documents?: EncontroEuropeuUploadableDocuments;
  input: EncontroEuropeuRegistrationInput;
}) {
  const registrationRef = doc(registrationsRef);
  const registrationId = registrationRef.id;
  const desiredRoom = args.input.attendanceMode === 'lodging' ? args.input.roomNumber?.trim() || undefined : undefined;
  const uploadedDocuments = await uploadEncontroEuropeuDocuments({
    registrationId,
    documents: args.documents ?? {}
  });

  const payload = removeUndefinedDeep({
    ...args.input,
    identityDocumentName: uploadedDocuments.identityDocument?.name ?? args.input.identityDocumentName,
    identityDocumentPath: uploadedDocuments.identityDocument?.path ?? args.input.identityDocumentPath,
    paymentProofName: uploadedDocuments.paymentProof?.name ?? args.input.paymentProofName,
    paymentProofPath: uploadedDocuments.paymentProof?.path ?? args.input.paymentProofPath,
    consentDocumentName: uploadedDocuments.consentDocument?.name ?? args.input.consentDocumentName,
    consentDocumentPath: uploadedDocuments.consentDocument?.path ?? args.input.consentDocumentPath,
    submittedAt: serverTimestamp()
  });

  try {
    await runTransaction(db, async transaction => {
      if (desiredRoom && statusBlocksRoomCapacity(payload.status)) {
        await adjustRoomAvailability(desiredRoom, 1, transaction);
      }

      transaction.set(registrationRef, payload);
    });

    return registrationRef;
  } catch (error) {
    await Promise.all(
      Object.values(uploadedDocuments).map(document => deleteObject(ref(storage, document.path)).catch(() => undefined))
    );

    if (error instanceof FirebaseError) {
      throw new Error(error.message);
    }

    throw error;
  }
}

export async function fetchEncontroEuropeuRegistrations() {
  const snapshot = await getDocs(registrationsRef);
  return snapshot.docs.map(docSnap => mapRegistration(docSnap.id, docSnap.data()));
}

export async function fetchEncontroEuropeuRoomAvailability() {
  const snapshot = await getDocs(roomAvailabilityRef);
  return buildEncontroEuropeuRoomAvailabilitySnapshot(
    snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
  );
}

export async function rebuildEncontroEuropeuRoomAvailabilityFromRegistrations(
  registrations: Array<Pick<EncontroEuropeuRegistrationRecord, 'roomNumber' | 'status'>>
) {
  const batch = writeBatch(db);
  const reservedByRoom = new Map<string, number>();

  registrations.forEach(registration => {
    if (!registration.roomNumber || !statusBlocksRoomCapacity(registration.status)) {
      return;
    }

    reservedByRoom.set(registration.roomNumber, (reservedByRoom.get(registration.roomNumber) ?? 0) + 1);
  });

  encontroEuropeuRoomOptions.forEach(room => {
    const reserved = Math.min(room.capacity, reservedByRoom.get(room.name) ?? 0);

    batch.set(doc(roomAvailabilityRef, room.name), {
      capacity: room.capacity,
      reserved,
      available: room.capacity - reserved,
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
}

export async function resolveEncontroEuropeuDocumentUrl(path: string) {
  return getDownloadURL(ref(storage, path));
}

export async function updateEncontroEuropeuRegistrationStatus(args: { id: string; status: EncontroEuropeuRegistrationStatus }) {
  const registrationRef = doc(registrationsRef, args.id);

  await runTransaction(db, async transaction => {
    const registrationSnapshot = await transaction.get(registrationRef);
    if (!registrationSnapshot.exists()) {
      throw new Error('Registration not found.');
    }

    const registration = mapRegistration(args.id, registrationSnapshot.data());

    if (registration.roomNumber) {
      const currentlyBlocking = statusBlocksRoomCapacity(registration.status);
      const nextBlocking = statusBlocksRoomCapacity(args.status);

      if (currentlyBlocking && !nextBlocking) {
        await adjustRoomAvailability(registration.roomNumber, -1, transaction);
      }

      if (!currentlyBlocking && nextBlocking) {
        await adjustRoomAvailability(registration.roomNumber, 1, transaction);
      }
    }

    transaction.update(registrationRef, { status: args.status });
  });
}

export async function deleteEncontroEuropeuRegistration(registration: Pick<
  EncontroEuropeuRegistrationRecord,
  'id' | 'identityDocumentPath' | 'paymentProofPath' | 'consentDocumentPath' | 'roomNumber' | 'status'
>) {
  const documentPaths = [registration.identityDocumentPath, registration.paymentProofPath, registration.consentDocumentPath].filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  );

  await Promise.all(documentPaths.map(path => deleteObject(ref(storage, path)).catch(() => undefined)));

  await runTransaction(db, async transaction => {
    if (registration.roomNumber && statusBlocksRoomCapacity(registration.status)) {
      await adjustRoomAvailability(registration.roomNumber, -1, transaction);
    }

    transaction.delete(doc(registrationsRef, registration.id));
  });
}