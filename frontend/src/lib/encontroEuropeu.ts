import { FirebaseError } from 'firebase/app';
import { Timestamp, addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';

import { db } from './firebase';
import {
  asOptionalBoolean,
  asOptionalNumber,
  asOptionalString,
  asOptionalTimestamp,
  asRecord,
  asStringArray,
  removeUndefinedDeep
} from './firestoreData';

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
  paymentProofName?: string;
  consentDocumentName?: string;
  contribution: {
    nights: number;
    lodging: number;
    spiritualWorks: number;
    extras: number;
    total: number;
  };
  status: 'pending-payment';
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
  paymentProofName?: string;
  consentDocumentName?: string;
  contribution: {
    nights: number;
    lodging: number;
    spiritualWorks: number;
    extras: number;
    total: number;
  };
  status: 'pending-payment';
  submittedAt?: Date | null;
};

const registrationsRef = collection(db, 'encontroEuropeuInscricoes');

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
    paymentProofName: asOptionalString(data.paymentProofName),
    consentDocumentName: asOptionalString(data.consentDocumentName),
    contribution: {
      nights: asOptionalNumber(contribution.nights) ?? 0,
      lodging: asOptionalNumber(contribution.lodging) ?? 0,
      spiritualWorks: asOptionalNumber(contribution.spiritualWorks) ?? 0,
      extras: asOptionalNumber(contribution.extras) ?? 0,
      total: asOptionalNumber(contribution.total) ?? 0
    },
    status: 'pending-payment',
    submittedAt: submittedAt instanceof Timestamp ? submittedAt.toDate() : null
  };
}

export async function createEncontroEuropeuRegistration(input: EncontroEuropeuRegistrationInput) {
  const payload = removeUndefinedDeep({
    ...input,
    submittedAt: serverTimestamp()
  });

  try {
    return await addDoc(registrationsRef, payload);
  } catch (error) {
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