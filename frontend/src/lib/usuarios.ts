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

export type UsuarioPerfil = {
  uid: string;
  systemRole?: SystemRole;
  displayName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  igrejaAtualId?: string;
  igrejaAtualNome?: string;
  igrejaOrigemNome?: string;
  fardado?: boolean;
  fardamentoData?: string;
  fardamentoLocal?: string;
  fardamentoIgrejaId?: string;
  fardamentoIgrejaNome?: string;
  fardadorNome?: string;
  fardadoComQuem?: string;
  padrinhoMadrinha?: boolean;
  padrinhoIgrejasIds?: string[];
  padrinhoIgrejasNomes?: string[];
  papeisDoutrina?: string[];
  observacoes?: string;
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
};

const usuariosRef = collection(db, 'usuarios');

function mapUsuarioPerfil(uid: string, value: unknown): UsuarioPerfil {
  const data = asRecord(value);
  return {
    uid,
    systemRole: normalizeSystemRole(data.systemRole),
    displayName: asOptionalString(data.displayName),
    email: asOptionalString(data.email),
    phone: asOptionalString(data.phone),
    avatarUrl: asOptionalString(data.avatarUrl),
    cidade: asOptionalString(data.cidade),
    estado: asOptionalString(data.estado),
    pais: asOptionalString(data.pais),
    igrejaAtualId: asOptionalString(data.igrejaAtualId),
    igrejaAtualNome: asOptionalString(data.igrejaAtualNome),
    igrejaOrigemNome: asOptionalString(data.igrejaOrigemNome),
    fardado: asOptionalBoolean(data.fardado),
    fardamentoData: asOptionalString(data.fardamentoData),
    fardamentoLocal: asOptionalString(data.fardamentoLocal),
    fardamentoIgrejaId: asOptionalString(data.fardamentoIgrejaId),
    fardamentoIgrejaNome: asOptionalString(data.fardamentoIgrejaNome),
    fardadorNome: asOptionalString(data.fardadorNome),
    fardadoComQuem: asOptionalString(data.fardadoComQuem),
    padrinhoMadrinha: asOptionalBoolean(data.padrinhoMadrinha),
    padrinhoIgrejasIds: asStringArray(data.padrinhoIgrejasIds),
    padrinhoIgrejasNomes: asStringArray(data.padrinhoIgrejasNomes),
    papeisDoutrina: asStringArray(data.papeisDoutrina),
    observacoes: asOptionalString(data.observacoes),
    updatedAt: asOptionalTimestamp(data.updatedAt) ?? undefined,
    createdAt: asOptionalTimestamp(data.createdAt) ?? undefined
  };
}

export async function fetchUsuarios(): Promise<UsuarioPerfil[]> {
  const snapshot = await getDocs(usuariosRef);
  return snapshot.docs.map(docSnap => mapUsuarioPerfil(docSnap.id, docSnap.data()));
}

export async function fetchUsuario(uid: string): Promise<UsuarioPerfil | null> {
  const snap = await getDoc(doc(usuariosRef, uid));
  if (!snap.exists()) return null;
  return mapUsuarioPerfil(uid, snap.data());
}

export async function upsertUsuario(uid: string, data: Partial<UsuarioPerfil>) {
  const ref = doc(usuariosRef, uid);
  const payload = removeUndefinedDeep({
    uid,
    ...data,
    updatedAt: Timestamp.now()
  });

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    payload.createdAt = Timestamp.now();
  }

  return setDoc(ref, payload, { merge: true });
}

export async function updateUsuarioSystemRole(uid: string, systemRole: SystemRole) {
  return upsertUsuario(uid, { systemRole });
}
