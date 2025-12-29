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
    total?: number;
    fardados?: number;
    homens?: number;
    mulheres?: number;
    criancas?: number;
    outros?: number;
    outrosDescricao?: string;
  };
  hinarios?: string[];
  igrejasResponsaveisIds?: string[];
  igrejasResponsaveisNomes?: string[];
  igrejasResponsaveisTexto?: string;
  localId?: string;
  localNome?: string;
  localTexto?: string;
  bebida?: {
    loteRef?: string;
    loteId?: string;
    loteDescricao?: string;
    loteTexto?: string;
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
  localId?: string;
  localNome?: string;
  localTexto?: string;
  hinarios?: string[];
  igrejasResponsaveisIds?: string[];
  igrejasResponsaveisNomes?: string[];
  igrejasResponsaveisTexto?: string;
  participantes?: {
    total?: number;
    fardados?: number;
    homens?: number;
    mulheres?: number;
    criancas?: number;
    outros?: number;
    outrosDescricao?: string;
  };
  bebida?: {
    loteId?: string;
    loteDescricao?: string;
    loteTexto?: string;
    quantidadeLitros?: number | null;
  };
  anotacoes?: string;
  createdBy: string;
};

export type IgrejaInfo = {
  id: string;
  nome: string;
};

export type BebidaInfo = {
  id: string;
  descricao: string;
};

export async function fetchIgrejas(): Promise<IgrejaInfo[]> {
  try {
    const q = query(collection(db, 'igrejas'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      nome: (doc.data() as any).nome || doc.id
    }));
  } catch {
    return [];
  }
}

export async function fetchBebidaLotes(): Promise<BebidaInfo[]> {
  try {
    const q = query(collection(db, 'bebidaLotes'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const d = doc.data() as any;
      const desc = d.descricao
        ? d.descricao
        : `${d.grau ?? '?'}º grau, ${d.concentracao ?? ''} ${d.ano ?? ''} ${d.localidade ?? ''}`.trim();
      return { id: doc.id, descricao: desc };
    });
  } catch {
    return [];
  }
}

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
