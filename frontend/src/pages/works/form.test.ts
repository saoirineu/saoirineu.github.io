import { describe, expect, it } from 'vitest';

import { DEFAULT_ICEFLU_QUOTA } from '../../lib/icefluQuota';
import type { SacramentItem, SacramentStock } from '../../lib/sacrament';
import type { Work } from '../../lib/works';
import {
  availableForWork,
  buildWorkInput,
  computeWorkQuota,
  filterWorks,
  formWorkQuota,
  initialWorkForm,
  isOfficialCalendar,
  parseCount,
  parseDecimal,
  parseQuotaRates,
  sacramentItemLabel,
  stocksForChurch,
  summarizeWorks,
  validateWorkForm,
  whiteAttendees,
  workQuota,
  workToForm,
  workTypeDisplay,
  workYears,
  type SacramentOption,
  type WorkFormState
} from './form';

const stock: SacramentStock = { id: 'stock-1', name: 'Stella Azzurra', churchIds: ['church-1'] };
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
const workTypes = [
  { id: 'concentracao', label: 'Concentração (15 e 30)', category: 'official' as const, active: true },
  { id: 'cura', label: 'Trabalho de Cura', category: 'other' as const, active: true }
];
const rates = DEFAULT_ICEFLU_QUOTA;

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
    venueCost: '100',
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
    officialCalendar: true,
    attendees: { total: 20, initiated: 12 },
    sacrament: { stockId: 'stock-1', itemId: 'item-1', quantity: 0.75, unit: 'L' },
    contributions: { collected: 400, venueCost: 100 },
    icefluQuota: { sharePercent: 50, minimumPerPerson: 25 },
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

  it('derives visitors as total minus ICEFLU members', () => {
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
      'venueCost'
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

  it('rejects more ICEFLU members than participants, and a zero Daime quantity', () => {
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
      sacramentOptions: options,
      rates
    });

    expect(input).toEqual({
      churchId: 'church-1',
      churchName: 'Stella Azzurra',
      date: '2026-09-15',
      workTypeId: 'concentracao',
      workTypeLabel: 'Concentração (15 e 30)',
      workTypeOther: undefined,
      officialCalendar: true,
      venueText: 'Casa',
      hymnalText: 'O Cruzeiro',
      attendees: { total: 20, initiated: 12 },
      sacrament: {
        stockId: 'stock-1',
        itemId: 'item-1',
        itemLabel: 'Stella Azzurra · 2° grau · 3x1 · Céu do Mapiá · 2025-03-10',
        quantity: 0.75,
        unit: 'L'
      },
      contributions: { collected: 400, venueCost: 100 },
      icefluQuota: { sharePercent: 50, minimumPerPerson: 25 }
    });
  });

  it('books gel in kg', () => {
    const input = buildWorkInput({
      form: makeForm({ sacramentItemId: 'item-gel', sacramentQuantity: '0.2' }),
      churchName: 'Stella Azzurra',
      workTypes,
      otherLabel: 'Altro',
      sacramentOptions: options,
      rates
    });
    expect(input.sacrament).toMatchObject({ itemId: 'item-gel', unit: 'kg', quantity: 0.2 });
  });

  it('stores the free-text description for "other" works', () => {
    const input = buildWorkInput({
      form: makeForm({ workTypeId: 'other', workTypeOther: ' Hinário da Madrinha ' }),
      churchName: 'Stella Azzurra',
      workTypes,
      otherLabel: 'Altro',
      sacramentOptions: options,
      rates
    });
    expect(input).toMatchObject({
      workTypeId: 'other',
      workTypeLabel: 'Altro',
      workTypeOther: 'Hinário da Madrinha',
      officialCalendar: false
    });
    expect(workTypeDisplay(input)).toBe('Hinário da Madrinha');
  });

  it('places the work in or outside the official calendar by its type\'s group', () => {
    expect(isOfficialCalendar('concentracao', workTypes)).toBe(true);
    expect(isOfficialCalendar('cura', workTypes)).toBe(false);
    expect(isOfficialCalendar('other', workTypes)).toBe(false);
    // A type removed from the catalog keeps what the record was saved with.
    expect(isOfficialCalendar('retired', workTypes, { workTypeId: 'retired', officialCalendar: true })).toBe(true);
    expect(isOfficialCalendar('retired', workTypes)).toBe(false);
  });

  it('gives a new record the rates in force, while a saved one keeps its own', () => {
    const newer = { sharePercent: 40, minimumPerPerson: 30 };
    const fresh = buildWorkInput({ form: makeForm(), churchName: 'Stella Azzurra', workTypes, otherLabel: 'Altro', sacramentOptions: options, rates: newer });
    expect(fresh.icefluQuota).toEqual(newer);

    const existing = makeWork();
    const edited = buildWorkInput({
      form: workToForm(existing),
      churchName: 'Stella Azzurra',
      workTypes,
      otherLabel: 'Altro',
      sacramentOptions: options,
      rates: newer,
      existing
    });
    expect(edited.icefluQuota).toEqual({ sharePercent: 50, minimumPerPerson: 25 });
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
      rates,
      existing
    });
    expect(input.workTypeLabel).toBe('Tipo antigo');
    expect(input.officialCalendar).toBe(true);
    expect(input.sacrament).toEqual({ stockId: 'old-stock', itemId: 'old-item', itemLabel: 'Old batch', quantity: 1.5, unit: 'L' });
  });

  it('round-trips a saved record through the form', () => {
    const work = makeWork({ venueText: 'Casa', hymnalText: 'O Cruzeiro' });
    expect(workToForm(work)).toEqual(makeForm({
      venueText: 'Casa',
      hymnalText: 'O Cruzeiro',
      sacramentQuantity: '0.75'
    }));
  });
});

describe('works ICEFLU quota', () => {
  const base = { collected: 400, venueCost: 100, total: 20, initiated: 12, officialCalendar: true, rates };

  it('owes the share of the net contributions when it is above the minimum', () => {
    expect(computeWorkQuota({ ...base, collected: 1000, venueCost: 200 })).toEqual({
      net: 800,
      share: 400,
      counted: 8,
      minimum: 200,
      owed: 400
    });
  });

  it('owes the minimum per visitor when the share falls below it', () => {
    expect(computeWorkQuota(base)).toEqual({ net: 300, share: 150, counted: 8, minimum: 200, owed: 200 });
  });

  it('counts every participant for works outside the official calendar', () => {
    expect(computeWorkQuota({ ...base, officialCalendar: false })).toMatchObject({ counted: 20, minimum: 500, owed: 500 });
  });

  it('owes no share when the venue cost more than was collected', () => {
    expect(computeWorkQuota({ ...base, collected: 100, venueCost: 300, total: 10, initiated: 10 })).toEqual({
      net: -200,
      share: 0,
      counted: 0,
      minimum: 0,
      owed: 0
    });
  });

  it('rounds the share to the cent', () => {
    const quota = computeWorkQuota({ ...base, collected: 255.5, venueCost: 0, initiated: 20, rates: { sharePercent: 12.5, minimumPerPerson: 25 } });
    expect(quota).toMatchObject({ share: 31.94, owed: 31.94 });
  });

  it('reads a saved record with the rates it keeps', () => {
    expect(workQuota(makeWork())).toMatchObject({ net: 300, owed: 200 });
    expect(workQuota(makeWork({ icefluQuota: { sharePercent: 100, minimumPerPerson: 0 } }))).toMatchObject({ share: 300, owed: 300 });
  });

  it('previews the complete quota when the form figures are valid', () => {
    expect(formWorkQuota(makeForm(), true, rates)).toEqual({ net: 300, share: 150, counted: 8, minimum: 200, owed: 200 });
  });

  it('shows net contributions and the share before participant counts are entered', () => {
    const form = { ...initialWorkForm(), contributionsCollected: '1000', venueCost: '100' };
    expect(formWorkQuota(form, true, rates)).toEqual({ net: 900, share: 450, counted: null, minimum: null, owed: null });
    expect(formWorkQuota(form, null, rates)).toEqual({ net: 900, share: 450, counted: null, minimum: null, owed: null });
  });

  it('uses the supplied rates for independently available calculations', () => {
    const customRates = { sharePercent: 40, minimumPerPerson: 30 };
    expect(formWorkQuota(makeForm({ totalAttendees: '', initiatedAttendees: '' }), true, customRates))
      .toEqual({ net: 300, share: 120, counted: null, minimum: null, owed: null });
    expect(formWorkQuota(makeForm({ venueCost: '' }), true, customRates))
      .toEqual({ net: null, share: null, counted: 8, minimum: 240, owed: null });
  });

  it.each([
    { venueCost: '' },
    { contributionsCollected: 'invalid' },
    { venueCost: '-1' }
  ])('keeps the minimum visible while monetary input is incomplete or invalid: %j', overrides => {
    expect(formWorkQuota(makeForm(overrides), true, rates))
      .toEqual({ net: null, share: null, counted: 8, minimum: 200, owed: null });
  });

  it('waits for the work calendar classification before calculating the minimum', () => {
    expect(formWorkQuota(makeForm(), null, rates))
      .toEqual({ net: 300, share: 150, counted: null, minimum: null, owed: null });
  });

  it.each(['', 'invalid', '21'])('counts all participants outside the official calendar regardless of member input: %j', initiatedAttendees => {
    expect(formWorkQuota(makeForm({ initiatedAttendees }), false, rates))
      .toEqual({ net: 300, share: 150, counted: 20, minimum: 500, owed: 500 });
  });

  it('requires a valid total outside the official calendar and accepts zero participants', () => {
    expect(formWorkQuota(makeForm({ totalAttendees: '' }), false, rates))
      .toEqual({ net: 300, share: 150, counted: null, minimum: null, owed: null });
    expect(formWorkQuota(makeForm({ totalAttendees: '0', initiatedAttendees: '' }), false, rates))
      .toEqual({ net: 300, share: 150, counted: 0, minimum: 0, owed: 150 });
  });

  it.each([
    { totalAttendees: '' },
    { totalAttendees: 'invalid' },
    { initiatedAttendees: '' },
    { initiatedAttendees: 'invalid' },
    { initiatedAttendees: '21' }
  ])('keeps monetary calculations visible while official-calendar counts are incomplete or invalid: %j', overrides => {
    expect(formWorkQuota(makeForm(overrides), true, rates))
      .toEqual({ net: 300, share: 150, counted: null, minimum: null, owed: null });
  });

  it('accepts admin rates up to 100% with a minimum amount', () => {
    expect(parseQuotaRates('50', '25')).toEqual({ sharePercent: 50, minimumPerPerson: 25 });
    expect(parseQuotaRates('12,5', '0')).toEqual({ sharePercent: 12.5, minimumPerPerson: 0 });
    expect(parseQuotaRates('101', '25')).toBeNull();
    expect(parseQuotaRates('', '25')).toBeNull();
    expect(parseQuotaRates('50', 'venti')).toBeNull();
  });
});

describe('works Daime options', () => {
  it('offers only the stocks linked to the church, including shared ones', () => {
    const stocks: SacramentStock[] = [
      stock,
      { id: 'stock-2', name: 'Barcelona', churchIds: ['church-2'] },
      { id: 'stock-3', name: 'Italia' },
      { id: 'stock-4', name: 'Deposito nazionale', churchIds: ['church-2', 'church-1'] }
    ];
    expect(stocksForChurch(stocks, 'church-1').map(entry => entry.id)).toEqual(['stock-1', 'stock-4']);
    expect(stocksForChurch(stocks, 'church-2').map(entry => entry.id)).toEqual(['stock-2', 'stock-4']);
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
      contributions: { collected: 100, venueCost: 0 }
    }),
    makeWork({ id: 'c', date: '2026-01-06', sacrament: undefined })
  ];

  it('totals participants, Daime by unit, and money', () => {
    // Each record owes the €200 minimum (8 visitors): a and c net 300, b nets 100.
    expect(summarizeWorks(works)).toEqual({
      count: 3,
      attendees: 60,
      initiated: 36,
      liters: 0.75,
      kg: 0.25,
      collected: 900,
      net: 700,
      quota: 600
    });
  });

  it('filters by church, review status, and year', () => {
    expect(filterWorks(works, { churchId: 'church-2', status: '', year: '' }).map(work => work.id)).toEqual(['b']);
    expect(filterWorks(works, { churchId: '', status: 'pre-approved', year: '2026' }).map(work => work.id)).toEqual(['a', 'c']);
    expect(workYears(works)).toEqual(['2026', '2025']);
  });
});
