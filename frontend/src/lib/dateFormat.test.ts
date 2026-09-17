import { describe, expect, it } from 'vitest';

import { datePlaceholder, formatDate, formatDateTime, formatIsoDate, formatIsoDatesInText } from './dateFormat';

describe('formatIsoDate', () => {
  it('puts the day first in Portuguese, Spanish and Italian', () => {
    expect(formatIsoDate('2026-09-17', 'pt')).toBe('17/set/2026');
    expect(formatIsoDate('2026-01-05', 'es')).toBe('05/ene/2026');
    expect(formatIsoDate('2026-06-30', 'it')).toBe('30/giu/2026');
  });

  it('puts the month first in English', () => {
    expect(formatIsoDate('2026-09-17', 'en')).toBe('Sep/17/2026');
  });

  it('uses three-letter month names in every language', () => {
    expect(formatIsoDate('2026-09-01', 'es')).toBe('01/sep/2026');
  });

  it('leaves values that are not a calendar date alone', () => {
    expect(formatIsoDate('', 'pt')).toBe('');
    expect(formatIsoDate(undefined, 'pt')).toBe('');
    expect(formatIsoDate(' 1980 ', 'pt')).toBe('1980');
    expect(formatIsoDate('2026-13-01', 'pt')).toBe('2026-13-01');
    expect(formatIsoDate('2026-09-25T19:00', 'pt')).toBe('2026-09-25T19:00');
  });
});

describe('formatIsoDatesInText', () => {
  it('formats the dates inside a label and keeps the rest', () => {
    expect(formatIsoDatesInText('Stella · 3x1 · 2026-03-10 → 2026-03-12', 'it')).toBe('Stella · 3x1 · 10/mar/2026 → 12/mar/2026');
    expect(formatIsoDatesInText(undefined, 'en')).toBe('');
  });
});

describe('formatDate', () => {
  it('uses the local calendar day of an instant', () => {
    const date = new Date(2026, 2, 4, 23, 30);
    expect(formatDate(date, 'it')).toBe('04/mar/2026');
    expect(formatDate(date.getTime(), 'en')).toBe('Mar/04/2026');
  });

  it('returns an empty string for an invalid instant', () => {
    expect(formatDate('not a date', 'pt')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('follows the date with the time of day in the language convention', () => {
    const date = new Date(2026, 8, 17, 14, 5);
    expect(formatDateTime(date, 'pt')).toBe('17/set/2026 14:05');
    expect(formatDateTime(date, 'en')).toMatch(/^Sep\/17\/2026 2:05\sPM$/);
  });
});

describe('datePlaceholder', () => {
  it('matches the order of the formatted date', () => {
    expect(datePlaceholder('en')).toBe('MMM/DD/YYYY');
    expect(datePlaceholder('it')).toBe('GG/MMM/AAAA');
  });
});
