import type { ReactNode } from 'react';

import { FileUploadField } from '../../components/FileUploadField';
import { UserDocumentLink } from '../../components/UserDocumentLink';
import {
  DONATION_METHODS,
  DONATION_REASONS,
  type Donation,
  type DonationMethod,
  type DonationReason
} from '../../lib/donations';
import type { FileUploadLabels } from '../../lib/fileUploadLabels';
import { uploadAccept } from '../../lib/uploads';
import type { WorkReviewStatus } from '../../lib/works';
import type { ChurchOption } from '../../providers/useChurchRecordAccess';
import { formatSacramentDate, inputCls, labelCls } from '../sacrament/form';
import { formatEuro } from '../works/form';
import type { DonationsCopy } from './copy';
import {
  donationYears,
  filterDonations,
  summarizeDonations,
  type DonationFilter,
  type DonationFormError,
  type DonationFormState
} from './form';

function errorCls(hasError: boolean) {
  return hasError ? 'border-red-300 ring-1 ring-red-200' : '';
}

function FieldError({ copy, errors, keys }: { copy: DonationsCopy; errors: DonationFormError[]; keys: DonationFormError[] }) {
  const found = keys.find(key => errors.includes(key));
  return found ? <p className="mt-0.5 text-xs text-red-600">{copy.errors[found]}</p> : null;
}

// ─── form ──────────────────────────────────────────────────────────────────────

type DonationFormProps = {
  copy: DonationsCopy;
  uploadLabels: FileUploadLabels;
  form: DonationFormState;
  setField: <K extends keyof DonationFormState>(key: K, value: DonationFormState[K]) => void;
  receiptFile: File | null;
  setReceiptFile: (file: File | null) => void;
  errors: DonationFormError[];
  churchOptions: ChurchOption[];
  editing: Donation | null;
  today: string;
  saving: boolean;
  saveError: boolean;
  saved: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

export function DonationForm({
  copy,
  uploadLabels,
  form,
  setField,
  receiptFile,
  setReceiptFile,
  errors,
  churchOptions,
  editing,
  today,
  saving,
  saveError,
  saved,
  onSubmit,
  onCancel
}: DonationFormProps) {
  const has = (...keys: DonationFormError[]) => keys.some(key => errors.includes(key));
  const receiptLabel = form.method ? copy.receipt[form.method] : copy.receiptPending;

  return (
    <form
      noValidate
      className="space-y-4 rounded-xl border border-[color:var(--brand-sand)] bg-white p-4 shadow-sm"
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h2 className="text-base font-semibold text-[color:var(--brand-ink)]">
        {editing ? copy.editDonation : copy.newDonation}
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls()} htmlFor="donation-church">{copy.church}</label>
          <select
            id="donation-church"
            className={inputCls(`w-full ${errorCls(has('church'))}`)}
            value={form.churchId}
            // The receipt folder belongs to the church, so a saved donation cannot move.
            disabled={!!editing || churchOptions.length === 1}
            onChange={event => setField('churchId', event.target.value)}
          >
            <option value="">{copy.selectChurch}</option>
            {churchOptions.map(church => <option key={church.id} value={church.id}>{church.name}</option>)}
          </select>
          <FieldError copy={copy} errors={errors} keys={['church']} />
        </div>
        <div>
          <label className={labelCls()} htmlFor="donation-date">{copy.date}</label>
          <input
            id="donation-date"
            type="date"
            max={today}
            className={inputCls(`w-full ${errorCls(has('date', 'dateInFuture'))}`)}
            value={form.date}
            onChange={event => setField('date', event.target.value)}
          />
          <FieldError copy={copy} errors={errors} keys={['date', 'dateInFuture']} />
        </div>
        <div>
          <label className={labelCls()} htmlFor="donation-amount">{copy.amount}</label>
          <input
            id="donation-amount"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            className={inputCls(`w-full ${errorCls(has('amount'))}`)}
            value={form.amount}
            onChange={event => setField('amount', event.target.value)}
          />
          <FieldError copy={copy} errors={errors} keys={['amount']} />
        </div>
        <div>
          <label className={labelCls()} htmlFor="donation-reason">{copy.reason}</label>
          <select
            id="donation-reason"
            className={inputCls(`w-full ${errorCls(has('reason'))}`)}
            value={form.reason}
            onChange={event => setField('reason', event.target.value as DonationReason | '')}
          >
            <option value="">{copy.selectReason}</option>
            {DONATION_REASONS.map(reason => <option key={reason} value={reason}>{copy.reasons[reason]}</option>)}
          </select>
          <FieldError copy={copy} errors={errors} keys={['reason']} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls()} htmlFor="donation-recipient">{copy.recipient}</label>
          <input
            id="donation-recipient"
            type="text"
            maxLength={200}
            placeholder={copy.recipientPlaceholder}
            className={inputCls(`w-full ${errorCls(has('recipient'))}`)}
            value={form.recipient}
            onChange={event => setField('recipient', event.target.value)}
          />
          <FieldError copy={copy} errors={errors} keys={['recipient']} />
        </div>
      </div>

      <fieldset>
        <legend className={labelCls()}>{copy.method}</legend>
        <div className="flex flex-wrap gap-2">
          {DONATION_METHODS.map(method => (
            <label
              key={method}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                form.method === method
                  ? 'border-[color:var(--brand-blue-deep)] bg-[rgba(63,132,194,0.12)] text-[color:var(--brand-blue-deep)]'
                  : `border-slate-200 text-slate-700 hover:bg-slate-50 ${has('method') ? 'border-red-300' : ''}`
              }`}
            >
              <input
                type="radio"
                name="donation-method"
                value={method}
                checked={form.method === method}
                onChange={() => setField('method', method as DonationMethod)}
              />
              {copy.methods[method]}
            </label>
          ))}
        </div>
        <FieldError copy={copy} errors={errors} keys={['method']} />
      </fieldset>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        {!form.method ? <p className="text-xs text-slate-500">{copy.receiptPickMethod}</p> : null}
        {editing?.receiptPath ? (
          <p className="text-sm text-slate-700">
            {copy.currentReceipt}:{' '}
            <UserDocumentLink path={editing.receiptPath} name={editing.receiptName} fallback={copy.noReceipt} />
            <span className="ml-2 text-xs text-slate-500">{copy.replaceReceiptHint}</span>
          </p>
        ) : null}
        <FileUploadField
          {...uploadLabels}
          accept={uploadAccept}
          file={receiptFile}
          onChange={setReceiptFile}
          label={receiptLabel}
        />
        <FieldError copy={copy} errors={errors} keys={['receipt']} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[color:var(--brand-green)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? copy.saving : copy.save}
        </button>
        {editing ? (
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">
            {copy.cancel}
          </button>
        ) : null}
        {errors.length ? <span className="text-xs text-red-600">{copy.fixErrors}</span> : null}
        {saveError ? <span className="text-xs text-red-600">{copy.saveError}</span> : null}
        {saved && !errors.length ? <span className="text-xs text-green-700">{copy.saved}</span> : null}
      </div>
    </form>
  );
}

// ─── list ──────────────────────────────────────────────────────────────────────

type DonationListProps = {
  copy: DonationsCopy;
  numberLocale: string;
  donations: Donation[];
  filter: DonationFilter;
  setFilter: (filter: DonationFilter) => void;
  churchOptions: ChurchOption[];
  isAdmin: boolean;
  busyId: string | null;
  actionError: boolean;
  onEdit: (donation: Donation) => void;
  onDelete: (donation: Donation) => void;
  onReview: (donation: Donation, status: WorkReviewStatus) => void;
};

function Figure({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  );
}

export function DonationList({
  copy,
  numberLocale,
  donations,
  filter,
  setFilter,
  churchOptions,
  isAdmin,
  busyId,
  actionError,
  onEdit,
  onDelete,
  onReview
}: DonationListProps) {
  const visible = filterDonations(donations, filter);
  const totals = summarizeDonations(visible);
  const years = donationYears(donations);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold text-[color:var(--brand-ink)]">{copy.donations}</h2>
        <div className="flex flex-wrap gap-2">
          {churchOptions.length > 1 ? (
            <select
              aria-label={copy.church}
              className={inputCls()}
              value={filter.churchId}
              onChange={event => setFilter({ ...filter, churchId: event.target.value })}
            >
              <option value="">{copy.allChurches}</option>
              {churchOptions.map(church => <option key={church.id} value={church.id}>{church.name}</option>)}
            </select>
          ) : null}
          <select
            aria-label={copy.date}
            className={inputCls()}
            value={filter.year}
            onChange={event => setFilter({ ...filter, year: event.target.value })}
          >
            <option value="">{copy.allYears}</option>
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <select
            aria-label={copy.reason}
            className={inputCls()}
            value={filter.reason}
            onChange={event => setFilter({ ...filter, reason: event.target.value as DonationFilter['reason'] })}
          >
            <option value="">{copy.allReasons}</option>
            {DONATION_REASONS.map(reason => <option key={reason} value={reason}>{copy.reasons[reason]}</option>)}
          </select>
          <select
            aria-label={copy.reviewed}
            className={inputCls()}
            value={filter.status}
            onChange={event => setFilter({ ...filter, status: event.target.value as DonationFilter['status'] })}
          >
            <option value="">{copy.allStatuses}</option>
            <option value="pre-approved">{copy.preApproved}</option>
            <option value="reviewed">{copy.reviewed}</option>
          </select>
        </div>
      </div>

      {actionError ? <p className="text-xs text-red-600">{copy.actionError}</p> : null}

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {copy.noDonations}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[color:var(--brand-sand)] bg-[rgba(247,244,234,0.6)] p-3 text-sm sm:grid-cols-4">
            <Figure label={copy.totals} value={`${formatEuro(totals.total, numberLocale)} · ${totals.count} ${copy.donationsCount}`} />
            {DONATION_REASONS.map(reason => (
              <Figure key={reason} label={copy.reasons[reason]} value={formatEuro(totals.byReason[reason], numberLocale)} />
            ))}
          </div>

          <ul className="space-y-3">
            {visible.map(donation => {
              const reviewed = donation.reviewStatus === 'reviewed';
              const busy = busyId === donation.id;
              return (
                <li key={donation.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-slate-900">
                        {formatEuro(donation.amount, numberLocale)}
                        <span className="ml-2 text-sm font-medium text-slate-600">{copy.reasons[donation.reason]}</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        {formatSacramentDate(donation.date) || '—'} · {donation.churchName || donation.churchId || '—'}
                      </div>
                      <div className="text-sm text-slate-700">{copy.to}: {donation.recipient || '—'}</div>
                    </div>
                    <span
                      className={`self-start whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                        reviewed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {reviewed ? copy.reviewed : copy.preApproved}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-700">
                    {copy.methods[donation.method]} · {copy.receipt[donation.method]}:{' '}
                    <UserDocumentLink path={donation.receiptPath || undefined} name={donation.receiptName} fallback={copy.noReceipt} />
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onEdit(donation)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {copy.edit}
                    </button>
                    {isAdmin || !reviewed ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDelete(donation)}
                        className="rounded-full border border-red-100 px-3 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                      >
                        {busy ? copy.deleting : copy.delete}
                      </button>
                    ) : null}
                    {isAdmin ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onReview(donation, reviewed ? 'pre-approved' : 'reviewed')}
                        className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                          reviewed
                            ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                            : 'bg-[color:var(--brand-blue-deep)] text-white hover:opacity-80'
                        }`}
                      >
                        {reviewed ? copy.unmarkReviewed : copy.markReviewed}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
