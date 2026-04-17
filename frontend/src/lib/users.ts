import { Timestamp, collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

import { db } from './firebase';
import {
  asOptionalBoolean,
  asOptionalString,
  asOptionalTimestamp,
  asRecord,
  asStringArray,
  removeUndefinedDeep
} from './firestoreData';
import { normalizeSystemRole, type SystemRole } from './systemRole';

export type UserProfile = {
  uid: string;
  systemRole?: SystemRole;
  displayName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  currentChurchId?: string;
  currentChurchName?: string;
  originChurchName?: string;
  fardado?: boolean;
  fardamentoDate?: string;
  fardamentoVenue?: string;
  fardamentoChurchId?: string;
  fardamentoChurchName?: string;
  fardadorName?: string;
  fardadoComQuem?: string;
  isPadrinho?: boolean;
  padrinhoChurchIds?: string[];
  padrinhoChurchNames?: string[];
  doctrineRoles?: string[];
  observations?: string;
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
};

const usersRef = collection(db, 'usuarios');

function mapUserProfile(uid: string, value: unknown): UserProfile {
  const data = asRecord(value);
  return {
    uid,
    systemRole: normalizeSystemRole(data.systemRole),
    displayName: asOptionalString(data.displayName),
    email: asOptionalString(data.email),
    phone: asOptionalString(data.phone),
    avatarUrl: asOptionalString(data.avatarUrl),
    city: asOptionalString(data.cidade),
    state: asOptionalString(data.estado),
    country: asOptionalString(data.pais),
    currentChurchId: asOptionalString(data.igrejaAtualId),
    currentChurchName: asOptionalString(data.igrejaAtualNome),
    originChurchName: asOptionalString(data.igrejaOrigemNome),
    fardado: asOptionalBoolean(data.fardado),
    fardamentoDate: asOptionalString(data.fardamentoData),
    fardamentoVenue: asOptionalString(data.fardamentoLocal),
    fardamentoChurchId: asOptionalString(data.fardamentoIgrejaId),
    fardamentoChurchName: asOptionalString(data.fardamentoIgrejaNome),
    fardadorName: asOptionalString(data.fardadorNome),
    fardadoComQuem: asOptionalString(data.fardadoComQuem),
    isPadrinho: asOptionalBoolean(data.padrinhoMadrinha),
    padrinhoChurchIds: asStringArray(data.padrinhoIgrejasIds),
    padrinhoChurchNames: asStringArray(data.padrinhoIgrejasNomes),
    doctrineRoles: asStringArray(data.papeisDoutrina),
    observations: asOptionalString(data.observacoes),
    updatedAt: asOptionalTimestamp(data.updatedAt) ?? undefined,
    createdAt: asOptionalTimestamp(data.createdAt) ?? undefined
  };
}

export async function fetchUsers(): Promise<UserProfile[]> {
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map(docSnap => mapUserProfile(docSnap.id, docSnap.data()));
}

export async function fetchUser(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(usersRef, uid));
  if (!snap.exists()) return null;
  return mapUserProfile(uid, snap.data());
}

export async function upsertUser(uid: string, data: Partial<UserProfile>) {
  const ref = doc(usersRef, uid);

  // Map English field names back to Firestore's Portuguese field names (pending migration)
  const firestorePayload = {
    uid,
    systemRole: data.systemRole,
    displayName: data.displayName,
    email: data.email,
    phone: data.phone,
    avatarUrl: data.avatarUrl,
    cidade: data.city,
    estado: data.state,
    pais: data.country,
    igrejaAtualId: data.currentChurchId,
    igrejaAtualNome: data.currentChurchName,
    igrejaOrigemNome: data.originChurchName,
    fardado: data.fardado,
    fardamentoData: data.fardamentoDate,
    fardamentoLocal: data.fardamentoVenue,
    fardamentoIgrejaId: data.fardamentoChurchId,
    fardamentoIgrejaNome: data.fardamentoChurchName,
    fardadorNome: data.fardadorName,
    fardadoComQuem: data.fardadoComQuem,
    padrinhoMadrinha: data.isPadrinho,
    padrinhoIgrejasIds: data.padrinhoChurchIds,
    padrinhoIgrejasNomes: data.padrinhoChurchNames,
    papeisDoutrina: data.doctrineRoles,
    observacoes: data.observations,
    updatedAt: Timestamp.now()
  };

  const payload = removeUndefinedDeep(firestorePayload);

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    (payload as Record<string, unknown>).createdAt = Timestamp.now();
  }

  return setDoc(ref, payload, { merge: true });
}

export async function updateUserSystemRole(uid: string, systemRole: SystemRole) {
  return upsertUser(uid, { systemRole });
}
