import { describe, expect, it } from 'vitest';

import type { SacramentItem, SacramentTransaction } from '../../lib/sacrament';
import type { ChurchInfo } from '../../lib/works';
import {
  buildBalanceByItem,
  buildItemPayload,
  compareBatchItems,
  degreesFromString,
  degreesToString,
  formatFeitioDate,
  formatSacramentDate,
  getStockSummary,
  itemToItemForm,
  toDateInputValue,
  type BatchSort,
  type ItemFormState,
} from './form';

function makeItem(overrides: Partial<SacramentItem> = {}): SacramentItem {
  return {
    id: 'item-1',
    stockId: 'stock-1',
    degree: '3',
    form: 'liquid',
    ...overrides,
  };
}

function makeTx(overrides: Partial<SacramentTransaction> = {}): SacramentTransaction {
  return {
    id: 'tx-1',
    itemId: 'item-1',
    stockId: 'stock-1',
    type: 'entry',
    date: '2026-01-01',
    quantity: 10,
    ...overrides,
  };
}

describe('degree helpers', () => {
  it('serializes sorted degrees joined by dashes', () => {
    expect(degreesToString([3, 1, 2])).toBe('1-2-3');
    expect(degreesToString([])).toBe('');
  });

  it('parses numbers, drops out-of-range values, dedupes and sorts', () => {
    expect(degreesFromString('3-1-2')).toEqual([1, 2, 3]);
    expect(degreesFromString('1-1-99-0')).toEqual([1]);
    expect(degreesFromString('none')).toEqual([]);
  });
});

describe('buildItemPayload', () => {
  const churches: ChurchInfo[] = [{ id: 'c1', name: 'Casa da Floresta' } as ChurchInfo];

  it('maps liquid batches with concentration and resolved church name', () => {
    const form: ItemFormState = {
      degrees: [2, 1],
      concentration: '3x1',
      form: 'liquid',
      originChurchId: 'c1',
      responsiblePerson: ' Padrinho ',
      feitioDate: '2026-03-10',
      notes: '  nota  ',
    };
    const payload = buildItemPayload(form, 'stock-9', churches);
    expect(payload).toMatchObject({
      stockId: 'stock-9',
      degree: '1-2',
      concentration: '3x1',
      form: 'liquid',
      originChurchId: 'c1',
      originChurchName: 'Casa da Floresta',
      feitioDate: '2026-03-10',
      notes: 'nota',
    });
  });

  it('forces gel form and clears concentration when concentration is gel', () => {
    const form: ItemFormState = {
      degrees: [],
      concentration: 'gel',
      form: 'liquid',
      originChurchId: '',
      responsiblePerson: '',
      feitioDate: '',
      notes: '',
    };
    const payload = buildItemPayload(form, 'stock-1', churches);
    expect(payload.form).toBe('gel');
    expect(payload.concentration).toBeUndefined();
    expect(payload.originChurchId).toBeUndefined();
    expect(payload.originChurchName).toBeUndefined();
  });
});

describe('itemToItemForm', () => {
  it('round-trips degrees and detects gel', () => {
    const form = itemToItemForm(makeItem({ degree: '1-3', form: 'gel', concentration: undefined }));
    expect(form.degrees).toEqual([1, 3]);
    expect(form.concentration).toBe('gel');
    expect(form.form).toBe('gel');
  });
});

describe('date formatting', () => {
  it('normalizes date inputs', () => {
    expect(toDateInputValue('2026-03-10T00:00:00')).toBe('2026-03-10');
    expect(toDateInputValue('2026-03')).toBe('2026-03-01');
    expect(toDateInputValue('  ')).toBe('');
  });

  it('formats and falls back gracefully', () => {
    expect(formatSacramentDate('2026-03-10')).toBe('10/Mar/2026');
    expect(formatSacramentDate('not a date')).toBe('not a date');
  });

  it('renders feitio single date and ranges', () => {
    expect(formatFeitioDate(makeItem({ feitioDate: '2026-03-10', feitioDateEnd: undefined }))).toBe('10/Mar/2026');
    expect(formatFeitioDate(makeItem({ feitioDate: '2026-03-10', feitioDateEnd: '2026-03-12' }))).toBe('10/Mar/2026 → 12/Mar/2026');
    expect(formatFeitioDate(makeItem({ feitioDate: undefined, feitioDateEnd: undefined }))).toBe('—');
  });
});

describe('balances', () => {
  it('nets entries against exits per item', () => {
    const balances = buildBalanceByItem([
      makeTx({ id: 't1', itemId: 'a', type: 'entry', quantity: 10 }),
      makeTx({ id: 't2', itemId: 'a', type: 'exit', quantity: 4 }),
      makeTx({ id: 't3', itemId: 'b', type: 'entry', quantity: 2 }),
    ]);
    expect(balances.get('a')).toBe(6);
    expect(balances.get('b')).toBe(2);
  });

  it('sums liquid balances as liters and gel as kg', () => {
    const items = [makeItem({ id: 'a', form: 'liquid' }), makeItem({ id: 'b', form: 'gel' })];
    const balances = new Map([['a', 6], ['b', 2]]);
    expect(getStockSummary(items, balances)).toEqual({ liters: 6, kg: 2 });
  });
});

describe('compareBatchItems', () => {
  const balances = new Map<string, number>();
  const a = makeItem({ id: 'a', degree: '2' });
  const b = makeItem({ id: 'b', degree: '5' });

  it('sorts ascending and descending by degree', () => {
    const asc: BatchSort = { key: 'degree', direction: 'asc' };
    const desc: BatchSort = { key: 'degree', direction: 'desc' };
    expect(compareBatchItems(a, b, asc, balances)).toBeLessThan(0);
    expect(compareBatchItems(a, b, desc, balances)).toBeGreaterThan(0);
  });

  it('breaks ties by id', () => {
    const sort: BatchSort = { key: 'degree', direction: 'asc' };
    const a2 = makeItem({ id: 'a', degree: '2' });
    const a3 = makeItem({ id: 'z', degree: '2' });
    expect(compareBatchItems(a2, a3, sort, balances)).toBeLessThan(0);
  });
});
