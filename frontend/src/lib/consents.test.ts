import { describe, expect, it } from 'vitest';

import { consentRequired, type ConsentRecord } from './consents';

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
