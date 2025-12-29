import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc
} from 'firebase/firestore';

import { db } from './firebase';

export type Trabalho = {
  id: string;
  titulo?: string;
  data?: Timestamp | null;
  horarioInicio?: Timestamp | null;
  duracaoEsperadaMin?: number;
  duracaoEfetivaMin?: number;
  anotacoes?: string;
  participantes?: {
    homens?: number;
    mulheres?: number;
    outros?: number;
  };
  hinarios?: string[];
  igrejasResponsaveis?: string[];
  local?: string;
  bebida?: {
    loteRef?: string;
    loteId?: string;
    quantidadeLitros?: number;
  };
  createdBy?: string;
};

const trabalhosRef = collection(db, 'trabalhos');

export async function fetchTrabalhos(): Promise<Trabalho[]> {
  const q = query(trabalhosRef, orderBy('data', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      data: (data as any).data ?? null,
      horarioInicio: (data as any).horarioInicio ?? null
    } as Trabalho;
  });
}

export type TrabalhoInput = {
  titulo?: string;
  data?: Timestamp | null;
  horarioInicio?: Timestamp | null;
  duracaoEsperadaMin?: number | null;
  duracaoEfetivaMin?: number | null;
  local?: string;
  hinarios?: string[];
  igrejasResponsaveis?: string[];
  participantes?: {
    homens?: number;
    mulheres?: number;
    outros?: number;
  };
  bebida?: {
    loteId?: string;
    quantidadeLitros?: number | null;
  };
  anotacoes?: string;
  createdBy: string;
};

export async function createTrabalho(input: TrabalhoInput) {
  const payload: Record<string, unknown> = {
    ...input,
    duracaoEsperadaMin: input.duracaoEsperadaMin ?? null,
    duracaoEfetivaMin: input.duracaoEfetivaMin ?? null,
    data: input.data ?? null,
    horarioInicio: input.horarioInicio ?? null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  return addDoc(trabalhosRef, payload);
}

export async function updateTrabalho(id: string, input: Partial<TrabalhoInput>) {
  const ref = doc(trabalhosRef, id);
  const payload: Record<string, unknown> = {
    ...input,
    updatedAt: Timestamp.now()
  };

  return updateDoc(ref, payload);
}
