import { Timestamp, collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

import { db } from './firebase';

export type UsuarioPerfil = {
  uid: string;
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

export async function fetchUsuarios(): Promise<UsuarioPerfil[]> {
  const snapshot = await getDocs(usuariosRef);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data() as UsuarioPerfil;
    const { uid: _, ...rest } = data;
    return { uid: docSnap.id, ...rest };
  });
}

export async function fetchUsuario(uid: string): Promise<UsuarioPerfil | null> {
  const snap = await getDoc(doc(usuariosRef, uid));
  if (!snap.exists()) return null;
  const data = snap.data() as UsuarioPerfil;
  const { uid: _ignored, ...rest } = data;
  return { uid, ...rest };
}

export async function upsertUsuario(uid: string, data: Partial<UsuarioPerfil>) {
  const ref = doc(usuariosRef, uid);
  const payload = {
    uid,
    ...data,
    updatedAt: Timestamp.now()
  } as Record<string, unknown>;

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    payload.createdAt = Timestamp.now();
  }

  return setDoc(ref, payload, { merge: true });
}
