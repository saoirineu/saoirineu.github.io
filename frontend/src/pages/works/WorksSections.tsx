import { useEffect, useState, type ReactNode } from 'react';

import type { ChurchManager } from '../../lib/churchManagers';
import type { UserProfile } from '../../lib/users';
import type { Work, WorkReviewStatus } from '../../lib/works';
import { OTHER_WORK_TYPE_ID, newWorkTypeId, type WorkType, type WorkTypeCatalog } from '../../lib/workTypes';
import type { ChurchOption } from '../../providers/useChurchRecordAccess';
import { formatQuantity, inputCls, labelCls } from '../sacrament/form';
import type { WorksCopy } from './copy';
import {
  availableForWork,
  filterWorks,
  formatEuro,
  formatWorkDate,
  parseDecimal,
  sacramentItemLabel,
  sacramentUnit,
  summarizeWorks,
  whiteAttendees,
  workTypeDisplay,
  workYears,
  type SacramentOption,
  type WorkFilter,
  type WorkFormError,
  type WorkFormState
} from './form';


function errorCls(hasError: boolean) {
  return hasError ? 'border-red-300 ring-1 ring-red-200' : '';
}

function FieldError({ copy, errors, keys }: { copy: WorksCopy; errors: WorkFormError[]; keys: WorkFormError[] }) {
  const found = keys.find(key => errors.includes(key));
  return found ? <p className="mt-0.5 text-xs text-red-600">{copy.errors[found]}</p> : null;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</legend>
      {children}
    </fieldset>
  );
}

// ─── record form ───────────────────────────────────────────────────────────────

type WorkRecordFormProps = {
  copy: WorksCopy;
  numberLocale: string;
  form: WorkFormState;
  setField: <K extends keyof WorkFormState>(key: K, value: WorkFormState[K]) => void;
  errors: WorkFormError[];
  churchOptions: ChurchOption[];
  workTypes: WorkType[];
  sacramentOptions: SacramentOption[];
  sacramentLoading: boolean;
  editing: Work | null;
  today: string;
  saving: boolean;
  saveError: boolean;
  saved: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

export function WorkRecordForm({
  copy,
  numberLocale,
  form,
  setField,
  errors,
  churchOptions,
  workTypes,
  sacramentOptions,
  sacramentLoading,
  editing,
  today,
  saving,
  saveError,
  saved,
  onSubmit,
  onCancel
}: WorkRecordFormProps) {
  const has = (...keys: WorkFormError[]) => keys.some(key => errors.includes(key));
  const whites = whiteAttendees(form);
  const activeTypes = workTypes.filter(type => type.active);
  // A record keeps its type even after an admin deactivates or renames it.
  const retiredType = editing && form.workTypeId === editing.workTypeId && form.workTypeId !== OTHER_WORK_TYPE_ID
    && !activeTypes.some(type => type.id === form.workTypeId)
    ? { id: editing.workTypeId, label: editing.workTypeLabel }
    : null;

  const selectedOption = sacramentOptions.find(option => option.item.id === form.sacramentItemId);
  const keptSacrament = !selectedOption && editing?.sacrament?.itemId === form.sacramentItemId ? editing.sacrament : undefined;
  const unit = selectedOption ? sacramentUnit(selectedOption.item) : keptSacrament?.unit ?? 'L';
  const quantity = parseDecimal(form.sacramentQuantity);
  const exceedsBalance = selectedOption && quantity !== null
    && quantity > availableForWork(selectedOption, editing ?? undefined) + 1e-9;

  return (
    <form
      noValidate
      className="space-y-3 rounded-xl border border-[color:var(--brand-sand)] bg-white p-4 shadow-sm"
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h2 className="text-base font-semibold text-[color:var(--brand-ink)]">
        {editing ? copy.editRecord : copy.newRecord}
      </h2>

      <FormSection title={copy.sectionWork}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls()} htmlFor="work-church">{copy.church}</label>
            <select
              id="work-church"
              className={inputCls(`w-full ${errorCls(has('church'))}`)}
              value={form.churchId}
              disabled={!!editing || churchOptions.length === 1}
              onChange={event => setField('churchId', event.target.value)}
            >
              <option value="">{copy.selectChurch}</option>
              {churchOptions.map(church => (
                <option key={church.id} value={church.id}>{church.name}</option>
              ))}
            </select>
            <FieldError copy={copy} errors={errors} keys={['church']} />
          </div>
          <div>
            <label className={labelCls()} htmlFor="work-date">{copy.date}</label>
            <input
              id="work-date"
              type="date"
              max={today}
              className={inputCls(`w-full ${errorCls(has('date', 'dateInFuture'))}`)}
              value={form.date}
              onChange={event => setField('date', event.target.value)}
            />
            <FieldError copy={copy} errors={errors} keys={['date', 'dateInFuture']} />
          </div>
          <div>
            <label className={labelCls()} htmlFor="work-type">{copy.workType}</label>
            <select
              id="work-type"
              className={inputCls(`w-full ${errorCls(has('workType'))}`)}
              value={form.workTypeId}
              onChange={event => setField('workTypeId', event.target.value)}
            >
              <option value="">{copy.selectWorkType}</option>
              {retiredType ? <option value={retiredType.id}>{retiredType.label}</option> : null}
              <optgroup label={copy.officialCalendar}>
                {activeTypes.filter(type => type.category === 'official').map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </optgroup>
              <optgroup label={copy.otherWorks}>
                {activeTypes.filter(type => type.category === 'other').map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
                <option value={OTHER_WORK_TYPE_ID}>{copy.other}</option>
              </optgroup>
            </select>
            <FieldError copy={copy} errors={errors} keys={['workType']} />
          </div>
          {form.workTypeId === OTHER_WORK_TYPE_ID ? (
            <div>
              <label className={labelCls()} htmlFor="work-type-other">{copy.workTypeOther}</label>
              <input
                id="work-type-other"
                type="text"
                maxLength={200}
                className={inputCls(`w-full ${errorCls(has('workTypeOther'))}`)}
                value={form.workTypeOther}
                onChange={event => setField('workTypeOther', event.target.value)}
              />
              <FieldError copy={copy} errors={errors} keys={['workTypeOther']} />
            </div>
          ) : null}
          <div>
            <label className={labelCls()} htmlFor="work-venue">{copy.venue} <span className="font-normal text-slate-400">({copy.optional})</span></label>
            <input
              id="work-venue"
              type="text"
              maxLength={200}
              className={inputCls('w-full')}
              value={form.venueText}
              onChange={event => setField('venueText', event.target.value)}
            />
          </div>
          <div>
            <label className={labelCls()} htmlFor="work-hymnal">{copy.hymnal} <span className="font-normal text-slate-400">({copy.optional})</span></label>
            <input
              id="work-hymnal"
              type="text"
              maxLength={500}
              placeholder="O Cruzeiro"
              className={inputCls('w-full')}
              value={form.hymnalText}
              onChange={event => setField('hymnalText', event.target.value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title={copy.sectionParticipants}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls()} htmlFor="work-total">{copy.totalAttendees}</label>
            <input
              id="work-total"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              className={inputCls(`w-full ${errorCls(has('totalAttendees'))}`)}
              value={form.totalAttendees}
              onChange={event => setField('totalAttendees', event.target.value)}
            />
            <FieldError copy={copy} errors={errors} keys={['totalAttendees']} />
          </div>
          <div>
            <label className={labelCls()} htmlFor="work-initiated">{copy.initiatedAttendees}</label>
            <input
              id="work-initiated"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              className={inputCls(`w-full ${errorCls(has('initiatedAttendees', 'initiatedAboveTotal'))}`)}
              value={form.initiatedAttendees}
              onChange={event => setField('initiatedAttendees', event.target.value)}
            />
            <FieldError copy={copy} errors={errors} keys={['initiatedAttendees', 'initiatedAboveTotal']} />
          </div>
          <div>
            <span className={labelCls()}>{copy.whiteAttendees} <span className="font-normal text-slate-400">({copy.computed})</span></span>
            <output className="block rounded-lg border border-dashed border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
              {whites ?? '—'}
            </output>
          </div>
        </div>
      </FormSection>

      <FormSection title={copy.sectionDaime}>
        {form.churchId && !sacramentLoading && sacramentOptions.length === 0 && !keptSacrament ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{copy.noLinkedStock}</p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={labelCls()} htmlFor="work-batch">{copy.sacramentItem}</label>
            <select
              id="work-batch"
              className={inputCls(`w-full ${errorCls(has('sacramentItem'))}`)}
              value={form.sacramentItemId}
              disabled={!form.churchId}
              onChange={event => setField('sacramentItemId', event.target.value)}
            >
              <option value="">{sacramentLoading ? copy.loading : copy.selectBatch}</option>
              {keptSacrament ? (
                <option value={keptSacrament.itemId}>{keptSacrament.itemLabel ?? keptSacrament.itemId}</option>
              ) : null}
              {sacramentOptions.map(option => (
                <option key={option.item.id} value={option.item.id}>
                  {sacramentItemLabel(option.item, option.stock)} — {copy.balance} {formatQuantity(availableForWork(option, editing ?? undefined), sacramentUnit(option.item))}
                </option>
              ))}
            </select>
            <FieldError copy={copy} errors={errors} keys={['sacramentItem']} />
          </div>
          <div>
            <label className={labelCls()} htmlFor="work-quantity">{copy.quantity} ({unit})</label>
            <input
              id="work-quantity"
              type="text"
              inputMode="decimal"
              placeholder="0,50"
              className={inputCls(`w-full ${errorCls(has('sacramentQuantity'))}`)}
              value={form.sacramentQuantity}
              onChange={event => setField('sacramentQuantity', event.target.value)}
            />
            <FieldError copy={copy} errors={errors} keys={['sacramentQuantity']} />
          </div>
        </div>
        {exceedsBalance ? <p className="text-xs text-amber-700">{copy.aboveBalance}</p> : null}
      </FormSection>

      <FormSection title={copy.sectionContributions}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls()} htmlFor="work-collected">{copy.contributionsCollected} (€)</label>
            <input
              id="work-collected"
              type="text"
              inputMode="decimal"
              className={inputCls(`w-full ${errorCls(has('contributionsCollected'))}`)}
              value={form.contributionsCollected}
              onChange={event => setField('contributionsCollected', event.target.value)}
            />
            <FieldError copy={copy} errors={errors} keys={['contributionsCollected']} />
          </div>
          <div>
            <label className={labelCls()} htmlFor="work-quota">
              {copy.icefluBrazilQuota} (€) <span className="font-normal text-slate-400">— {copy.icefluBrazilQuotaHint}</span>
            </label>
            <input
              id="work-quota"
              type="text"
              inputMode="decimal"
              className={inputCls(`w-full ${errorCls(has('icefluBrazilQuota'))}`)}
              value={form.icefluBrazilQuota}
              onChange={event => setField('icefluBrazilQuota', event.target.value)}
            />
            <FieldError copy={copy} errors={errors} keys={['icefluBrazilQuota']} />
          </div>
        </div>
        {parseDecimal(form.contributionsCollected) !== null ? (
          <p className="text-xs text-slate-500">
            {formatEuro(parseDecimal(form.contributionsCollected) ?? 0, numberLocale)}
            {parseDecimal(form.icefluBrazilQuota) !== null ? ` · ICEFLU ${formatEuro(parseDecimal(form.icefluBrazilQuota) ?? 0, numberLocale)}` : ''}
          </p>
        ) : null}
      </FormSection>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[color:var(--brand-green)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? copy.saving : copy.save}
        </button>
        {editing ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
          >
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

// ─── record list ───────────────────────────────────────────────────────────────

type WorkRecordListProps = {
  copy: WorksCopy;
  numberLocale: string;
  works: Work[];
  filter: WorkFilter;
  setFilter: (filter: WorkFilter) => void;
  churchOptions: ChurchOption[];
  isAdmin: boolean;
  busyId: string | null;
  actionError: boolean;
  onEdit: (work: Work) => void;
  onDelete: (work: Work) => void;
  onReview: (work: Work, status: WorkReviewStatus) => void;
};

function Figure({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  );
}

export function WorkRecordList({
  copy,
  numberLocale,
  works,
  filter,
  setFilter,
  churchOptions,
  isAdmin,
  busyId,
  actionError,
  onEdit,
  onDelete,
  onReview
}: WorkRecordListProps) {
  const visible = filterWorks(works, filter);
  const totals = summarizeWorks(visible);
  const years = workYears(works);
  const daimeTotal = [
    totals.liters ? formatQuantity(totals.liters, 'L') : '',
    totals.kg ? formatQuantity(totals.kg, 'kg') : ''
  ].filter(Boolean).join(' · ') || '—';

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold text-[color:var(--brand-ink)]">{copy.records}</h2>
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
            aria-label={copy.reviewed}
            className={inputCls()}
            value={filter.status}
            onChange={event => setFilter({ ...filter, status: event.target.value as WorkFilter['status'] })}
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
          {copy.noRecords}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[color:var(--brand-sand)] bg-[rgba(247,244,234,0.6)] p-3 text-sm sm:grid-cols-5">
            <Figure label={copy.totals} value={`${totals.count} ${copy.works}`} />
            <Figure label={copy.totalAttendees} value={`${totals.attendees} (${copy.initiatedAttendees} ${totals.initiated})`} />
            <Figure label={copy.sacramentItem} value={daimeTotal} />
            <Figure label={copy.contributionsCollected} value={formatEuro(totals.collected, numberLocale)} />
            <Figure label={copy.icefluBrazilQuota} value={formatEuro(totals.icefluBrazilQuota, numberLocale)} />
          </div>

          <ul className="space-y-3">
            {visible.map(work => {
              const reviewed = work.reviewStatus === 'reviewed';
              const busy = busyId === work.id;
              const canDelete = isAdmin || !reviewed;
              return (
                <li key={work.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{workTypeDisplay(work)}</div>
                      <div className="text-sm text-slate-600">
                        {formatWorkDate(work.date)} · {work.churchName || work.churchId || '—'}
                        {work.venueText ? ` · ${work.venueText}` : ''}
                      </div>
                      {work.hymnalText ? <div className="text-xs text-slate-500">{copy.hymnal}: {work.hymnalText}</div> : null}
                    </div>
                    <span
                      className={`self-start whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                        reviewed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {reviewed ? copy.reviewed : copy.preApproved}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                    <Figure label={copy.totalAttendees} value={work.attendees.total} />
                    <Figure
                      label={`${copy.initiatedAttendees} / ${copy.whiteAttendees}`}
                      value={`${work.attendees.initiated} / ${Math.max(0, work.attendees.total - work.attendees.initiated)}`}
                    />
                    <Figure
                      label={copy.sacramentItem}
                      value={work.sacrament ? (
                        <span title={work.sacrament.itemLabel}>{formatQuantity(work.sacrament.quantity, work.sacrament.unit)}</span>
                      ) : '—'}
                    />
                    <Figure label={copy.contributionsCollected} value={formatEuro(work.contributions.collected, numberLocale)} />
                    <Figure label={copy.icefluBrazilQuota} value={formatEuro(work.contributions.icefluBrazilQuota, numberLocale)} />
                  </div>
                  {work.sacrament?.itemLabel ? (
                    <p className="mt-1 truncate text-xs text-slate-400">{work.sacrament.itemLabel}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onEdit(work)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {copy.edit}
                    </button>
                    {canDelete ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDelete(work)}
                        className="rounded-full border border-red-100 px-3 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                      >
                        {busy ? copy.deleting : copy.delete}
                      </button>
                    ) : null}
                    {isAdmin ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onReview(work, reviewed ? 'pre-approved' : 'reviewed')}
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

// ─── church managers (admin) ───────────────────────────────────────────────────

type ChurchManagersPanelProps = {
  copy: WorksCopy;
  managers: ChurchManager[];
  users: UserProfile[];
  churches: ChurchOption[];
  loading: boolean;
  saving: boolean;
  error: boolean;
  onSave: (manager: ChurchManager) => void;
};

function userLabel(user: Pick<UserProfile, 'displayName' | 'fullName' | 'email' | 'uid'>) {
  const name = user.fullName || user.displayName;
  return name && user.email ? `${name} <${user.email}>` : name || user.email || user.uid;
}

function ChurchChecklist({
  churches,
  selected,
  onChange
}: {
  churches: ChurchOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-2">
      {churches.map(church => (
        <label key={church.id} className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={selected.includes(church.id)}
            onChange={event => onChange(
              event.target.checked ? [...selected, church.id] : selected.filter(id => id !== church.id)
            )}
          />
          {church.name}
        </label>
      ))}
    </div>
  );
}

export function ChurchManagersPanel({ copy, managers, users, churches, loading, saving, error, onSave }: ChurchManagersPanelProps) {
  const [editingUid, setEditingUid] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const churchName = (id: string) => churches.find(church => church.id === id)?.name ?? id;
  const current = managers.find(manager => manager.uid === editingUid);

  function startEditing(uid: string) {
    setEditingUid(uid);
    setSelected(managers.find(manager => manager.uid === uid)?.churchIds ?? []);
  }

  function save(uid: string, churchIds: string[]) {
    const user = users.find(entry => entry.uid === uid);
    const known = managers.find(manager => manager.uid === uid);
    onSave({
      uid,
      churchIds,
      churchNames: churchIds.map(churchName),
      email: user?.email ?? known?.email,
      displayName: user?.fullName || user?.displayName || known?.displayName
    });
    setEditingUid('');
    setSelected([]);
  }

  return (
    <section className="space-y-3 rounded-xl border border-[color:var(--brand-sand)] bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-[color:var(--brand-ink)]">{copy.managersTitle}</h2>
        <p className="text-xs text-slate-500">{copy.managersIntro}</p>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <label className={labelCls()} htmlFor="manager-account">{copy.account}</label>
        <select
          id="manager-account"
          className={inputCls('w-full')}
          value={editingUid}
          onChange={event => startEditing(event.target.value)}
        >
          <option value="">{loading ? copy.loading : copy.selectAccount}</option>
          {users
            .slice()
            .sort((a, b) => userLabel(a).localeCompare(userLabel(b)))
            .map(user => <option key={user.uid} value={user.uid}>{userLabel(user)}</option>)}
        </select>
        {editingUid ? (
          <>
            <span className={labelCls()}>{copy.churches}</span>
            <ChurchChecklist churches={churches} selected={selected} onChange={setSelected} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving || (!current && selected.length === 0)}
                onClick={() => save(editingUid, selected)}
                className="rounded-lg bg-[color:var(--brand-green)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {saving ? copy.saving : current ? copy.saveManager : copy.addManager}
              </button>
              <button
                type="button"
                onClick={() => { setEditingUid(''); setSelected([]); }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
              >
                {copy.cancel}
              </button>
            </div>
          </>
        ) : null}
        {error ? <p className="text-xs text-red-600">{copy.actionError}</p> : null}
      </div>

      {managers.length === 0 ? (
        <p className="text-sm text-slate-500">{loading ? copy.loading : copy.noManagers}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {managers.map(manager => (
            <li key={manager.uid} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800">
                  {userLabel({ ...manager, fullName: undefined })}
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {manager.churchIds.map(id => (
                    <span key={id} className="rounded-full bg-[rgba(63,132,194,0.12)] px-2 py-0.5 text-xs text-[color:var(--brand-blue-deep)]">
                      {churches.find(church => church.id === id)?.name ?? manager.churchNames[manager.churchIds.indexOf(id)] ?? id}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEditing(manager.uid)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  {copy.edit}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (window.confirm(copy.confirmRemoveManager)) save(manager.uid, []);
                  }}
                  className="rounded-full border border-red-100 px-3 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  {copy.removeManager}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── work types (admin) ────────────────────────────────────────────────────────

type WorkTypesPanelProps = {
  copy: WorksCopy;
  catalog: WorkTypeCatalog | undefined;
  saving: boolean;
  saved: boolean;
  error: boolean;
  onSave: (items: WorkType[]) => void;
};

const NEW_WORK_TYPE_PREFIX = '__new-';

/** Gives entries added in the editor an id derived from their label, unique in the list. */
function resolveNewWorkTypeIds(items: WorkType[]): WorkType[] {
  const resolved: WorkType[] = items.filter(item => !item.id.startsWith(NEW_WORK_TYPE_PREFIX));
  return items.map(item => {
    if (!item.id.startsWith(NEW_WORK_TYPE_PREFIX)) return item;
    const next = { ...item, id: newWorkTypeId(item.label, resolved) };
    resolved.push(next);
    return next;
  });
}

export function WorkTypesPanel({ copy, catalog, saving, saved, error, onSave }: WorkTypesPanelProps) {
  const [items, setItems] = useState<WorkType[]>(catalog?.items ?? []);
  const [added, setAdded] = useState(0);

  useEffect(() => {
    if (catalog) setItems(catalog.items);
  }, [catalog]);

  function update(index: number, patch: Partial<WorkType>) {
    setItems(prev => prev.map((item, position) => (position === index ? { ...item, ...patch } : item)));
  }

  function move(index: number, offset: number) {
    setItems(prev => {
      const target = index + offset;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-[color:var(--brand-sand)] bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-[color:var(--brand-ink)]">{copy.workTypesTitle}</h2>
        <p className="text-xs text-slate-500">{copy.workTypesIntro}</p>
        <p className="text-xs text-slate-500">{copy.otherAlwaysOffered}</p>
      </div>
      {catalog && !catalog.saved ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{copy.draftNotice}</p>
      ) : null}

      {!catalog ? (
        <p className="text-sm text-slate-400">{copy.loading}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={item.id} className="grid grid-cols-1 items-center gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1fr_11rem_auto_auto]">
              <input
                type="text"
                aria-label={copy.label}
                maxLength={200}
                className={inputCls(`w-full ${item.active ? '' : 'text-slate-400'}`)}
                value={item.label}
                onChange={event => update(index, { label: event.target.value })}
              />
              <select
                aria-label={copy.category}
                className={inputCls('w-full')}
                value={item.category}
                onChange={event => update(index, { category: event.target.value as WorkType['category'] })}
              >
                <option value="official">{copy.officialCalendar}</option>
                <option value="other">{copy.otherWorks}</option>
              </select>
              <label className="flex items-center gap-1 text-xs text-slate-600">
                <input type="checkbox" checked={item.active} onChange={event => update(index, { active: event.target.checked })} />
                {copy.active}
              </label>
              <div className="flex gap-1">
                <button type="button" title={copy.moveUp} aria-label={copy.moveUp} disabled={index === 0} onClick={() => move(index, -1)} className="rounded border border-slate-200 px-2 text-xs text-slate-600 disabled:opacity-30">↑</button>
                <button type="button" title={copy.moveDown} aria-label={copy.moveDown} disabled={index === items.length - 1} onClick={() => move(index, 1)} className="rounded border border-slate-200 px-2 text-xs text-slate-600 disabled:opacity-30">↓</button>
                <button type="button" title={copy.remove} aria-label={copy.remove} onClick={() => setItems(prev => prev.filter((_, position) => position !== index))} className="rounded border border-red-100 px-2 text-xs text-red-500">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!catalog}
          onClick={() => {
            setItems(prev => [...prev, { id: `${NEW_WORK_TYPE_PREFIX}${added}`, label: '', category: 'other', active: true }]);
            setAdded(count => count + 1);
          }}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          + {copy.addWorkType}
        </button>
        <button
          type="button"
          disabled={!catalog || saving}
          onClick={() => onSave(resolveNewWorkTypeIds(items))}
          className="rounded-lg bg-[color:var(--brand-green)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? copy.saving : copy.saveWorkTypes}
        </button>
        {saved ? <span className="text-xs text-green-700">{copy.workTypesSaved}</span> : null}
        {error ? <span className="text-xs text-red-600">{copy.actionError}</span> : null}
      </div>
    </section>
  );
}
