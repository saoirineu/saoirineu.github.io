import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

import { db } from './firebase';
import { asOptionalString, asRecord, asStringArray, removeUndefinedDeep } from './firestoreData';

// Links an account to the churches it acts for: a manager records that church's
// works and draws Daime from the stocks linked to it. Keyed by uid so the rules
// resolve it with one get(). Only admins write it.

export type ChurchManager = {
  uid: string;
  churchIds: string[];
  churchNames: string[];
  email?: string;
  displayName?: string;
};

const managersRef = collection(db, 'churchManagers');

function mapChurchManager(uid: string, value: unknown): ChurchManager {
  const data = asRecord(value);
  return {
    uid,
    churchIds: asStringArray(data.churchIds) ?? [],
    churchNames: asStringArray(data.churchNames) ?? [],
    email: asOptionalString(data.email),
    displayName: asOptionalString(data.displayName)
  };
}

/** The signed-in account's own grant; null when it manages no church. */
export async function fetchChurchManager(uid: string): Promise<ChurchManager | null> {
  const snapshot = await getDoc(doc(managersRef, uid));
  return snapshot.exists() ? mapChurchManager(uid, snapshot.data()) : null;
}

export async function fetchChurchManagers(): Promise<ChurchManager[]> {
  const snapshot = await getDocs(managersRef);
  return snapshot.docs
    .map(docSnapshot => mapChurchManager(docSnapshot.id, docSnapshot.data()))
    .sort((a, b) => (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid));
}

/** Replaces the account's churches; an empty list revokes the grant. */
export async function saveChurchManager(manager: ChurchManager, adminUid: string) {
  const ref = doc(managersRef, manager.uid);
  if (!manager.churchIds.length) {
    return deleteDoc(ref);
  }

  return setDoc(ref, removeUndefinedDeep({
    churchIds: manager.churchIds,
    churchNames: manager.churchNames,
    email: manager.email || undefined,
    displayName: manager.displayName || undefined,
    updatedBy: adminUid,
    updatedAt: serverTimestamp()
  }));
}
