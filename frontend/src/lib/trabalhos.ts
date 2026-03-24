import {
  addDoc,
  collection,
  doc,
  deleteDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc
} from 'firebase/firestore';

import { db } from './firebase';
import {
  asOptionalNumber,
  asOptionalString,
  asOptionalTimestamp,
  asRecord,
  asStringArray,
  removeUndefinedDeep
} from './firestoreData';

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
const igrejasRef = collection(db, 'igrejas');

function mapParticipantes(value: unknown): Trabalho['participantes'] {
  const data = asRecord(value);
  return {
    total: asOptionalNumber(data.total),
    fardados: asOptionalNumber(data.fardados),
    homens: asOptionalNumber(data.homens),
    mulheres: asOptionalNumber(data.mulheres),
    criancas: asOptionalNumber(data.criancas),
    outros: asOptionalNumber(data.outros),
    outrosDescricao: asOptionalString(data.outrosDescricao)
  };
}

function mapBebida(value: unknown): Trabalho['bebida'] {
  const data = asRecord(value);
  return {
    loteRef: asOptionalString(data.loteRef),
    loteId: asOptionalString(data.loteId),
    loteDescricao: asOptionalString(data.loteDescricao),
    loteTexto: asOptionalString(data.loteTexto),
    quantidadeLitros: asOptionalNumber(data.quantidadeLitros)
  };
}

function mapTrabalho(id: string, value: unknown): Trabalho {
  const data = asRecord(value);
  return {
    id,
    titulo: asOptionalString(data.titulo),
    data: asOptionalTimestamp(data.data),
    horarioInicio: asOptionalTimestamp(data.horarioInicio),
    duracaoEsperadaMin: asOptionalNumber(data.duracaoEsperadaMin),
    duracaoEfetivaMin: asOptionalNumber(data.duracaoEfetivaMin),
    anotacoes: asOptionalString(data.anotacoes),
    participantes: mapParticipantes(data.participantes),
    hinarios: asStringArray(data.hinarios),
    igrejasResponsaveisIds: asStringArray(data.igrejasResponsaveisIds),
    igrejasResponsaveisNomes: asStringArray(data.igrejasResponsaveisNomes),
    igrejasResponsaveisTexto: asOptionalString(data.igrejasResponsaveisTexto),
    localId: asOptionalString(data.localId),
    localNome: asOptionalString(data.localNome),
    localTexto: asOptionalString(data.localTexto),
    bebida: mapBebida(data.bebida),
    createdBy: asOptionalString(data.createdBy)
  };
}

export async function fetchTrabalhos(): Promise<Trabalho[]> {
  const q = query(trabalhosRef, orderBy('data', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnapshot => mapTrabalho(docSnapshot.id, docSnapshot.data()));
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
  cidade?: string;
  estado?: string;
  pais?: string;
  linhagem?: string;
  observacoes?: string;
  lat?: number;
  lng?: number;
};

export type BebidaInfo = {
  id: string;
  descricao: string;
};

export async function fetchIgrejas(): Promise<IgrejaInfo[]> {
  try {
    const q = query(igrejasRef);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
      const data = asRecord(docSnapshot.data());
      return {
        id: docSnapshot.id,
        nome: typeof data.nome === 'string' && data.nome ? data.nome : docSnapshot.id,
        cidade: typeof data.cidade === 'string' ? data.cidade : undefined,
        estado: typeof data.estado === 'string' ? data.estado : undefined,
        pais: typeof data.pais === 'string' ? data.pais : undefined,
        linhagem: typeof data.linhagem === 'string' ? data.linhagem : undefined,
        observacoes: typeof data.observacoes === 'string' ? data.observacoes : undefined,
        lat: typeof data.lat === 'number' ? data.lat : undefined,
        lng: typeof data.lng === 'number' ? data.lng : undefined
      };
    });
  } catch {
    return [];
  }
}

export type IgrejaInput = {
  nome: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  linhagem?: string;
  observacoes?: string;
  lat?: number;
  lng?: number;
};

export async function createIgreja(input: IgrejaInput) {
  const payload = removeUndefinedDeep({
    nome: input.nome,
    cidade: input.cidade || undefined,
    estado: input.estado || undefined,
    pais: input.pais || undefined,
    linhagem: input.linhagem || undefined,
    observacoes: input.observacoes || undefined,
    lat: typeof input.lat === 'number' ? input.lat : undefined,
    lng: typeof input.lng === 'number' ? input.lng : undefined,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });

  return addDoc(igrejasRef, payload as Record<string, unknown>);
}

export async function updateIgreja(id: string, input: Partial<IgrejaInput>) {
  const ref = doc(igrejasRef, id);
  const payload = removeUndefinedDeep({
    ...input,
    lat: typeof input.lat === 'number' ? input.lat : undefined,
    lng: typeof input.lng === 'number' ? input.lng : undefined,
    updatedAt: Timestamp.now()
  });

  return updateDoc(ref, payload as Record<string, unknown>);
}

export async function deleteIgreja(id: string) {
  const ref = doc(igrejasRef, id);
  return deleteDoc(ref);
}

export async function fetchBebidaLotes(): Promise<BebidaInfo[]> {
  try {
    const q = query(collection(db, 'bebidaLotes'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
      const data = asRecord(docSnapshot.data());
      const descricao = typeof data.descricao === 'string' ? data.descricao : undefined;
      const desc = descricao
        ? descricao
        : `${data.grau ?? '?'}º grau, ${data.concentracao ?? ''} ${data.ano ?? ''} ${data.localidade ?? ''}`.trim();
      return { id: docSnapshot.id, descricao: desc };
    });
  } catch {
    return [];
  }
}

export async function createTrabalho(input: TrabalhoInput) {
  const payload = removeUndefinedDeep({
    ...input,
    duracaoEsperadaMin: input.duracaoEsperadaMin ?? null,
    duracaoEfetivaMin: input.duracaoEfetivaMin ?? null,
    data: input.data ?? null,
    horarioInicio: input.horarioInicio ?? null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });

  return addDoc(trabalhosRef, payload as Record<string, unknown>);
}

export async function updateTrabalho(id: string, input: Partial<TrabalhoInput>) {
  const ref = doc(trabalhosRef, id);
  const payload = removeUndefinedDeep({
    ...input,
    updatedAt: Timestamp.now()
  });

  return updateDoc(ref, payload as Record<string, unknown>);
}

export async function deleteTrabalho(id: string) {
  const ref = doc(trabalhosRef, id);
  return deleteDoc(ref);
}
