import { describe, expect, it } from 'vitest';

import { consentRequired, eventConsentNeeded, type ConsentRecord } from './consents';

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
