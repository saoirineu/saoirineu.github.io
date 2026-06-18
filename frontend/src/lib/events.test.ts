import { describe, expect, it } from 'vitest';

import { slugify, validateEventInput, type EventInput } from './events';

function baseInput(overrides: Partial<EventInput> = {}): EventInput {
  return {
    title: { pt: 'Encontro', en: 'Gathering', es: '', it: '' },
    slug: 'encontro-2026',
    status: 'draft',
    kind: 'multi',
    capacityMode: 'total',
    totalSlots: 80,
    cautionDepositRate: 0.3,
    payment: {},
    works: [{ id: 'w1', label: { pt: '', en: 'Work', es: '', it: '' }, dateTime: '2026-09-25T19:00' }],
    pricing: {
      lodgingNightRate: 70,
      mealsNightRate: 30,
      extraLinen: 20,
      worksByCount: { anyone: [0, 100], initiated: [0, 80], iceflu: [0, 60] }
    },
    ...overrides
  };
}

describe('slugify', () => {
  it('lowercases, strips accents, and dashes separators', () => {
    expect(slugify('Encontro Europeu 2026!')).toBe('encontro-europeu-2026');
    expect(slugify('Reunião de Concentração')).toBe('reuniao-de-concentracao');
    expect(slugify('  multiple   spaces  ')).toBe('multiple-spaces');
  });
});

describe('validateEventInput', () => {
  it('accepts a well-formed event', () => {
    expect(validateEventInput(baseInput())).toBeNull();
  });

  it('rejects a fully empty title', () => {
    expect(validateEventInput(baseInput({ title: { pt: '', en: '', es: '', it: '' } }))).toBe('title');
  });

  it('rejects a non-slug slug', () => {
    expect(validateEventInput(baseInput({ slug: 'Encontro 2026' }))).toBe('slug');
  });

  it('validates total capacity', () => {
    expect(validateEventInput(baseInput({ capacityMode: 'total', totalSlots: 0 }))).toBe('capacity');
  });

  it('validates room capacity', () => {
    expect(validateEventInput(baseInput({ capacityMode: 'rooms', totalSlots: undefined, rooms: [] }))).toBe('capacity');
    expect(
      validateEventInput(baseInput({ capacityMode: 'rooms', totalSlots: undefined, rooms: [{ name: 'A', capacity: 6 }] }))
    ).toBeNull();
  });

  it('validates the caution deposit range', () => {
    expect(validateEventInput(baseInput({ cautionDepositRate: 1.5 }))).toBe('cautionDepositRate');
    expect(validateEventInput(baseInput({ cautionDepositRate: -0.1 }))).toBe('cautionDepositRate');
  });

  it('requires at least one work and exactly one for single-work events', () => {
    expect(validateEventInput(baseInput({ works: [] }))).toBe('works');
    expect(
      validateEventInput(
        baseInput({
          kind: 'single',
          works: [
            { id: 'a', label: { pt: '', en: 'A', es: '', it: '' }, dateTime: '2026-09-25T19:00' },
            { id: 'b', label: { pt: '', en: 'B', es: '', it: '' }, dateTime: '2026-09-26T19:00' }
          ]
        })
      )
    ).toBe('works');
    expect(validateEventInput(baseInput({ kind: 'single' }))).toBeNull();
  });
});
