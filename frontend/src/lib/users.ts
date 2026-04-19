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
  isInitiated?: boolean;
  initiationDate?: string;
  initiationVenue?: string;
  initiationChurchId?: string;
  initiationChurchName?: string;
  initiatorName?: string;
  initiatedWith?: string;
  isSponsor?: boolean;
  sponsorChurchIds?: string[];
  sponsorChurchNames?: string[];
  doctrineRoles?: string[];
  observations?: string;
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
};

const usersRef = collection(db, 'users');

function mapUserProfile(uid: string, value: unknown): UserProfile {
  const data = asRecord(value);
  return {
    uid,
    systemRole: normalizeSystemRole(data.systemRole),
    displayName: asOptionalString(data.displayName),
    email: asOptionalString(data.email),
    phone: asOptionalString(data.phone),
    avatarUrl: asOptionalString(data.avatarUrl),
    city: asOptionalString(data.city),
    state: asOptionalString(data.state),
    country: asOptionalString(data.country),
    currentChurchId: asOptionalString(data.currentChurchId),
    currentChurchName: asOptionalString(data.currentChurchName),
    originChurchName: asOptionalString(data.originChurchName),
    // Firestore field: fardado → isInitiated
    isInitiated: asOptionalBoolean(data.fardado),
    // Firestore field: fardamentoDate → initiationDate (migrated)
    initiationDate: asOptionalString(data.fardamentoDate),
    initiationVenue: asOptionalString(data.fardamentoVenue),
    initiationChurchId: asOptionalString(data.fardamentoChurchId),
    initiationChurchName: asOptionalString(data.fardamentoChurchName),
    initiatorName: asOptionalString(data.fardadorName),
    initiatedWith: asOptionalString(data.fardadoComQuem),
    isSponsor: asOptionalBoolean(data.isPadrinho),
    sponsorChurchIds: asStringArray(data.padrinhoChurchIds),
    sponsorChurchNames: asStringArray(data.padrinhoChurchNames),
    doctrineRoles: asStringArray(data.doctrineRoles),
    observations: asOptionalString(data.observations),
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

  const firestorePayload = {
    uid,
    systemRole: data.systemRole,
    displayName: data.displayName,
    email: data.email,
    phone: data.phone,
    avatarUrl: data.avatarUrl,
    city: data.city,
    state: data.state,
    country: data.country,
    currentChurchId: data.currentChurchId,
    currentChurchName: data.currentChurchName,
    originChurchName: data.originChurchName,
    fardado: data.isInitiated,
    fardamentoDate: data.initiationDate,
    fardamentoVenue: data.initiationVenue,
    fardamentoChurchId: data.initiationChurchId,
    fardamentoChurchName: data.initiationChurchName,
    fardadorName: data.initiatorName,
    fardadoComQuem: data.initiatedWith,
    isPadrinho: data.isSponsor,
    padrinhoChurchIds: data.sponsorChurchIds,
    padrinhoChurchNames: data.sponsorChurchNames,
    doctrineRoles: data.doctrineRoles,
    observations: data.observations,
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
