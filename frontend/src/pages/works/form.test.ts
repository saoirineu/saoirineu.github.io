import { describe, expect, it } from 'vitest';

import type { SacramentItem, SacramentStock } from '../../lib/sacrament';
import type { Work } from '../../lib/works';
import {
  availableForWork,
  buildWorkInput,
  filterWorks,
  initialWorkForm,
  parseCount,
  parseDecimal,
  sacramentItemLabel,
  stocksForChurch,
  summarizeWorks,
  validateWorkForm,
  whiteAttendees,
  workToForm,
  workTypeDisplay,
  workYears,
  type SacramentOption,
  type WorkFormState
} from './form';

const stock: SacramentStock = { id: 'stock-1', name: 'Stella Azzurra', churchId: 'church-1' };
const item: SacramentItem = {
  id: 'item-1',
  stockId: 'stock-1',
  degree: '2',
  concentration: '3x1',
  form: 'liquid',
  originChurchName: 'Céu do Mapiá',
  feitioDate: '2025-03-10'
};
const gel: SacramentItem = { id: 'item-gel', stockId: 'stock-1', degree: '1', form: 'gel' };
const options: SacramentOption[] = [
  { item, stock, balance: 4 },
  { item: gel, stock, balance: 1 }
];
const workTypes = [{ id: 'concentracao', label: 'Concentração (15 e 30)', category: 'official' as const, active: true }];

function makeForm(overrides: Partial<WorkFormState> = {}): WorkFormState {
  return {
    ...initialWorkForm('church-1'),
    date: '2026-09-15',
    workTypeId: 'concentracao',
    totalAttendees: '20',
    initiatedAttendees: '12',
    sacramentItemId: 'item-1',
    sacramentQuantity: '0,75',
    contributionsCollected: '400',
    icefluBrazilQuota: '120.50',
    ...overrides
  };
}

function makeWork(overrides: Partial<Work> = {}): Work {
  return {
    id: 'w1',
    churchId: 'church-1',
    churchName: 'Stella Azzurra',
    date: '2026-09-15',
    workTypeId: 'concentracao',
    workTypeLabel: 'Concentração (15 e 30)',
    attendees: { total: 20, initiated: 12 },
    sacrament: { stockId: 'stock-1', itemId: 'item-1', quantity: 0.75, unit: 'L' },
    contributions: { collected: 400, icefluBrazilQuota: 120.5 },
    reviewStatus: 'pre-approved',
    ...overrides
  };
}

describe('works form parsing', () => {
  it('accepts whole head counts only', () => {
    expect(parseCount('12')).toBe(12);
    expect(parseCount(' 0 ')).toBe(0);
    expect(parseCount('')).toBeNull();
    expect(parseCount('1.5')).toBeNull();
    expect(parseCount('-3')).toBeNull();
  });

  it('accepts decimal amounts with a dot or an Italian comma', () => {
    expect(parseDecimal('12,50')).toBe(12.5);
    expect(parseDecimal('12.5')).toBe(12.5);
    expect(parseDecimal('0')).toBe(0);
    expect(parseDecimal('1.234,50')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('')).toBeNull();
  });

  it('derives bianchi as total minus fardati', () => {
    expect(whiteAttendees({ totalAttendees: '20', initiatedAttendees: '12' })).toBe(8);
    expect(whiteAttendees({ totalAttendees: '20', initiatedAttendees: '20' })).toBe(0);
    expect(whiteAttendees({ totalAttendees: '5', initiatedAttendees: '6' })).toBeNull();
    expect(whiteAttendees({ totalAttendees: '', initiatedAttendees: '6' })).toBeNull();
  });
});

describe('works form validation', () => {
  const today = '2026-09-16';

  it('accepts a complete record, leaving place and hymnal optional', () => {
    expect(validateWorkForm(makeForm(), { today })).toEqual([]);
  });

  it('requires every field the spec does not mark optional', () => {
    expect(validateWorkForm(initialWorkForm(), { today })).toEqual([
      'church',
      'date',
      'workType',
      'totalAttendees',
      'initiatedAttendees',
      'sacramentItem',
      'sacramentQuantity',
      'contributionsCollected',
      'icefluBrazilQuota'
    ]);
  });

  it('records only works already held', () => {
    expect(validateWorkForm(makeForm({ date: '2026-09-17' }), { today })).toEqual(['dateInFuture']);
    expect(validateWorkForm(makeForm({ date: today }), { today })).toEqual([]);
  });

  it('asks for a description when the work type is "other"', () => {
    expect(validateWorkForm(makeForm({ workTypeId: 'other' }), { today })).toEqual(['workTypeOther']);
    expect(validateWorkForm(makeForm({ workTypeId: 'other', workTypeOther: 'Hinário' }), { today })).toEqual([]);
  });

  it('rejects more fardati than participants, and a zero Daime quantity', () => {
    expect(validateWorkForm(makeForm({ initiatedAttendees: '21' }), { today })).toEqual(['initiatedAboveTotal']);
    expect(validateWorkForm(makeForm({ sacramentQuantity: '0' }), { today })).toEqual(['sacramentQuantity']);
  });
});

describe('works payload', () => {
  it('resolves the batch, unit, and labels from the options', () => {
    const input = buildWorkInput({
      form: makeForm({ venueText: '  Casa  ', hymnalText: ' O Cruzeiro ' }),
      churchName: 'Stella Azzurra',
      workTypes,
      otherLabel: 'Altro',
      sacramentOptions: options
    });

    expect(input).toEqual({
      churchId: 'church-1',
      churchName: 'Stella Azzurra',
      date: '2026-09-15',
      workTypeId: 'concentracao',
      workTypeLabel: 'Concentração (15 e 30)',
      workTypeOther: undefined,
      venueText: 'Casa',
      hymnalText: 'O Cruzeiro',
      attendees: { total: 20, initiated: 12 },
      sacrament: {
        stockId: 'stock-1',
        itemId: 'item-1',
        itemLabel: 'Stella Azzurra · 2° grau · 3x1 · Céu do Mapiá · 10/Mar/2025',
        quantity: 0.75,
        unit: 'L'
      },
      contributions: { collected: 400, icefluBrazilQuota: 120.5 }
    });
  });

  it('books gel in kg', () => {
    const input = buildWorkInput({
      form: makeForm({ sacramentItemId: 'item-gel', sacramentQuantity: '0.2' }),
      churchName: 'Stella Azzurra',
      workTypes,
      otherLabel: 'Altro',
      sacramentOptions: options
    });
    expect(input.sacrament).toMatchObject({ itemId: 'item-gel', unit: 'kg', quantity: 0.2 });
  });

  it('stores the free-text description for "other" works', () => {
    const input = buildWorkInput({
      form: makeForm({ workTypeId: 'other', workTypeOther: ' Hinário da Madrinha ' }),
      churchName: 'Stella Azzurra',
      workTypes,
      otherLabel: 'Altro',
      sacramentOptions: options
    });
    expect(input).toMatchObject({ workTypeId: 'other', workTypeLabel: 'Altro', workTypeOther: 'Hinário da Madrinha' });
    expect(workTypeDisplay(input)).toBe('Hinário da Madrinha');
  });

  it('keeps the saved batch and label when they are no longer offered', () => {
    const existing = makeWork({
      workTypeId: 'retired-type',
      workTypeLabel: 'Tipo antigo',
      sacrament: { stockId: 'old-stock', itemId: 'old-item', itemLabel: 'Old batch', quantity: 1, unit: 'L' }
    });
    const input = buildWorkInput({
      form: { ...workToForm(existing), sacramentQuantity: '1,5' },
      churchName: 'Stella Azzurra',
      workTypes,
      otherLabel: 'Altro',
      sacramentOptions: options,
      existing
    });
    expect(input.workTypeLabel).toBe('Tipo antigo');
    expect(input.sacrament).toEqual({ stockId: 'old-stock', itemId: 'old-item', itemLabel: 'Old batch', quantity: 1.5, unit: 'L' });
  });

  it('round-trips a saved record through the form', () => {
    const work = makeWork({ venueText: 'Casa', hymnalText: 'O Cruzeiro' });
    expect(workToForm(work)).toEqual(makeForm({
      venueText: 'Casa',
      hymnalText: 'O Cruzeiro',
      sacramentQuantity: '0.75',
      icefluBrazilQuota: '120.5'
    }));
  });
});

describe('works Daime options', () => {
  it('offers only the stocks linked to the church', () => {
    const stocks: SacramentStock[] = [stock, { id: 'stock-2', name: 'Barcelona', churchId: 'church-2' }, { id: 'stock-3', name: 'Italia' }];
    expect(stocksForChurch(stocks, 'church-1').map(entry => entry.id)).toEqual(['stock-1']);
    expect(stocksForChurch(stocks, '')).toEqual([]);
  });

  it('adds the record\'s own exit back when editing it', () => {
    expect(availableForWork(options[0])).toBe(4);
    expect(availableForWork(options[0], makeWork())).toBe(4.75);
    expect(availableForWork(options[1], makeWork())).toBe(1);
  });

  it('labels a batch without optional details by stock and id', () => {
    expect(sacramentItemLabel({ id: 'x', stockId: 's', degree: '', form: 'liquid' }, { name: 'Italia' })).toBe('Italia · x');
  });
});

describe('works list helpers', () => {
  const works = [
    makeWork({ id: 'a', date: '2026-09-15', attendees: { total: 20, initiated: 12 } }),
    makeWork({
      id: 'b',
      date: '2025-12-15',
      churchId: 'church-2',
      reviewStatus: 'reviewed',
      sacrament: { stockId: 's', itemId: 'g', quantity: 0.25, unit: 'kg' },
      contributions: { collected: 100, icefluBrazilQuota: 30 }
    }),
    makeWork({ id: 'c', date: '2026-01-06', sacrament: undefined })
  ];

  it('totals participants, Daime by unit, and money', () => {
    expect(summarizeWorks(works)).toEqual({
      count: 3,
      attendees: 60,
      initiated: 36,
      liters: 0.75,
      kg: 0.25,
      collected: 900,
      icefluBrazilQuota: 271
    });
  });

  it('filters by church, review status, and year', () => {
    expect(filterWorks(works, { churchId: 'church-2', status: '', year: '' }).map(work => work.id)).toEqual(['b']);
    expect(filterWorks(works, { churchId: '', status: 'pre-approved', year: '2026' }).map(work => work.id)).toEqual(['a', 'c']);
    expect(workYears(works)).toEqual(['2026', '2025']);
  });
});
