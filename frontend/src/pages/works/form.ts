import type { IcefluQuotaRates } from '../../lib/icefluQuota';
import type { SacramentItem, SacramentStock } from '../../lib/sacrament';
import type { Work, WorkInput } from '../../lib/works';
import { OTHER_WORK_TYPE_ID, type WorkType } from '../../lib/workTypes';
import type { SiteLocale } from '../../lib/siteLocale';
import { feitioDateRange, formatSacramentDate } from '../sacrament/form';

// ─── form state ────────────────────────────────────────────────────────────────

export type WorkFormState = {
  churchId: string;
  date: string;
  workTypeId: string;
  workTypeOther: string;
  venueText: string;
  hymnalText: string;
  totalAttendees: string;
  initiatedAttendees: string;
  sacramentItemId: string;
  sacramentQuantity: string;
  contributionsCollected: string;
  venueCost: string;
};

export function initialWorkForm(churchId = ''): WorkFormState {
  return {
    churchId,
    date: '',
    workTypeId: '',
    workTypeOther: '',
    venueText: '',
    hymnalText: '',
    totalAttendees: '',
    initiatedAttendees: '',
    sacramentItemId: '',
    sacramentQuantity: '',
    contributionsCollected: '',
    venueCost: ''
  };
}

function numberText(value: number | undefined) {
  return value === undefined ? '' : String(value);
}

export function workToForm(work: Work): WorkFormState {
  return {
    churchId: work.churchId,
    date: work.date,
    workTypeId: work.workTypeId,
    workTypeOther: work.workTypeOther ?? '',
    venueText: work.venueText ?? '',
    hymnalText: work.hymnalText ?? '',
    totalAttendees: numberText(work.attendees.total),
    initiatedAttendees: numberText(work.attendees.initiated),
    sacramentItemId: work.sacrament?.itemId ?? '',
    sacramentQuantity: numberText(work.sacrament?.quantity),
    contributionsCollected: numberText(work.contributions.collected),
    venueCost: numberText(work.contributions.venueCost)
  };
}

// ─── parsing ───────────────────────────────────────────────────────────────────

/** A whole, non-negative head count, or null. */
export function parseCount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

/**
 * A non-negative decimal, or null. Accepts the Italian decimal comma ("12,50")
 * as well as a dot; thousands separators are not accepted, to avoid guessing.
 */
export function parseDecimal(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** Visitors = total - ICEFLU members, or null while the two do not make a valid pair. */
export function whiteAttendees(form: Pick<WorkFormState, 'totalAttendees' | 'initiatedAttendees'>): number | null {
  const total = parseCount(form.totalAttendees);
  const initiated = parseCount(form.initiatedAttendees);
  if (total === null || initiated === null || initiated > total) return null;
  return total - initiated;
}

export function todayDateValue(now = new Date()) {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// ─── Daime options ─────────────────────────────────────────────────────────────

export type SacramentOption = {
  item: SacramentItem;
  stock: SacramentStock;
  balance: number;
};

export function sacramentUnit(item: Pick<SacramentItem, 'form'>): 'L' | 'kg' {
  return item.form === 'gel' ? 'kg' : 'L';
}

export function sacramentItemLabel(item: SacramentItem, stock: Pick<SacramentStock, 'name'>) {
  const parts = [
    item.degree ? `${item.degree}° grau` : '',
    item.form === 'gel' ? 'gel' : item.concentration ?? '',
    item.originChurchName ?? '',
    feitioDateRange(item)
  ].filter(Boolean);
  return `${stock.name} · ${parts.join(' · ') || item.id}`;
}

/** Stocks linked to the church, i.e. the ones its managers may draw Daime from. */
export function stocksForChurch(stocks: readonly SacramentStock[], churchId: string) {
  return churchId ? stocks.filter(stock => stock.churchIds?.includes(churchId)) : [];
}

/**
 * What is left of the batch for this record. When editing, the record's own exit is
 * already in the ledger, so it is added back before comparing.
 */
export function availableForWork(option: SacramentOption, existing?: Work) {
  const own = existing?.sacrament?.itemId === option.item.id ? existing.sacrament.quantity : 0;
  return option.balance + own;
}

// ─── validation ────────────────────────────────────────────────────────────────

export type WorkFormError =
  | 'church'
  | 'date'
  | 'dateInFuture'
  | 'workType'
  | 'workTypeOther'
  | 'totalAttendees'
  | 'initiatedAttendees'
  | 'initiatedAboveTotal'
  | 'sacramentItem'
  | 'sacramentQuantity'
  | 'contributionsCollected'
  | 'venueCost';

export function validateWorkForm(form: WorkFormState, options: { today: string }): WorkFormError[] {
  const errors: WorkFormError[] = [];
  if (!form.churchId) errors.push('church');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
    errors.push('date');
  } else if (form.date > options.today) {
    errors.push('dateInFuture');
  }

  if (!form.workTypeId) errors.push('workType');
  if (form.workTypeId === OTHER_WORK_TYPE_ID && !form.workTypeOther.trim()) errors.push('workTypeOther');

  const total = parseCount(form.totalAttendees);
  const initiated = parseCount(form.initiatedAttendees);
  if (total === null) errors.push('totalAttendees');
  if (initiated === null) errors.push('initiatedAttendees');
  if (total !== null && initiated !== null && initiated > total) errors.push('initiatedAboveTotal');

  if (!form.sacramentItemId) errors.push('sacramentItem');
  const quantity = parseDecimal(form.sacramentQuantity);
  if (quantity === null || quantity <= 0) errors.push('sacramentQuantity');

  if (parseDecimal(form.contributionsCollected) === null) errors.push('contributionsCollected');
  if (parseDecimal(form.venueCost) === null) errors.push('venueCost');

  return errors;
}

/**
 * Whether the work belongs to the official calendar, from its type's group in the
 * catalog. "Other" never does; a type since removed from the catalog keeps what
 * the record was saved with.
 */
export function isOfficialCalendar(
  workTypeId: string,
  workTypes: readonly WorkType[],
  existing?: Pick<Work, 'workTypeId' | 'officialCalendar'>
) {
  if (workTypeId === OTHER_WORK_TYPE_ID) return false;
  const workType = workTypes.find(type => type.id === workTypeId);
  if (workType) return workType.category === 'official';
  return existing?.workTypeId === workTypeId ? existing.officialCalendar : false;
}

// ─── payload ───────────────────────────────────────────────────────────────────

/**
 * Builds the record from a form that passed validateWorkForm. The batch is resolved
 * from the church's options; a record whose batch is no longer offered (its stock
 * was unlinked since) keeps the batch it was saved with. `rates` are the ICEFLU
 * rates in force, which only a new record takes: an existing one keeps its own.
 */
export function buildWorkInput(args: {
  form: WorkFormState;
  churchName: string;
  workTypes: readonly WorkType[];
  otherLabel: string;
  sacramentOptions: readonly SacramentOption[];
  rates: IcefluQuotaRates;
  existing?: Work;
}): WorkInput {
  const { form, churchName, workTypes, otherLabel, sacramentOptions, rates, existing } = args;
  const isOther = form.workTypeId === OTHER_WORK_TYPE_ID;
  const workType = workTypes.find(type => type.id === form.workTypeId);
  const option = sacramentOptions.find(entry => entry.item.id === form.sacramentItemId);
  const quantity = parseDecimal(form.sacramentQuantity) ?? 0;

  const keptSacrament = !option && existing?.sacrament?.itemId === form.sacramentItemId ? existing.sacrament : undefined;
  const sacrament = option
    ? {
        stockId: option.stock.id,
        itemId: option.item.id,
        itemLabel: sacramentItemLabel(option.item, option.stock),
        quantity,
        unit: sacramentUnit(option.item)
      }
    : keptSacrament
      ? { ...keptSacrament, quantity }
      : undefined;

  return {
    churchId: form.churchId,
    churchName,
    date: form.date,
    workTypeId: form.workTypeId,
    workTypeLabel: isOther
      ? otherLabel
      : workType?.label ?? (existing?.workTypeId === form.workTypeId ? existing.workTypeLabel : form.workTypeId),
    workTypeOther: isOther ? form.workTypeOther.trim() : undefined,
    officialCalendar: isOfficialCalendar(form.workTypeId, workTypes, existing),
    venueText: form.venueText.trim() || undefined,
    hymnalText: form.hymnalText.trim() || undefined,
    attendees: {
      total: parseCount(form.totalAttendees) ?? 0,
      initiated: parseCount(form.initiatedAttendees) ?? 0
    },
    sacrament,
    contributions: {
      collected: parseDecimal(form.contributionsCollected) ?? 0,
      venueCost: parseDecimal(form.venueCost) ?? 0
    },
    icefluQuota: existing ? existing.icefluQuota : rates
  };
}

// ─── ICEFLU Brazil quota ───────────────────────────────────────────────────────

export type WorkQuota = {
  /** Contributions collected minus the venue rental; negative when the venue cost more. */
  net: number;
  /** The share of the net contributions, never below zero. */
  share: number;
  /** People the minimum is counted on: visitors, or every participant outside the official calendar. */
  counted: number;
  minimum: number;
  /** What the church owes: the share, but no less than the minimum. */
  owed: number;
};

function roundCents(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeWorkQuota(args: {
  collected: number;
  venueCost: number;
  total: number;
  initiated: number;
  officialCalendar: boolean;
  rates: IcefluQuotaRates;
}): WorkQuota {
  const net = roundCents(args.collected - args.venueCost);
  const share = roundCents((Math.max(0, net) * args.rates.sharePercent) / 100);
  const counted = args.officialCalendar ? Math.max(0, args.total - args.initiated) : args.total;
  const minimum = roundCents(counted * args.rates.minimumPerPerson);
  return { net, share, counted, minimum, owed: Math.max(share, minimum) };
}

export function workQuota(work: Pick<Work, 'attendees' | 'contributions' | 'officialCalendar' | 'icefluQuota'>): WorkQuota {
  return computeWorkQuota({
    collected: work.contributions.collected,
    venueCost: work.contributions.venueCost,
    total: work.attendees.total,
    initiated: work.attendees.initiated,
    officialCalendar: work.officialCalendar,
    rates: work.icefluQuota
  });
}

/** The quota the form's figures imply, or null while any of them is not valid. */
export function formWorkQuota(form: WorkFormState, officialCalendar: boolean, rates: IcefluQuotaRates): WorkQuota | null {
  const collected = parseDecimal(form.contributionsCollected);
  const venueCost = parseDecimal(form.venueCost);
  const total = parseCount(form.totalAttendees);
  const initiated = parseCount(form.initiatedAttendees);
  if (collected === null || venueCost === null || total === null || initiated === null || initiated > total) return null;
  return computeWorkQuota({ collected, venueCost, total, initiated, officialCalendar, rates });
}

/** The admin's rates, or null unless the share is a percentage up to 100 and the minimum an amount. */
export function parseQuotaRates(sharePercent: string, minimumPerPerson: string): IcefluQuotaRates | null {
  const share = parseDecimal(sharePercent);
  const minimum = parseDecimal(minimumPerPerson);
  if (share === null || share > 100 || minimum === null) return null;
  return { sharePercent: share, minimumPerPerson: minimum };
}

// ─── display ───────────────────────────────────────────────────────────────────

export function formatWorkDate(value: string, locale: SiteLocale) {
  return formatSacramentDate(value, locale) || '—';
}

export function workTypeDisplay(work: Pick<Work, 'workTypeId' | 'workTypeLabel' | 'workTypeOther'>) {
  if (work.workTypeId === OTHER_WORK_TYPE_ID && work.workTypeOther) {
    return work.workTypeOther;
  }
  return work.workTypeLabel || work.workTypeId || '—';
}

export function formatEuro(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value);
}

/** `value` is a percentage, e.g. 50 for 50%. */
export function formatPercent(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(value / 100);
}

export type WorkTotals = {
  count: number;
  attendees: number;
  initiated: number;
  liters: number;
  kg: number;
  collected: number;
  net: number;
  /** What the works owe ICEFLU Brazil. */
  quota: number;
};

export function summarizeWorks(works: readonly Work[]): WorkTotals {
  return works.reduce<WorkTotals>(
    (totals, work) => {
      totals.count += 1;
      totals.attendees += work.attendees.total;
      totals.initiated += work.attendees.initiated;
      if (work.sacrament?.unit === 'kg') totals.kg += work.sacrament.quantity;
      else if (work.sacrament) totals.liters += work.sacrament.quantity;
      const quota = workQuota(work);
      totals.collected += work.contributions.collected;
      totals.net += quota.net;
      totals.quota += quota.owed;
      return totals;
    },
    { count: 0, attendees: 0, initiated: 0, liters: 0, kg: 0, collected: 0, net: 0, quota: 0 }
  );
}

export type WorkFilter = { churchId: string; status: '' | Work['reviewStatus']; year: string };

export const initialWorkFilter: WorkFilter = { churchId: '', status: '', year: '' };

export function filterWorks(works: readonly Work[], filter: WorkFilter) {
  return works.filter(work =>
    (!filter.churchId || work.churchId === filter.churchId)
    && (!filter.status || work.reviewStatus === filter.status)
    && (!filter.year || work.date.startsWith(`${filter.year}-`))
  );
}

export function workYears(works: readonly Work[]) {
  return [...new Set(works.map(work => work.date.slice(0, 4)).filter(year => /^\d{4}$/.test(year)))].sort().reverse();
}
