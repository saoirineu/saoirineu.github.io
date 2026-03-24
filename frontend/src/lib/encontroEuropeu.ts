import { FirebaseError } from 'firebase/app';
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

export type EncontroEuropeuRegistrationDebugInfo = {
  code: string;
  message: string;
  payloadPreview: Record<string, unknown>;
};

export class EncontroEuropeuRegistrationError extends Error {
  debugInfo: EncontroEuropeuRegistrationDebugInfo;

  constructor(debugInfo: EncontroEuropeuRegistrationDebugInfo) {
    super(debugInfo.message);
    this.name = 'EncontroEuropeuRegistrationError';
    this.debugInfo = debugInfo;
  }
}

const registrationsRef = collection(db, 'encontroEuropeuInscricoes');

export async function createEncontroEuropeuRegistration(input: EncontroEuropeuRegistrationInput) {
  const payloadPreview = removeUndefinedDeep({
    ...input,
    submittedAt: 'serverTimestamp()'
  });

  const payload = removeUndefinedDeep({
    ...input,
    submittedAt: serverTimestamp()
  });

  console.info('[EncontroEuropeu] submitting registration', payloadPreview);

  try {
    return await addDoc(registrationsRef, payload);
  } catch (error) {
    const firebaseError = error instanceof FirebaseError ? error : null;
    const debugInfo: EncontroEuropeuRegistrationDebugInfo = {
      code: firebaseError?.code ?? 'unknown',
      message: firebaseError?.message ?? (error instanceof Error ? error.message : 'Unknown registration error'),
      payloadPreview
    };

    console.error('[EncontroEuropeu] registration failed', debugInfo, error);
    throw new EncontroEuropeuRegistrationError(debugInfo);
  }
}