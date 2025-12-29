import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';

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
