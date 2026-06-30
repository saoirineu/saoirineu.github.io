import { describe, expect, it } from 'vitest';

import {
  birthPlaceOptions,
  countryName,
  findCountryCode,
  findLocationCode,
  ITALIAN_REFERENCE_CHURCHES,
  provinceOptions
} from './profileCatalog';

describe('profile catalog helpers', () => {
  it('localizes and resolves country names', () => {
    expect(countryName('IT', 'it')).toMatch(/Italia/i);
    expect(findCountryCode('Brasil', 'pt')).toBe('BR');
    expect(findCountryCode('Italy', 'en')).toBe('IT');
  });

  it('returns province and birthplace suggestions for Brazil and Italy', () => {
    expect(findLocationCode('São Paulo', provinceOptions('BR'))).toBe('SP');
    expect(findLocationCode('Roma', provinceOptions('IT'))).toBe('RM');
    expect(birthPlaceOptions('BR', 'SP').some(option => option.name === 'São Paulo')).toBe(true);
    expect(birthPlaceOptions('IT', 'RM').some(option => option.name === 'Roma')).toBe(true);
  });

  it('catalogues the Italian reference centers', () => {
    expect(ITALIAN_REFERENCE_CHURCHES.map(church => church.name)).toEqual([
      'Casa Regina della Pace',
      'Stella Azzurra',
      'Casa Maria delle Rose',
      'Luce di Misericordia',
      "Estrela d'Oriente",
      'Leone Bianco',
      'Céu do Panda'
    ]);
    expect(ITALIAN_REFERENCE_CHURCHES.every(church => church.country === 'Italy')).toBe(true);
  });
});
