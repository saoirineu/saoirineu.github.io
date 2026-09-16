import {
  addDoc,
  collection,
  doc,
  deleteDoc,
  deleteField,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';

import { db } from './firebase';
import { ITALIAN_REFERENCE_CHURCHES } from './profileCatalog';
import {
  asOptionalNumber,
  asOptionalString,
  asOptionalTimestamp,
  asRecord,
  removeUndefinedDeep
} from './firestoreData';

// A record of a work already held, filed by one of the church's managers
// (see lib/churchManagers.ts). Its Daime usage is booked as an exit movement in
// the Sacrament ledger by the onWorkSacramentChange Cloud Function.

export type WorkReviewStatus = 'pre-approved' | 'reviewed';

export type WorkSacramentUnit = 'L' | 'kg';

export type Work = {
  id: string;
  churchId: string;
  churchName: string;
  /** Day the work was held, YYYY-MM-DD. */
  date: string;
  workTypeId: string;
  /** Label at the time of recording: the work-type catalog is admin-editable. */
  workTypeLabel: string;
  workTypeOther?: string;
  venueText?: string;
  hymnalText?: string;
  /** Whites (non-fardados) are derived as total - initiated, never stored. */
  attendees: { total: number; initiated: number };
  sacrament?: {
    stockId: string;
    itemId: string;
    itemLabel?: string;
    quantity: number;
    unit: WorkSacramentUnit;
  };
  contributions: { collected: number; icefluBrazilQuota: number };
  reviewStatus: WorkReviewStatus;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  createdBy?: string;
  createdAt?: Timestamp;
  updatedBy?: string;
  updatedAt?: Timestamp;
};

export type WorkInput = Omit<Work, 'id' | 'reviewStatus' | 'reviewedAt' | 'reviewedBy' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt'>;

const worksRef = collection(db, 'trabalhos');
const churchesRef = collection(db, 'churches');

function dateString(value: unknown): string {
  if (typeof value === 'string') return value;
  // Early prototype records stored the day as a Timestamp.
  const timestamp = asOptionalTimestamp(value);
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function mapWork(id: string, value: unknown): Work {
  const data = asRecord(value);
  const attendees = asRecord(data.attendees);
  const contributions = asRecord(data.contributions);
  const sacrament = asRecord(data.sacrament);
  const itemId = asOptionalString(sacrament.itemId);
  const stockId = asOptionalString(sacrament.stockId);

  return {
    id,
    churchId: asOptionalString(data.churchId) ?? '',
    churchName: asOptionalString(data.churchName) ?? '',
    date: dateString(data.date),
    workTypeId: asOptionalString(data.workTypeId) ?? '',
    workTypeLabel: asOptionalString(data.workTypeLabel) ?? asOptionalString(data.title) ?? '',
    workTypeOther: asOptionalString(data.workTypeOther),
    venueText: asOptionalString(data.venueText),
    hymnalText: asOptionalString(data.hymnalText),
    attendees: {
      total: asOptionalNumber(attendees.total) ?? 0,
      initiated: asOptionalNumber(attendees.initiated) ?? 0
    },
    sacrament: itemId && stockId
      ? {
          stockId,
          itemId,
          itemLabel: asOptionalString(sacrament.itemLabel),
          quantity: asOptionalNumber(sacrament.quantity) ?? 0,
          unit: sacrament.unit === 'kg' ? 'kg' : 'L'
        }
      : undefined,
    contributions: {
      collected: asOptionalNumber(contributions.collected) ?? 0,
      icefluBrazilQuota: asOptionalNumber(contributions.icefluBrazilQuota) ?? 0
    },
    reviewStatus: data.reviewStatus === 'reviewed' ? 'reviewed' : 'pre-approved',
    reviewedAt: asOptionalTimestamp(data.reviewedAt) ?? undefined,
    reviewedBy: asOptionalString(data.reviewedBy),
    createdBy: asOptionalString(data.createdBy),
    createdAt: asOptionalTimestamp(data.createdAt) ?? undefined,
    updatedBy: asOptionalString(data.updatedBy),
    updatedAt: asOptionalTimestamp(data.updatedAt) ?? undefined
  };
}

function sortWorks(works: Work[]) {
  return works.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

/** Every record — admins only. */
export async function fetchWorks(): Promise<Work[]> {
  const snapshot = await getDocs(worksRef);
  return sortWorks(snapshot.docs.map(docSnapshot => mapWork(docSnapshot.id, docSnapshot.data())));
}

/**
 * The records of the given churches. One equality query per church, because the
 * rules can only prove a manager's access against a single churchId.
 */
export async function fetchWorksForChurches(churchIds: string[]): Promise<Work[]> {
  const snapshots = await Promise.all(
    churchIds.map(churchId => getDocs(query(worksRef, where('churchId', '==', churchId))))
  );
  return sortWorks(snapshots.flatMap(snapshot => snapshot.docs.map(docSnapshot => mapWork(docSnapshot.id, docSnapshot.data()))));
}

function workPayload(input: WorkInput) {
  return {
    churchId: input.churchId,
    churchName: input.churchName,
    date: input.date,
    workTypeId: input.workTypeId,
    workTypeLabel: input.workTypeLabel,
    attendees: { total: input.attendees.total, initiated: input.attendees.initiated },
    contributions: {
      collected: input.contributions.collected,
      icefluBrazilQuota: input.contributions.icefluBrazilQuota
    }
  };
}

function sacramentPayload(sacrament: NonNullable<WorkInput['sacrament']>) {
  return removeUndefinedDeep({
    stockId: sacrament.stockId,
    itemId: sacrament.itemId,
    itemLabel: sacrament.itemLabel || undefined,
    quantity: sacrament.quantity,
    unit: sacrament.unit
  });
}

export async function createWork(input: WorkInput, uid: string) {
  const payload = removeUndefinedDeep({
    ...workPayload(input),
    workTypeOther: input.workTypeOther || undefined,
    venueText: input.venueText || undefined,
    hymnalText: input.hymnalText || undefined,
    sacrament: input.sacrament ? sacramentPayload(input.sacrament) : undefined,
    reviewStatus: 'pre-approved' satisfies WorkReviewStatus,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedBy: uid,
    updatedAt: serverTimestamp()
  });

  return addDoc(worksRef, payload);
}

/**
 * Saves an edit. A manager's edit sends a reviewed record back to pre-approved,
 * since the admin reviewed different figures; an admin's own edit keeps its status.
 */
export async function updateWork(id: string, input: WorkInput, options: { uid: string; keepReview: boolean }) {
  const payload: Record<string, unknown> = {
    ...workPayload(input),
    workTypeOther: input.workTypeOther || deleteField(),
    venueText: input.venueText || deleteField(),
    hymnalText: input.hymnalText || deleteField(),
    sacrament: input.sacrament ? sacramentPayload(input.sacrament) : deleteField(),
    updatedBy: options.uid,
    updatedAt: serverTimestamp()
  };

  if (!options.keepReview) {
    payload.reviewStatus = 'pre-approved' satisfies WorkReviewStatus;
    payload.reviewedAt = deleteField();
    payload.reviewedBy = deleteField();
  }

  return updateDoc(doc(worksRef, id), payload);
}

export async function setWorkReviewStatus(id: string, status: WorkReviewStatus, uid: string) {
  const reviewed = status === 'reviewed';
  return updateDoc(doc(worksRef, id), {
    reviewStatus: status,
    reviewedAt: reviewed ? serverTimestamp() : deleteField(),
    reviewedBy: reviewed ? uid : deleteField(),
    updatedBy: uid,
    updatedAt: serverTimestamp()
  });
}

export async function deleteWork(id: string) {
  return deleteDoc(doc(worksRef, id));
}

export type ChurchInfo = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  lineage?: string;
  leaderName?: string;
  leaderEmail?: string;
  churchEmail?: string;
  observations?: string;
  lat?: number;
  lng?: number;
};

function mergeCatalogChurches(churches: ChurchInfo[]) {
  const byId = new Map<string, ChurchInfo>();
  for (const church of ITALIAN_REFERENCE_CHURCHES) {
    byId.set(church.id, church);
  }
  for (const church of churches) {
    byId.set(church.id, church);
  }
  return Array.from(byId.values());
}

export async function fetchChurches(): Promise<ChurchInfo[]> {
  try {
    const q = query(churchesRef);
    const snapshot = await getDocs(q);
    const churches = snapshot.docs.map(docSnapshot => {
      const data = asRecord(docSnapshot.data());
      return {
        id: docSnapshot.id,
        name: typeof data.name === 'string' && data.name ? data.name : docSnapshot.id,
        city: typeof data.city === 'string' ? data.city : undefined,
        state: typeof data.state === 'string' ? data.state : undefined,
        country: typeof data.country === 'string' ? data.country : undefined,
        lineage: typeof data.lineage === 'string' ? data.lineage : undefined,
        leaderName: typeof data.leaderName === 'string' ? data.leaderName : undefined,
        leaderEmail: typeof data.leaderEmail === 'string' ? data.leaderEmail : undefined,
        churchEmail: typeof data.churchEmail === 'string' ? data.churchEmail : undefined,
        observations: typeof data.observations === 'string' ? data.observations : undefined,
        lat: typeof data.lat === 'number' ? data.lat : undefined,
        lng: typeof data.lng === 'number' ? data.lng : undefined
      };
    });
    return mergeCatalogChurches(churches);
  } catch {
    return mergeCatalogChurches([]);
  }
}

export type ChurchInput = {
  name: string;
  city?: string;
  state?: string;
  country?: string;
  lineage?: string;
  leaderName?: string;
  leaderEmail?: string;
  churchEmail?: string;
  observations?: string;
  lat?: number;
  lng?: number;
};

function buildChurchFirestorePayload(input: ChurchInput, includeCreatedAt = true) {
  return removeUndefinedDeep({
    name: input.name,
    city: input.city || undefined,
    state: input.state || undefined,
    country: input.country || undefined,
    lineage: input.lineage || undefined,
    leaderName: input.leaderName || undefined,
    leaderEmail: input.leaderEmail || undefined,
    churchEmail: input.churchEmail || undefined,
    observations: input.observations || undefined,
    lat: typeof input.lat === 'number' ? input.lat : undefined,
    lng: typeof input.lng === 'number' ? input.lng : undefined,
    createdAt: includeCreatedAt ? Timestamp.now() : undefined,
    updatedAt: Timestamp.now()
  });
}

export async function ensureItalianReferenceChurches() {
  await Promise.all(ITALIAN_REFERENCE_CHURCHES.map(church => {
    const payload = buildChurchFirestorePayload(church, false);
    return setDoc(doc(churchesRef, church.id), payload as Record<string, unknown>, { merge: true });
  }));
}

export async function createChurch(input: ChurchInput) {
  const payload = buildChurchFirestorePayload(input);

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
    leaderName: input.leaderName,
    leaderEmail: input.leaderEmail,
    churchEmail: input.churchEmail,
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
