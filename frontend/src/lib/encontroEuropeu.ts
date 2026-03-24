import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { db } from './firebase';
import { removeUndefinedDeep } from './firestoreData';

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

const registrationsRef = collection(db, 'encontroEuropeuInscricoes');

export async function createEncontroEuropeuRegistration(input: EncontroEuropeuRegistrationInput) {
  const payload = removeUndefinedDeep({
    ...input,
    submittedAt: serverTimestamp()
  });

  return addDoc(registrationsRef, payload);
}