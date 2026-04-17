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
  title?: string;
  data?: Timestamp | null;
  horarioInicio?: Timestamp | null;
  duracaoEsperadaMin?: number;
  duracaoEfetivaMin?: number;
  notes?: string;
  attendees?: {
    total?: number;
    fardados?: number;
    homens?: number;
    mulheres?: number;
    children?: number;
    others?: number;
    othersDescription?: string;
  };
  hymnals?: string[];
  responsibleChurchIds?: string[];
  responsibleChurchNames?: string[];
  responsibleChurchText?: string;
  venueId?: string;
  venueName?: string;
  venueText?: string;
  beverage?: {
    batchRef?: string;
    batchId?: string;
    batchDescription?: string;
    batchText?: string;
    liters?: number;
  };
  createdBy?: string;
};

const trabalhosRef = collection(db, 'trabalhos');
const churchesRef = collection(db, 'igrejas');

function mapAttendees(value: unknown): Trabalho['attendees'] {
  const data = asRecord(value);
  return {
    total: asOptionalNumber(data.total),
    fardados: asOptionalNumber(data.fardados),
    homens: asOptionalNumber(data.homens),
    mulheres: asOptionalNumber(data.mulheres),
    children: asOptionalNumber(data.criancas),
    others: asOptionalNumber(data.outros),
    othersDescription: asOptionalString(data.outrosDescricao)
  };
}

function mapBeverage(value: unknown): Trabalho['beverage'] {
  const data = asRecord(value);
  return {
    batchRef: asOptionalString(data.loteRef),
    batchId: asOptionalString(data.loteId),
    batchDescription: asOptionalString(data.loteDescricao),
    batchText: asOptionalString(data.loteTexto),
    liters: asOptionalNumber(data.quantidadeLitros)
  };
}

function mapTrabalho(id: string, value: unknown): Trabalho {
  const data = asRecord(value);
  return {
    id,
    title: asOptionalString(data.titulo),
    data: asOptionalTimestamp(data.data),
    horarioInicio: asOptionalTimestamp(data.horarioInicio),
    duracaoEsperadaMin: asOptionalNumber(data.duracaoEsperadaMin),
    duracaoEfetivaMin: asOptionalNumber(data.duracaoEfetivaMin),
    notes: asOptionalString(data.anotacoes),
    attendees: mapAttendees(data.participantes),
    hymnals: asStringArray(data.hinarios),
    responsibleChurchIds: asStringArray(data.igrejasResponsaveisIds),
    responsibleChurchNames: asStringArray(data.igrejasResponsaveisNomes),
    responsibleChurchText: asOptionalString(data.igrejasResponsaveisTexto),
    venueId: asOptionalString(data.localId),
    venueName: asOptionalString(data.localNome),
    venueText: asOptionalString(data.localTexto),
    beverage: mapBeverage(data.bebida),
    createdBy: asOptionalString(data.createdBy)
  };
}

export async function fetchTrabalhos(): Promise<Trabalho[]> {
  const q = query(trabalhosRef, orderBy('data', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnapshot => mapTrabalho(docSnapshot.id, docSnapshot.data()));
}

export type TrabalhoInput = {
  title?: string;
  data?: Timestamp | null;
  horarioInicio?: Timestamp | null;
  duracaoEsperadaMin?: number | null;
  duracaoEfetivaMin?: number | null;
  venueId?: string;
  venueName?: string;
  venueText?: string;
  hymnals?: string[];
  responsibleChurchIds?: string[];
  responsibleChurchNames?: string[];
  responsibleChurchText?: string;
  attendees?: {
    total?: number;
    fardados?: number;
    homens?: number;
    mulheres?: number;
    children?: number;
    others?: number;
    othersDescription?: string;
  };
  beverage?: {
    batchId?: string;
    batchDescription?: string;
    batchText?: string;
    liters?: number | null;
  };
  notes?: string;
  createdBy: string;
};

export type ChurchInfo = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  lineage?: string;
  observations?: string;
  lat?: number;
  lng?: number;
};

export type BeverageInfo = {
  id: string;
  description: string;
};

export async function fetchChurches(): Promise<ChurchInfo[]> {
  try {
    const q = query(churchesRef);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
      const data = asRecord(docSnapshot.data());
      return {
        id: docSnapshot.id,
        name: typeof data.nome === 'string' && data.nome ? data.nome : docSnapshot.id,
        city: typeof data.cidade === 'string' ? data.cidade : undefined,
        state: typeof data.estado === 'string' ? data.estado : undefined,
        country: typeof data.pais === 'string' ? data.pais : undefined,
        lineage: typeof data.linhagem === 'string' ? data.linhagem : undefined,
        observations: typeof data.observacoes === 'string' ? data.observacoes : undefined,
        lat: typeof data.lat === 'number' ? data.lat : undefined,
        lng: typeof data.lng === 'number' ? data.lng : undefined
      };
    });
  } catch {
    return [];
  }
}

export type ChurchInput = {
  name: string;
  city?: string;
  state?: string;
  country?: string;
  lineage?: string;
  observations?: string;
  lat?: number;
  lng?: number;
};

export async function createChurch(input: ChurchInput) {
  const payload = removeUndefinedDeep({
    nome: input.name,
    cidade: input.city || undefined,
    estado: input.state || undefined,
    pais: input.country || undefined,
    linhagem: input.lineage || undefined,
    observacoes: input.observations || undefined,
    lat: typeof input.lat === 'number' ? input.lat : undefined,
    lng: typeof input.lng === 'number' ? input.lng : undefined,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });

  return addDoc(churchesRef, payload as Record<string, unknown>);
}

export async function updateChurch(id: string, input: Partial<ChurchInput>) {
  const ref = doc(churchesRef, id);
  const payload = removeUndefinedDeep({
    nome: input.name,
    cidade: input.city,
    estado: input.state,
    pais: input.country,
    linhagem: input.lineage,
    observacoes: input.observations,
    lat: typeof input.lat === 'number' ? input.lat : undefined,
    lng: typeof input.lng === 'number' ? input.lng : undefined,
    updatedAt: Timestamp.now()
  });

  return updateDoc(ref, payload as Record<string, unknown>);
}

export async function deleteChurch(id: string) {
  const ref = doc(churchesRef, id);
  return deleteDoc(ref);
}

export async function fetchBeverageBatches(): Promise<BeverageInfo[]> {
  try {
    const q = query(collection(db, 'bebidaLotes'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
      const data = asRecord(docSnapshot.data());
      const descricao = typeof data.descricao === 'string' ? data.descricao : undefined;
      const desc = descricao
        ? descricao
        : `${data.grau ?? '?'}º grau, ${data.concentracao ?? ''} ${data.ano ?? ''} ${data.localidade ?? ''}`.trim();
      return { id: docSnapshot.id, description: desc };
    });
  } catch {
    return [];
  }
}

export async function createTrabalho(input: TrabalhoInput) {
  // Map English field names back to Firestore's Portuguese field names (pending migration)
  const firestorePayload = removeUndefinedDeep({
    titulo: input.title,
    data: input.data ?? null,
    horarioInicio: input.horarioInicio ?? null,
    duracaoEsperadaMin: input.duracaoEsperadaMin ?? null,
    duracaoEfetivaMin: input.duracaoEfetivaMin ?? null,
    localId: input.venueId,
    localNome: input.venueName,
    localTexto: input.venueText,
    hinarios: input.hymnals,
    igrejasResponsaveisIds: input.responsibleChurchIds,
    igrejasResponsaveisNomes: input.responsibleChurchNames,
    igrejasResponsaveisTexto: input.responsibleChurchText,
    participantes: input.attendees ? {
      total: input.attendees.total,
      fardados: input.attendees.fardados,
      homens: input.attendees.homens,
      mulheres: input.attendees.mulheres,
      criancas: input.attendees.children,
      outros: input.attendees.others,
      outrosDescricao: input.attendees.othersDescription
    } : undefined,
    bebida: input.beverage ? {
      loteId: input.beverage.batchId,
      loteDescricao: input.beverage.batchDescription,
      loteTexto: input.beverage.batchText,
      quantidadeLitros: input.beverage.liters ?? null
    } : undefined,
    anotacoes: input.notes,
    createdBy: input.createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });

  return addDoc(trabalhosRef, firestorePayload as Record<string, unknown>);
}

export async function updateTrabalho(id: string, input: Partial<TrabalhoInput>) {
  const ref = doc(trabalhosRef, id);
  const firestorePayload = removeUndefinedDeep({
    titulo: input.title,
    data: input.data,
    horarioInicio: input.horarioInicio,
    duracaoEsperadaMin: input.duracaoEsperadaMin,
    duracaoEfetivaMin: input.duracaoEfetivaMin,
    localId: input.venueId,
    localNome: input.venueName,
    localTexto: input.venueText,
    hinarios: input.hymnals,
    igrejasResponsaveisIds: input.responsibleChurchIds,
    igrejasResponsaveisNomes: input.responsibleChurchNames,
    igrejasResponsaveisTexto: input.responsibleChurchText,
    participantes: input.attendees ? {
      total: input.attendees.total,
      fardados: input.attendees.fardados,
      homens: input.attendees.homens,
      mulheres: input.attendees.mulheres,
      criancas: input.attendees.children,
      outros: input.attendees.others,
      outrosDescricao: input.attendees.othersDescription
    } : undefined,
    bebida: input.beverage ? {
      loteId: input.beverage.batchId,
      loteDescricao: input.beverage.batchDescription,
      loteTexto: input.beverage.batchText,
      quantidadeLitros: input.beverage.liters
    } : undefined,
    anotacoes: input.notes,
    updatedAt: Timestamp.now()
  });

  return updateDoc(ref, firestorePayload as Record<string, unknown>);
}

export async function deleteTrabalho(id: string) {
  const ref = doc(trabalhosRef, id);
  return deleteDoc(ref);
}
