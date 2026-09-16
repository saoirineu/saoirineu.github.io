import { describe, expect, it } from 'vitest';

import { DEFAULT_WORK_TYPES, OTHER_WORK_TYPE_ID, newWorkTypeId, normalizeWorkTypes } from './workTypes';

describe('work type catalog', () => {
  it('ships a draft with unique ids and no reserved "other" entry', () => {
    const ids = DEFAULT_WORK_TYPES.map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(OTHER_WORK_TYPE_ID);
    expect(normalizeWorkTypes(DEFAULT_WORK_TYPES)).toEqual(DEFAULT_WORK_TYPES);
  });

  it('drops blank, duplicate, and reserved entries and fills defaults', () => {
    expect(normalizeWorkTypes([
      { id: 'cura', label: ' Trabalho de Cura ', category: 'other' },
      { id: 'cura', label: 'Duplicate', category: 'official' },
      { id: 'other', label: 'Reserved' },
      { label: 'São João', active: false },
      { id: 'x', label: '   ' },
      'garbage'
    ])).toEqual([
      { id: 'cura', label: 'Trabalho de Cura', category: 'other', active: true },
      { id: 'sao-joao', label: 'São João', category: 'official', active: false }
    ]);
    expect(normalizeWorkTypes(undefined)).toEqual([]);
  });

  it('derives new ids from the label without colliding', () => {
    const existing = [{ id: 'mesa-branca', label: 'Mesa Branca', category: 'other' as const, active: true }];
    expect(newWorkTypeId('Hinário de Natal', existing)).toBe('hinario-de-natal');
    expect(newWorkTypeId('Mesa Branca', existing)).toBe('mesa-branca-2');
    expect(newWorkTypeId('Other', existing)).toBe('other-2');
    expect(newWorkTypeId('!!!', existing)).toBe('lavoro');
  });
});
