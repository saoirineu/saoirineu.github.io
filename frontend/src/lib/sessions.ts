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

export type Session = {
  id: string;
  title?: string;
  date?: Timestamp | null;
  startTime?: Timestamp | null;
  expectedDurationMin?: number;
  actualDurationMin?: number;
  notes?: string;
  attendees?: {
    total?: number;
    initiated?: number;
    men?: number;
    women?: number;
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

const sessionsRef = collection(db, 'trabalhos');
const churchesRef = collection(db, 'churches');

function mapAttendees(value: unknown): Session['attendees'] {
  const data = asRecord(value);
  return {
    total: asOptionalNumber(data.total),
    initiated: asOptionalNumber(data.fardados),
    men: asOptionalNumber(data.homens),
    women: asOptionalNumber(data.mulheres),
    children: asOptionalNumber(data.children),
    others: asOptionalNumber(data.others),
    othersDescription: asOptionalString(data.othersDescription)
  };
}

function mapBeverage(value: unknown): Session['beverage'] {
  const data = asRecord(value);
  return {
    batchRef: asOptionalString(data.batchRef),
    batchId: asOptionalString(data.batchId),
    batchDescription: asOptionalString(data.batchDescription),
    batchText: asOptionalString(data.batchText),
    liters: asOptionalNumber(data.liters)
  };
}

function mapSession(id: string, value: unknown): Session {
  const data = asRecord(value);
  return {
    id,
    title: asOptionalString(data.title),
    date: asOptionalTimestamp(data.data),
    startTime: asOptionalTimestamp(data.horarioInicio),
    expectedDurationMin: asOptionalNumber(data.duracaoEsperadaMin),
    actualDurationMin: asOptionalNumber(data.duracaoEfetivaMin),
    notes: asOptionalString(data.notes),
    attendees: mapAttendees(data.attendees),
    hymnals: asStringArray(data.hymnals),
    responsibleChurchIds: asStringArray(data.responsibleChurchIds),
    responsibleChurchNames: asStringArray(data.responsibleChurchNames),
    responsibleChurchText: asOptionalString(data.responsibleChurchText),
    venueId: asOptionalString(data.venueId),
    venueName: asOptionalString(data.venueName),
    venueText: asOptionalString(data.venueText),
    beverage: mapBeverage(data.beverage),
    createdBy: asOptionalString(data.createdBy)
  };
}

export async function fetchSessions(): Promise<Session[]> {
  const q = query(sessionsRef, orderBy('data', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnapshot => mapSession(docSnapshot.id, docSnapshot.data()));
}

export type SessionInput = {
  title?: string;
  date?: Timestamp | null;
  startTime?: Timestamp | null;
  expectedDurationMin?: number | null;
  actualDurationMin?: number | null;
  venueId?: string;
  venueName?: string;
  venueText?: string;
  hymnals?: string[];
  responsibleChurchIds?: string[];
  responsibleChurchNames?: string[];
  responsibleChurchText?: string;
  attendees?: {
    total?: number;
    initiated?: number;
    men?: number;
    women?: number;
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
        name: typeof data.name === 'string' && data.name ? data.name : docSnapshot.id,
        city: typeof data.city === 'string' ? data.city : undefined,
        state: typeof data.state === 'string' ? data.state : undefined,
        country: typeof data.country === 'string' ? data.country : undefined,
        lineage: typeof data.lineage === 'string' ? data.lineage : undefined,
        observations: typeof data.observations === 'string' ? data.observations : undefined,
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
    name: input.name,
    city: input.city || undefined,
    state: input.state || undefined,
    country: input.country || undefined,
    lineage: input.lineage || undefined,
    observations: input.observations || undefined,
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
    name: input.name,
    city: input.city,
    state: input.state,
    country: input.country,
    lineage: input.lineage,
    observations: input.observations,
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
    const q = query(collection(db, 'beverageBatches'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
      const data = asRecord(docSnapshot.data());
      const description = typeof data.description === 'string' ? data.description : undefined;
      const desc = description
        ? description
        : `${data.grau ?? '?'}º grau, ${data.concentracao ?? ''} ${data.ano ?? ''} ${data.localidade ?? ''}`.trim();
      return { id: docSnapshot.id, description: desc };
    });
  } catch {
    return [];
  }
}

export async function createSession(input: SessionInput) {
  const firestorePayload = removeUndefinedDeep({
    title: input.title,
    data: input.date ?? null,
    horarioInicio: input.startTime ?? null,
    duracaoEsperadaMin: input.expectedDurationMin ?? null,
    duracaoEfetivaMin: input.actualDurationMin ?? null,
    venueId: input.venueId,
    venueName: input.venueName,
    venueText: input.venueText,
    hymnals: input.hymnals,
    responsibleChurchIds: input.responsibleChurchIds,
    responsibleChurchNames: input.responsibleChurchNames,
    responsibleChurchText: input.responsibleChurchText,
    attendees: input.attendees ? {
      total: input.attendees.total,
      fardados: input.attendees.initiated,
      homens: input.attendees.men,
      mulheres: input.attendees.women,
      children: input.attendees.children,
      others: input.attendees.others,
      othersDescription: input.attendees.othersDescription
    } : undefined,
    beverage: input.beverage ? {
      batchId: input.beverage.batchId,
      batchDescription: input.beverage.batchDescription,
      batchText: input.beverage.batchText,
      liters: input.beverage.liters ?? null
    } : undefined,
    notes: input.notes,
    createdBy: input.createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });

  return addDoc(sessionsRef, firestorePayload as Record<string, unknown>);
}

export async function updateSession(id: string, input: Partial<SessionInput>) {
  const ref = doc(sessionsRef, id);
  const firestorePayload = removeUndefinedDeep({
    title: input.title,
    data: input.date,
    horarioInicio: input.startTime,
    duracaoEsperadaMin: input.expectedDurationMin,
    duracaoEfetivaMin: input.actualDurationMin,
    venueId: input.venueId,
    venueName: input.venueName,
    venueText: input.venueText,
    hymnals: input.hymnals,
    responsibleChurchIds: input.responsibleChurchIds,
    responsibleChurchNames: input.responsibleChurchNames,
    responsibleChurchText: input.responsibleChurchText,
    attendees: input.attendees ? {
      total: input.attendees.total,
      fardados: input.attendees.initiated,
      homens: input.attendees.men,
      mulheres: input.attendees.women,
      children: input.attendees.children,
      others: input.attendees.others,
      othersDescription: input.attendees.othersDescription
    } : undefined,
    beverage: input.beverage ? {
      batchId: input.beverage.batchId,
      batchDescription: input.beverage.batchDescription,
      batchText: input.beverage.batchText,
      liters: input.beverage.liters
    } : undefined,
    notes: input.notes,
    updatedAt: Timestamp.now()
  });

  return updateDoc(ref, firestorePayload as Record<string, unknown>);
}

export async function deleteSession(id: string) {
  const ref = doc(sessionsRef, id);
  return deleteDoc(ref);
}
