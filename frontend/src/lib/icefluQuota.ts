import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from './firebase';
import { asOptionalNumber, asRecord } from './firestoreData';

// What a church owes ICEFLU Brazil for each work: a share of the net contributions,
// but never less than a minimum per person. The rates are the same for every church
// and kept in catalogs/icefluQuota, where only admins change them; each work record
// keeps the rates it was saved with.

export type IcefluQuotaRates = {
  /** Percentage of the net contributions, 0–100. */
  sharePercent: number;
  /** EUR per visitor, or per participant at works outside the official calendar. */
  minimumPerPerson: number;
};

/**
 * Agreed at the 2026-10-20 meeting and used until an admin saves other rates.
 * firestore.rules (hasCurrentIcefluQuota) repeats these values.
 */
export const DEFAULT_ICEFLU_QUOTA: IcefluQuotaRates = { sharePercent: 50, minimumPerPerson: 25 };

const quotaRef = doc(db, 'catalogs', 'icefluQuota');

export function normalizeIcefluQuota(value: unknown): IcefluQuotaRates {
  const data = asRecord(value);
  return {
    sharePercent: asOptionalNumber(data.sharePercent) ?? DEFAULT_ICEFLU_QUOTA.sharePercent,
    minimumPerPerson: asOptionalNumber(data.minimumPerPerson) ?? DEFAULT_ICEFLU_QUOTA.minimumPerPerson
  };
}

export async function fetchIcefluQuota(): Promise<IcefluQuotaRates> {
  const snapshot = await getDoc(quotaRef);
  return normalizeIcefluQuota(snapshot.exists() ? snapshot.data() : undefined);
}

export async function saveIcefluQuota(rates: IcefluQuotaRates, uid: string) {
  return setDoc(quotaRef, {
    sharePercent: rates.sharePercent,
    minimumPerPerson: rates.minimumPerPerson,
    updatedBy: uid,
    updatedAt: serverTimestamp()
  });
}
