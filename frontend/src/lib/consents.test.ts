import { describe, expect, it } from 'vitest';

import {
  consentFormUrl,
  consentFormVariant,
  consentRequired,
  consentValidUntil,
  eventConsentNeeded,
  majorityDate,
  signedAsMinor,
  type ConsentRecord
} from './consents';

const now = new Date('2026-06-18T12:00:00');

function monthsAgo(months: number): Date {
  const date = new Date(now);
  date.setMonth(date.getMonth() - months);
  return date;
}

function approved(approvedAt: Date | null): Pick<ConsentRecord, 'status' | 'approvedAt'> {
  return { status: 'approved', approvedAt };
}

describe('consentRequired', () => {
  it('requires consent when none exists', () => {
    expect(consentRequired([], now)).toBe(true);
  });

  it('requires consent when only pending/rejected exist (none approved)', () => {
    expect(consentRequired([{ status: 'pending', approvedAt: null }], now)).toBe(true);
    expect(consentRequired([{ status: 'rejected', approvedAt: monthsAgo(1) }], now)).toBe(true);
  });

  it('does not require consent when a fresh approval exists', () => {
    expect(consentRequired([approved(now)], now)).toBe(false);
    expect(consentRequired([approved(monthsAgo(11))], now)).toBe(false);
  });

  it('requires consent when the latest approval is older than 12 months', () => {
    expect(consentRequired([approved(monthsAgo(13))], now)).toBe(true);
  });

  it('treats exactly 12 months as still valid (not "more than" a year)', () => {
    expect(consentRequired([approved(monthsAgo(12))], now)).toBe(false);
  });

  it('uses the most recent approval among several', () => {
    expect(consentRequired([approved(monthsAgo(13)), approved(monthsAgo(1))], now)).toBe(false);
    expect(consentRequired([approved(monthsAgo(13)), approved(monthsAgo(14))], now)).toBe(true);
  });
});

describe('eventConsentNeeded', () => {
  describe("'standard' policy (default)", () => {
    it('behaves like consentRequired when not a novice', () => {
      expect(eventConsentNeeded('standard', false, [], now)).toBe(true);
      expect(eventConsentNeeded('standard', false, [approved(monthsAgo(1))], now)).toBe(false);
      expect(eventConsentNeeded('standard', false, [approved(monthsAgo(13))], now)).toBe(true);
    });

    it('always requires consent for a novice, even with a valid consent on file', () => {
      expect(eventConsentNeeded('standard', true, [approved(now)], now)).toBe(true);
    });

    it('defaults to standard when the policy is undefined', () => {
      expect(eventConsentNeeded(undefined, false, [], now)).toBe(true);
      expect(eventConsentNeeded(undefined, false, [approved(now)], now)).toBe(false);
    });
  });

  describe("'noviceOnly' policy (European Gathering)", () => {
    it('requires consent only for first-time participants', () => {
      expect(eventConsentNeeded('noviceOnly', true, [], now)).toBe(true);
      expect(eventConsentNeeded('noviceOnly', false, [], now)).toBe(false);
    });

    it('ignores the 12-month rule for non-novices', () => {
      // A non-novice with a lapsed (or absent) consent still does NOT need one.
      expect(eventConsentNeeded('noviceOnly', false, [approved(monthsAgo(13))], now)).toBe(false);
      expect(eventConsentNeeded('noviceOnly', false, [], now)).toBe(false);
    });
  });
});

// now is 2026-06-18: born 2008-06-18 turns 18 today, born 2008-06-19 tomorrow.
const TURNS_18_TOMORROW = '2008-06-19';
const TURNED_18_TODAY = '2008-06-18';

function approvedSent(uploadedAt: Date, approvedAt: Date): Pick<ConsentRecord, 'status' | 'approvedAt' | 'uploadedAt'> {
  return { status: 'approved', uploadedAt, approvedAt };
}

describe('majorityDate', () => {
  it('is the 18th birthday at local midnight', () => {
    expect(majorityDate('2008-06-19')).toEqual(new Date(2026, 5, 19));
  });

  it('is null for a missing, malformed or impossible date', () => {
    expect(majorityDate(undefined)).toBeNull();
    expect(majorityDate('')).toBeNull();
    expect(majorityDate('19/06/2008')).toBeNull();
    expect(majorityDate('2010-02-31')).toBeNull();
  });
});

describe('consentFormVariant', () => {
  it('asks for the minor form until the 18th birthday, and the adult form from that day', () => {
    expect(consentFormVariant(TURNS_18_TOMORROW, now)).toBe('minor');
    expect(consentFormVariant(TURNED_18_TODAY, now)).toBe('adult');
    expect(consentFormVariant('1970-01-01', now)).toBe('adult');
  });

  it('is null without a usable birth date, so both forms are offered', () => {
    expect(consentFormVariant(undefined, now)).toBeNull();
    expect(consentFormVariant('not a date', now)).toBeNull();
  });
});

describe('consentFormUrl', () => {
  it('points at the Storage copy for the variant and language', () => {
    expect(consentFormUrl('adult', 'it')).toContain('docs%2Ficeflu-consenso-informato-adulti-it.pdf');
    expect(consentFormUrl('minor', 'pt')).toContain('docs%2Ficeflu-consenso-informato-minori-pt.pdf');
  });
});

describe('minor consents end at majority', () => {
  it('recognises a consent sent before the 18th birthday', () => {
    expect(signedAsMinor({ uploadedAt: monthsAgo(2), approvedAt: monthsAgo(1) }, TURNED_18_TODAY)).toBe(true);
    expect(signedAsMinor({ uploadedAt: now, approvedAt: now }, TURNED_18_TODAY)).toBe(false);
    expect(signedAsMinor({ uploadedAt: monthsAgo(2), approvedAt: monthsAgo(1) }, undefined)).toBe(false);
  });

  it('judges by when it was sent, not approved', () => {
    const sentAsMinorApprovedAsAdult = approvedSent(monthsAgo(1), now);
    expect(consentValidUntil([sentAsMinorApprovedAsAdult], TURNED_18_TODAY)).toEqual(new Date(2026, 5, 18));
  });

  it('caps the 12 months at the 18th birthday', () => {
    const consent = approvedSent(monthsAgo(2), monthsAgo(2));
    expect(consentValidUntil([consent], TURNS_18_TOMORROW)).toEqual(new Date(2026, 5, 19));
    expect(consentRequired([consent], now, TURNS_18_TOMORROW)).toBe(false);
    expect(consentRequired([consent], now, TURNED_18_TODAY)).toBe(true);
  });

  it('keeps the 12 months when majority comes later', () => {
    const consent = approvedSent(monthsAgo(2), monthsAgo(2));
    expect(consentValidUntil([consent], '2012-01-01')).toEqual(monthsAgo(-10));
  });

  it('leaves adults and unknown birth dates on the plain 12 months', () => {
    const consent = approvedSent(monthsAgo(2), monthsAgo(2));
    expect(consentValidUntil([consent], '1980-05-05')).toEqual(monthsAgo(-10));
    expect(consentValidUntil([consent])).toEqual(monthsAgo(-10));
  });

  it('lets a later adult consent count after a minor one lapsed', () => {
    const asMinor = approvedSent(monthsAgo(3), monthsAgo(3));
    const asAdult = approvedSent(now, now);
    expect(consentRequired([asMinor, asAdult], now, TURNED_18_TODAY)).toBe(false);
  });

  it('applies to events under the standard policy', () => {
    const consent = approvedSent(monthsAgo(2), monthsAgo(2));
    expect(eventConsentNeeded('standard', false, [consent], now, TURNED_18_TODAY)).toBe(true);
    expect(eventConsentNeeded('standard', false, [consent], now, '1980-05-05')).toBe(false);
  });
});
