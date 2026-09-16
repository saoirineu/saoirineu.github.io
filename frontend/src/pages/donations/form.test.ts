import { describe, expect, it } from 'vitest';

import type { Donation } from '../../lib/donations';
import {
  buildDonationInput,
  donationToForm,
  donationYears,
  filterDonations,
  initialDonationForm,
  summarizeDonations,
  validateDonationForm,
  type DonationFormState
} from './form';

const today = '2026-09-16';

function makeForm(overrides: Partial<DonationFormState> = {}): DonationFormState {
  return {
    churchId: 'church-1',
    date: '2026-09-10',
    amount: '350,50',
    reason: 'feitio',
    recipient: ' ICEFLU — Céu do Mapiá ',
    method: 'bank-transfer',
    ...overrides
  };
}

function makeDonation(overrides: Partial<Donation> = {}): Donation {
  return {
    id: 'd1',
    churchId: 'church-1',
    churchName: 'Stella Azzurra',
    date: '2026-09-10',
    amount: 350.5,
    reason: 'feitio',
    recipient: 'ICEFLU — Céu do Mapiá',
    method: 'bank-transfer',
    receiptPath: 'churches/church-1/donations/d1/receipt-1-bonifico.pdf',
    receiptName: 'bonifico.pdf',
    reviewStatus: 'pre-approved',
    ...overrides
  };
}

describe('donation form validation', () => {
  it('accepts a complete donation with a receipt', () => {
    expect(validateDonationForm(makeForm(), { today, hasReceipt: true })).toEqual([]);
  });

  it('requires every field of the spec, including the receipt', () => {
    expect(validateDonationForm(initialDonationForm(), { today, hasReceipt: false })).toEqual([
      'church',
      'date',
      'amount',
      'reason',
      'recipient',
      'method',
      'receipt'
    ]);
  });

  it('rejects future dates and non-positive or malformed amounts', () => {
    expect(validateDonationForm(makeForm({ date: '2026-09-17' }), { today, hasReceipt: true })).toEqual(['dateInFuture']);
    expect(validateDonationForm(makeForm({ amount: '0' }), { today, hasReceipt: true })).toEqual(['amount']);
    expect(validateDonationForm(makeForm({ amount: '1.200,00' }), { today, hasReceipt: true })).toEqual(['amount']);
  });

  it('rejects a blank recipient', () => {
    expect(validateDonationForm(makeForm({ recipient: '   ' }), { today, hasReceipt: true })).toEqual(['recipient']);
  });
});

describe('donation payload', () => {
  it('parses the amount, trims the recipient, and records the receipt', () => {
    expect(buildDonationInput({
      form: makeForm(),
      churchName: 'Stella Azzurra',
      receipt: { path: 'churches/church-1/donations/d1/receipt-1-bonifico.pdf', name: 'bonifico.pdf' }
    })).toEqual({
      churchId: 'church-1',
      churchName: 'Stella Azzurra',
      date: '2026-09-10',
      amount: 350.5,
      reason: 'feitio',
      recipient: 'ICEFLU — Céu do Mapiá',
      method: 'bank-transfer',
      receiptPath: 'churches/church-1/donations/d1/receipt-1-bonifico.pdf',
      receiptName: 'bonifico.pdf'
    });
  });

  it('round-trips a saved donation through the form', () => {
    expect(donationToForm(makeDonation())).toEqual(makeForm({ amount: '350.5', recipient: 'ICEFLU — Céu do Mapiá' }));
  });
});

describe('donation list helpers', () => {
  const donations = [
    makeDonation({ id: 'a', date: '2026-09-10', amount: 350.5 }),
    makeDonation({ id: 'b', date: '2026-03-01', reason: 'membership', amount: 100, reviewStatus: 'reviewed' }),
    makeDonation({ id: 'c', date: '2025-12-20', reason: 'jurua', amount: 49.5, churchId: 'church-2' })
  ];

  it('totals by reason', () => {
    expect(summarizeDonations(donations)).toEqual({
      count: 3,
      total: 500,
      byReason: { feitio: 350.5, membership: 100, jurua: 49.5 }
    });
  });

  it('filters by church, status, year, and reason', () => {
    const ids = (filter: Parameters<typeof filterDonations>[1]) => filterDonations(donations, filter).map(donation => donation.id);
    expect(ids({ churchId: 'church-2', status: '', year: '', reason: '' })).toEqual(['c']);
    expect(ids({ churchId: '', status: 'pre-approved', year: '2026', reason: '' })).toEqual(['a']);
    expect(ids({ churchId: '', status: '', year: '', reason: 'membership' })).toEqual(['b']);
    expect(donationYears(donations)).toEqual(['2026', '2025']);
  });
});
