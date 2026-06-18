import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

import { db } from './firebase';
import { asOptionalNumber, asOptionalString, asOptionalTimestamp, asRecord, removeUndefinedDeep } from './firestoreData';

export type EventLocale = 'pt' | 'en' | 'es' | 'it';
export type LocalizedText = Record<EventLocale, string>;

export type EventKind = 'single' | 'multi';
export type CapacityMode = 'total' | 'rooms';
export type EventStatus = 'draft' | 'published' | 'closed' | 'archived';

export type EventRoom = { name: string; capacity: number };
export type EventWork = { id: string; label: LocalizedText; dateTime: string };
export type EventPayment = { beneficiary?: string; iban?: string; swift?: string; causale?: string };
export type EventPricing = {
  lodgingNightRate: number;
  mealsNightRate: number;
  extraLinen: number;
  worksByCount: { anyone: number[]; initiated: number[]; iceflu: number[] };
};

// Per-locale downloadable resource links (program, how-to-arrive, consent form to sign).
export type EventResources = {
  programUrl?: LocalizedText;
  directionsUrl?: LocalizedText;
  consentFormUrl?: LocalizedText;
};

export type EventInput = {
  title: LocalizedText;
  slug: string;
  status: EventStatus;
  kind: EventKind;
  capacityMode: CapacityMode;
  totalSlots?: number;
  rooms?: EventRoom[];
  cautionDepositRate: number;
  payment: EventPayment;
  works: EventWork[];
  pricing: EventPricing;
  resources?: EventResources;
  checkInSuggested?: string;
  checkOutSuggested?: string;
};

export type EventRecord = EventInput & {
  id: string;
  createdBy?: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

const EVENT_LOCALES: EventLocale[] = ['pt', 'en', 'es', 'it'];

const eventsRef = collection(db, 'events');

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type EventValidationError = 'title' | 'slug' | 'capacity' | 'cautionDepositRate' | 'works' | 'pricing';

export function validateEventInput(input: EventInput): EventValidationError | null {
  const hasTitle = EVENT_LOCALES.some(locale => (input.title?.[locale] ?? '').trim().length > 0);
  if (!hasTitle) return 'title';

  if (!input.slug || input.slug.length < 2 || slugify(input.slug) !== input.slug) return 'slug';

  if (input.capacityMode === 'total') {
    if (!input.totalSlots || input.totalSlots <= 0) return 'capacity';
  } else if (!input.rooms || input.rooms.length === 0 || input.rooms.some(room => !room.name.trim() || room.capacity <= 0)) {
    return 'capacity';
  }

  if (input.cautionDepositRate < 0 || input.cautionDepositRate > 1) return 'cautionDepositRate';

  if (!input.works || input.works.length === 0 || input.works.some(work => !work.dateTime)) return 'works';
  if (input.kind === 'single' && input.works.length !== 1) return 'works';

  if (!input.pricing || input.pricing.lodgingNightRate < 0 || input.pricing.mealsNightRate < 0) return 'pricing';

  return null;
}

function mapLocalizedText(value: unknown): LocalizedText {
  const data = asRecord(value);
  return {
    pt: asOptionalString(data.pt) ?? '',
    en: asOptionalString(data.en) ?? '',
    es: asOptionalString(data.es) ?? '',
    it: asOptionalString(data.it) ?? ''
  };
}

function mapResourceUrls(value: unknown): LocalizedText | undefined {
  const text = mapLocalizedText(value);
  return EVENT_LOCALES.some(locale => text[locale]) ? text : undefined;
}

function mapResources(value: unknown): EventResources | undefined {
  const data = asRecord(value);
  const resources: EventResources = {};
  const program = mapResourceUrls(data.programUrl);
  const directions = mapResourceUrls(data.directionsUrl);
  const consentForm = mapResourceUrls(data.consentFormUrl);
  if (program) resources.programUrl = program;
  if (directions) resources.directionsUrl = directions;
  if (consentForm) resources.consentFormUrl = consentForm;
  return Object.keys(resources).length ? resources : undefined;
}

function mapNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.map(item => asOptionalNumber(item) ?? 0) : [];
}

function normalizeEventStatus(value: unknown): EventStatus {
  return value === 'published' || value === 'closed' || value === 'archived' ? value : 'draft';
}

function mapEvent(id: string, value: unknown): EventRecord {
  const data = asRecord(value);
  const pricing = asRecord(data.pricing);
  const worksByCount = asRecord(pricing.worksByCount);
  const createdAt = asOptionalTimestamp(data.createdAt);
  const updatedAt = asOptionalTimestamp(data.updatedAt);

  return {
    id,
    title: mapLocalizedText(data.title),
    slug: asOptionalString(data.slug) ?? id,
    status: normalizeEventStatus(data.status),
    kind: data.kind === 'single' ? 'single' : 'multi',
    capacityMode: data.capacityMode === 'rooms' ? 'rooms' : 'total',
    totalSlots: asOptionalNumber(data.totalSlots),
    rooms: Array.isArray(data.rooms)
      ? data.rooms.map(room => {
          const roomData = asRecord(room);
          return { name: asOptionalString(roomData.name) ?? '', capacity: asOptionalNumber(roomData.capacity) ?? 0 };
        })
      : undefined,
    cautionDepositRate: asOptionalNumber(data.cautionDepositRate) ?? 0.3,
    payment: {
      beneficiary: asOptionalString(asRecord(data.payment).beneficiary),
      iban: asOptionalString(asRecord(data.payment).iban),
      swift: asOptionalString(asRecord(data.payment).swift),
      causale: asOptionalString(asRecord(data.payment).causale)
    },
    works: Array.isArray(data.works)
      ? data.works.map(work => {
          const workData = asRecord(work);
          return {
            id: asOptionalString(workData.id) ?? '',
            label: mapLocalizedText(workData.label),
            dateTime: asOptionalString(workData.dateTime) ?? ''
          };
        })
      : [],
    pricing: {
      lodgingNightRate: asOptionalNumber(pricing.lodgingNightRate) ?? 0,
      mealsNightRate: asOptionalNumber(pricing.mealsNightRate) ?? 0,
      extraLinen: asOptionalNumber(pricing.extraLinen) ?? 0,
      worksByCount: {
        anyone: mapNumberArray(worksByCount.anyone),
        initiated: mapNumberArray(worksByCount.initiated),
        iceflu: mapNumberArray(worksByCount.iceflu)
      }
    },
    resources: mapResources(data.resources),
    checkInSuggested: asOptionalString(data.checkInSuggested),
    checkOutSuggested: asOptionalString(data.checkOutSuggested),
    createdBy: asOptionalString(data.createdBy),
    createdAt: createdAt instanceof Timestamp ? createdAt.toDate() : null,
    updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate() : null
  };
}

export async function fetchEvents(): Promise<EventRecord[]> {
  const snapshot = await getDocs(eventsRef);
  return snapshot.docs.map(docSnap => mapEvent(docSnap.id, docSnap.data()));
}

export async function fetchPublishedEvents(): Promise<EventRecord[]> {
  const snapshot = await getDocs(query(eventsRef, where('status', '==', 'published')));
  return snapshot.docs.map(docSnap => mapEvent(docSnap.id, docSnap.data()));
}

export async function fetchEvent(id: string): Promise<EventRecord | null> {
  const snapshot = await getDoc(doc(eventsRef, id));
  return snapshot.exists() ? mapEvent(snapshot.id, snapshot.data()) : null;
}

// The slug is the document id, so Firestore enforces its uniqueness.
export async function createEvent(input: EventInput, createdBy?: string): Promise<string> {
  const ref = doc(eventsRef, input.slug);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error('An event with this slug already exists.');
  }

  await setDoc(
    ref,
    removeUndefinedDeep({ ...input, createdBy, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  );
  return ref.id;
}

export async function updateEvent(id: string, input: Partial<EventInput>): Promise<void> {
  await updateDoc(doc(eventsRef, id), removeUndefinedDeep({ ...input, updatedAt: serverTimestamp() }));
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteDoc(doc(eventsRef, id));
}
