import { FirebaseError } from 'firebase/app';
import { Timestamp, collection, doc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
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

export type EncontroEuropeuRegistrationStatus = 'pending' | 'approved' | 'under-review' | 'payment-overdue';

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

function normalizeStatus(value: unknown): EncontroEuropeuRegistrationStatus {
  switch (value) {
    case 'approved':
      return 'approved';
    case 'under-review':
      return 'under-review';
    case 'payment-overdue':
      return 'payment-overdue';
    case 'pending-payment':
    case 'pending':
    default:
      return 'pending';
  }
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
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
    await setDoc(registrationRef, payload);
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

export async function resolveEncontroEuropeuDocumentUrl(path: string) {
  return getDownloadURL(ref(storage, path));
}

export async function updateEncontroEuropeuRegistrationStatus(args: { id: string; status: EncontroEuropeuRegistrationStatus }) {
  await updateDoc(doc(registrationsRef, args.id), { status: args.status });
}