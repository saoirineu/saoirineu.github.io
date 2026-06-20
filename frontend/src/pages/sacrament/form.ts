import type { SacramentForm, SacramentItem, SacramentTransaction } from '../../lib/sacrament';
import type { ChurchInfo } from '../../lib/works';
import type { Copy } from './copy';

// ─── style helpers ─────────────────────────────────────────────────────────────

export function inputCls(extra = '') {
  return `rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-blue-deep)] ${extra}`;
}

export function labelCls() {
  return 'block text-xs font-medium text-slate-500 mb-0.5';
}

export const ADD_CHURCH_VALUE = '__add_church__';

// ─── date / quantity formatting ────────────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toDateInputValue(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  const date = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (date) return date[1];
  const month = trimmed.match(/^(\d{4}-\d{2})$/);
  return month ? `${month[1]}-01` : trimmed;
}

export function formatSacramentDate(value?: string) {
  const inputValue = toDateInputValue(value);
  const match = inputValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value?.trim() || '';

  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  const monthLabel = MONTH_LABELS[monthIndex];

  return monthLabel ? `${day}/${monthLabel}/${year}` : value?.trim() || '';
}

export function formatFeitioDate(item: SacramentItem) {
  const start = formatSacramentDate(item.feitioDate);
  const end = formatSacramentDate(item.feitioDateEnd);

  if (start && end && start !== end) {
    return `${start} → ${end}`;
  }

  return start || end || '—';
}

export function sortDateValue(value?: string) {
  return toDateInputValue(value) || '';
}

export function formatQuantity(value: number, unit: string) {
  return `${value.toFixed(2)} ${unit}`;
}

// ─── balances ──────────────────────────────────────────────────────────────────

export function buildBalanceByItem(transactions: SacramentTransaction[]) {
  return transactions.reduce((balances, tx) => {
    const current = balances.get(tx.itemId) ?? 0;
    balances.set(tx.itemId, current + (tx.type === 'entry' ? tx.quantity : -tx.quantity));
    return balances;
  }, new Map<string, number>());
}

export function getStockSummary(items: SacramentItem[], balanceByItem: Map<string, number>) {
  return items.reduce(
    (summary, item) => {
      const balance = balanceByItem.get(item.id) ?? 0;
      if (item.form === 'gel') {
        summary.kg += balance;
      } else {
        summary.liters += balance;
      }
      return summary;
    },
    { liters: 0, kg: 0 },
  );
}

export function getItemUnit(item: SacramentItem, copy: Copy) {
  return item.form === 'gel' ? copy.kg : copy.liters;
}

// ─── item (batch) form ─────────────────────────────────────────────────────────

export type ItemFormState = {
  degrees: number[];
  concentration: string;
  form: SacramentForm;
  originChurchId: string;
  responsiblePerson: string;
  feitioDate: string;
  notes: string;
};

export const initialItemForm: ItemFormState = {
  degrees: [],
  concentration: '',
  form: 'liquid',
  originChurchId: '',
  responsiblePerson: '',
  feitioDate: '',
  notes: '',
};

export const DEGREE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const CONCENTRATION_OPTIONS = ['1x1', '2x1', '3x1', '4x1', '5x1', '6x1', '7x1', '8x1', '9x1', '10x1'];

export function degreesToString(degrees: number[]): string {
  if (degrees.length === 0) return '';
  const sorted = [...degrees].sort((a, b) => a - b);
  return sorted.join('-');
}

export function degreesFromString(value: string): number[] {
  const seen = new Set<number>();
  value.match(/\d+/g)?.forEach(part => {
    const degree = Number(part);
    if (DEGREE_OPTIONS.includes(degree)) {
      seen.add(degree);
    }
  });
  return [...seen].sort((a, b) => a - b);
}

export function itemToItemForm(item: SacramentItem): ItemFormState {
  return {
    degrees: degreesFromString(item.degree),
    concentration: item.form === 'gel' ? 'gel' : item.concentration ?? '',
    form: item.form,
    originChurchId: item.originChurchId ?? '',
    responsiblePerson: item.responsiblePerson ?? '',
    feitioDate: toDateInputValue(item.feitioDate),
    notes: item.notes ?? '',
  };
}

export function buildItemPayload(itemForm: ItemFormState, stockId: string, churches: ChurchInfo[]): Omit<SacramentItem, 'id'> {
  const church = churches.find(c => c.id === itemForm.originChurchId);
  const form = itemForm.concentration === 'gel' ? 'gel' : itemForm.form;
  const concentration = form === 'gel'
    ? undefined
    : itemForm.concentration || undefined;

  return {
    stockId,
    degree: degreesToString(itemForm.degrees),
    concentration,
    form,
    originChurchId: itemForm.originChurchId || undefined,
    originChurchName: church?.name ?? undefined,
    responsiblePerson: itemForm.responsiblePerson || undefined,
    feitioDate: itemForm.feitioDate || undefined,
    feitioDateEnd: undefined,
    notes: itemForm.notes.trim(),
  };
}

export type SetItemField = <K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) => void;

// ─── stock form ────────────────────────────────────────────────────────────────

export type StockFormState = { name: string; location: string; notes: string };
export const initialStockForm: StockFormState = { name: '', location: '', notes: '' };

// ─── batch sorting ─────────────────────────────────────────────────────────────

export type BatchSortKey = 'casa' | 'date' | 'responsible' | 'degree' | 'concentration' | 'balance';
export type BatchSort = { key: BatchSortKey; direction: 'asc' | 'desc' };

export function sortText(value?: string) {
  return (value ?? '').trim().toLocaleLowerCase();
}

export function firstDegreeNumber(item: SacramentItem) {
  const match = item.degree.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function compareBatchItems(a: SacramentItem, b: SacramentItem, sort: BatchSort, balanceByItem: Map<string, number>) {
  let result = 0;

  switch (sort.key) {
    case 'casa':
      result = sortText(a.originChurchName).localeCompare(sortText(b.originChurchName));
      break;
    case 'date':
      result = sortDateValue(a.feitioDate).localeCompare(sortDateValue(b.feitioDate));
      break;
    case 'responsible':
      result = sortText(a.responsiblePerson).localeCompare(sortText(b.responsiblePerson));
      break;
    case 'degree':
      result = firstDegreeNumber(a) - firstDegreeNumber(b);
      break;
    case 'concentration':
      result = sortText(a.concentration ?? a.form).localeCompare(sortText(b.concentration ?? b.form));
      break;
    case 'balance':
      result = (balanceByItem.get(a.id) ?? 0) - (balanceByItem.get(b.id) ?? 0);
      break;
  }

  if (result === 0) {
    result = a.id.localeCompare(b.id);
  }

  return sort.direction === 'asc' ? result : -result;
}
