import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from './firebase';
import {
  asOptionalNumber,
  asOptionalString,
  asOptionalTimestamp,
  asRecord,
  removeUndefinedDeep,
} from './firestoreData';

export type SacramentForm = 'liquid' | 'gel';
export type TransactionType = 'entry' | 'exit';

export type SacramentStock = {
  id: string;
  name: string;
  location?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type SacramentItem = {
  id: string;
  stockId: string;
  degree: string;
  concentration?: string;
  form: SacramentForm;
  originChurchId?: string;
  originChurchName?: string;
  responsiblePerson?: string;
  feitioDate?: string;
  feitioDateEnd?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type SacramentTransaction = {
  id: string;
  itemId: string;
  stockId: string;
  type: TransactionType;
  date: string;
  missionaryName?: string;
  destinationChurchId?: string;
  destinationChurchName?: string;
  quantity: number;
  notes?: string;
  createdBy?: string;
  createdAt?: Timestamp;
};

const stocksRef = collection(db, 'sacramentStocks');
const itemsRef = collection(db, 'sacramentItems');
const transactionsRef = collection(db, 'sacramentTransactions');

function mapStock(id: string, value: unknown): SacramentStock {
  const data = asRecord(value);
  return {
    id,
    name: asOptionalString(data.name) ?? '',
    location: asOptionalString(data.location),
    createdAt: asOptionalTimestamp(data.createdAt) ?? undefined,
    updatedAt: asOptionalTimestamp(data.updatedAt) ?? undefined,
  };
}

function mapItem(id: string, value: unknown): SacramentItem {
  const data = asRecord(value);
  return {
    id,
    stockId: asOptionalString(data.stockId) ?? '',
    degree: asOptionalString(data.degree) ?? '',
    concentration: asOptionalString(data.concentration),
    form: data.form === 'gel' ? 'gel' : 'liquid',
    originChurchId: asOptionalString(data.originChurchId),
    originChurchName: asOptionalString(data.originChurchName),
    responsiblePerson: asOptionalString(data.responsiblePerson),
    feitioDate: asOptionalString(data.feitioDate),
    feitioDateEnd: asOptionalString(data.feitioDateEnd),
    createdAt: asOptionalTimestamp(data.createdAt) ?? undefined,
    updatedAt: asOptionalTimestamp(data.updatedAt) ?? undefined,
  };
}

function mapTransaction(id: string, value: unknown): SacramentTransaction {
  const data = asRecord(value);
  return {
    id,
    itemId: asOptionalString(data.itemId) ?? '',
    stockId: asOptionalString(data.stockId) ?? '',
    type: data.type === 'exit' ? 'exit' : 'entry',
    date: asOptionalString(data.date) ?? '',
    missionaryName: asOptionalString(data.missionaryName),
    destinationChurchId: asOptionalString(data.destinationChurchId),
    destinationChurchName: asOptionalString(data.destinationChurchName),
    quantity: asOptionalNumber(data.quantity) ?? 0,
    notes: asOptionalString(data.notes),
    createdBy: asOptionalString(data.createdBy),
    createdAt: asOptionalTimestamp(data.createdAt) ?? undefined,
  };
}

export async function fetchStocks(): Promise<SacramentStock[]> {
  const snap = await getDocs(stocksRef);
  return snap.docs
    .map(d => mapStock(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createStock(data: Omit<SacramentStock, 'id'>): Promise<string> {
  const ref = await addDoc(
    stocksRef,
    removeUndefinedDeep({
      name: data.name,
      location: data.location,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  return ref.id;
}

export async function updateStock(
  id: string,
  data: Partial<Omit<SacramentStock, 'id'>>,
): Promise<void> {
  await updateDoc(doc(stocksRef, id), removeUndefinedDeep({ ...data, updatedAt: serverTimestamp() }));
}

export async function fetchItems(stockId: string): Promise<SacramentItem[]> {
  const snap = await getDocs(
    query(itemsRef, where('stockId', '==', stockId)),
  );
  const items = snap.docs.map(d => mapItem(d.id, d.data()));
  return items.sort((a, b) => (b.feitioDate ?? '').localeCompare(a.feitioDate ?? ''));
}

export async function createItem(data: Omit<SacramentItem, 'id'>): Promise<string> {
  const ref = await addDoc(
    itemsRef,
    removeUndefinedDeep({
      stockId: data.stockId,
      degree: data.degree,
      concentration: data.concentration,
      form: data.form,
      originChurchId: data.originChurchId,
      originChurchName: data.originChurchName,
      responsiblePerson: data.responsiblePerson,
      feitioDate: data.feitioDate,
      feitioDateEnd: data.feitioDateEnd,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  return ref.id;
}

export async function updateItem(
  id: string,
  data: Partial<Omit<SacramentItem, 'id'>>,
): Promise<void> {
  await updateDoc(doc(itemsRef, id), removeUndefinedDeep({ ...data, updatedAt: serverTimestamp() }));
}

export async function deleteItem(id: string): Promise<void> {
  // cascade: remove all transactions for this item first
  const txSnap = await getDocs(query(transactionsRef, where('itemId', '==', id)));
  await Promise.all(txSnap.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(doc(itemsRef, id));
}

export async function deleteStock(id: string): Promise<void> {
  // cascade: remove all items (and their transactions) for this stock first
  const itemSnap = await getDocs(query(itemsRef, where('stockId', '==', id)));
  await Promise.all(itemSnap.docs.map(async itemDoc => {
    const txSnap = await getDocs(query(transactionsRef, where('itemId', '==', itemDoc.id)));
    await Promise.all(txSnap.docs.map(d => deleteDoc(d.ref)));
    await deleteDoc(itemDoc.ref);
  }));
  await deleteDoc(doc(stocksRef, id));
}

export async function fetchTransactions(itemId: string): Promise<SacramentTransaction[]> {
  const snap = await getDocs(
    query(transactionsRef, where('itemId', '==', itemId)),
  );
  const txs = snap.docs.map(d => mapTransaction(d.id, d.data()));
  return txs.sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchTransactionsByStock(stockId: string): Promise<SacramentTransaction[]> {
  const snap = await getDocs(
    query(transactionsRef, where('stockId', '==', stockId)),
  );
  const txs = snap.docs.map(d => mapTransaction(d.id, d.data()));
  return txs.sort((a, b) => b.date.localeCompare(a.date));
}

export async function createTransaction(
  data: Omit<SacramentTransaction, 'id'>,
): Promise<string> {
  const ref = await addDoc(
    transactionsRef,
    removeUndefinedDeep({
      itemId: data.itemId,
      stockId: data.stockId,
      type: data.type,
      date: data.date,
      missionaryName: data.missionaryName,
      destinationChurchId: data.destinationChurchId,
      destinationChurchName: data.destinationChurchName,
      quantity: data.quantity,
      notes: data.notes,
      createdBy: data.createdBy,
      createdAt: serverTimestamp(),
    }),
  );
  return ref.id;
}

export function computeCurrentQuantity(transactions: SacramentTransaction[]): number {
  return transactions.reduce(
    (acc, t) => (t.type === 'entry' ? acc + t.quantity : acc - t.quantity),
    0,
  );
}

export async function updateTransaction(
  id: string,
  data: Partial<Omit<SacramentTransaction, 'id' | 'createdBy' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(transactionsRef, id), removeUndefinedDeep({ ...data }));
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(doc(transactionsRef, id));
}
