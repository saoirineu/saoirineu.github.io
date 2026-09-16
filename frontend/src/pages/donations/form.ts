import {
  DONATION_METHODS,
  DONATION_REASONS,
  type Donation,
  type DonationInput,
  type DonationMethod,
  type DonationReason
} from '../../lib/donations';
import { parseDecimal } from '../works/form';

// ─── form state ────────────────────────────────────────────────────────────────

export type DonationFormState = {
  churchId: string;
  date: string;
  amount: string;
  reason: DonationReason | '';
  recipient: string;
  method: DonationMethod | '';
};

export function initialDonationForm(churchId = ''): DonationFormState {
  return { churchId, date: '', amount: '', reason: '', recipient: '', method: '' };
}

export function donationToForm(donation: Donation): DonationFormState {
  return {
    churchId: donation.churchId,
    date: donation.date,
    amount: String(donation.amount),
    reason: donation.reason,
    recipient: donation.recipient,
    method: donation.method
  };
}

// ─── validation ────────────────────────────────────────────────────────────────

export type DonationFormError =
  | 'church'
  | 'date'
  | 'dateInFuture'
  | 'amount'
  | 'reason'
  | 'recipient'
  | 'method'
  | 'receipt';

/** `hasReceipt`: a new file is chosen, or the donation being edited already has one. */
export function validateDonationForm(
  form: DonationFormState,
  options: { today: string; hasReceipt: boolean }
): DonationFormError[] {
  const errors: DonationFormError[] = [];
  if (!form.churchId) errors.push('church');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
    errors.push('date');
  } else if (form.date > options.today) {
    errors.push('dateInFuture');
  }

  const amount = parseDecimal(form.amount);
  if (amount === null || amount <= 0) errors.push('amount');
  if (!DONATION_REASONS.includes(form.reason as DonationReason)) errors.push('reason');
  if (!form.recipient.trim()) errors.push('recipient');
  if (!DONATION_METHODS.includes(form.method as DonationMethod)) errors.push('method');
  if (!options.hasReceipt) errors.push('receipt');

  return errors;
}

// ─── payload ───────────────────────────────────────────────────────────────────

/** Builds the record from a form that passed validateDonationForm. */
export function buildDonationInput(args: {
  form: DonationFormState;
  churchName: string;
  receipt: { path: string; name: string };
}): DonationInput {
  const { form, churchName, receipt } = args;
  return {
    churchId: form.churchId,
    churchName,
    date: form.date,
    amount: parseDecimal(form.amount) ?? 0,
    reason: form.reason as DonationReason,
    recipient: form.recipient.trim(),
    method: form.method as DonationMethod,
    receiptPath: receipt.path,
    receiptName: receipt.name
  };
}

// ─── list ──────────────────────────────────────────────────────────────────────

export type DonationFilter = {
  churchId: string;
  status: '' | Donation['reviewStatus'];
  year: string;
  reason: '' | DonationReason;
};

export const initialDonationFilter: DonationFilter = { churchId: '', status: '', year: '', reason: '' };

export function filterDonations(donations: readonly Donation[], filter: DonationFilter) {
  return donations.filter(donation =>
    (!filter.churchId || donation.churchId === filter.churchId)
    && (!filter.status || donation.reviewStatus === filter.status)
    && (!filter.year || donation.date.startsWith(`${filter.year}-`))
    && (!filter.reason || donation.reason === filter.reason)
  );
}

export function donationYears(donations: readonly Donation[]) {
  return [...new Set(donations.map(donation => donation.date.slice(0, 4)).filter(year => /^\d{4}$/.test(year)))].sort().reverse();
}

export type DonationTotals = {
  count: number;
  total: number;
  byReason: Record<DonationReason, number>;
};

export function summarizeDonations(donations: readonly Donation[]): DonationTotals {
  const byReason: Record<DonationReason, number> = { feitio: 0, membership: 0, jurua: 0 };
  let total = 0;
  for (const donation of donations) {
    byReason[donation.reason] += donation.amount;
    total += donation.amount;
  }
  return { count: donations.length, total, byReason };
}
