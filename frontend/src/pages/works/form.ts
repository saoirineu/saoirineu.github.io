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
  icefluBrazilQuota: string;
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
    icefluBrazilQuota: ''
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
    icefluBrazilQuota: numberText(work.contributions.icefluBrazilQuota)
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

/** Bianchi = total - fardati, or null while the two do not make a valid pair. */
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
  | 'icefluBrazilQuota';

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
  if (parseDecimal(form.icefluBrazilQuota) === null) errors.push('icefluBrazilQuota');

  return errors;
}

// ─── payload ───────────────────────────────────────────────────────────────────

/**
 * Builds the record from a form that passed validateWorkForm. The batch is resolved
 * from the church's options; a record whose batch is no longer offered (its stock
 * was unlinked since) keeps the batch it was saved with.
 */
export function buildWorkInput(args: {
  form: WorkFormState;
  churchName: string;
  workTypes: readonly WorkType[];
  otherLabel: string;
  sacramentOptions: readonly SacramentOption[];
  existing?: Work;
}): WorkInput {
  const { form, churchName, workTypes, otherLabel, sacramentOptions, existing } = args;
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
    venueText: form.venueText.trim() || undefined,
    hymnalText: form.hymnalText.trim() || undefined,
    attendees: {
      total: parseCount(form.totalAttendees) ?? 0,
      initiated: parseCount(form.initiatedAttendees) ?? 0
    },
    sacrament,
    contributions: {
      collected: parseDecimal(form.contributionsCollected) ?? 0,
      icefluBrazilQuota: parseDecimal(form.icefluBrazilQuota) ?? 0
    }
  };
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

export type WorkTotals = {
  count: number;
  attendees: number;
  initiated: number;
  liters: number;
  kg: number;
  collected: number;
  icefluBrazilQuota: number;
};

export function summarizeWorks(works: readonly Work[]): WorkTotals {
  return works.reduce<WorkTotals>(
    (totals, work) => {
      totals.count += 1;
      totals.attendees += work.attendees.total;
      totals.initiated += work.attendees.initiated;
      if (work.sacrament?.unit === 'kg') totals.kg += work.sacrament.quantity;
      else if (work.sacrament) totals.liters += work.sacrament.quantity;
      totals.collected += work.contributions.collected;
      totals.icefluBrazilQuota += work.contributions.icefluBrazilQuota;
      return totals;
    },
    { count: 0, attendees: 0, initiated: 0, liters: 0, kg: 0, collected: 0, icefluBrazilQuota: 0 }
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
