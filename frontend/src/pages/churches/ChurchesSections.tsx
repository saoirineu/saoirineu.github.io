import type { UseMutationResult } from '@tanstack/react-query';

import type { ChurchInfo } from '../../lib/works';
import { emptyChurchUsageStats, type ChurchFormState, type ChurchUsageStats } from './form';

type FormSectionProps = {
  copy: ChurchesCopy;
  editingId: string | null;
  errorMessage?: string;
  form: ChurchFormState;
  isSuccess: boolean;
  mutation: UseMutationResult<unknown, Error, void, unknown>;
  onCancelEdit: () => void;
  onSubmit: () => void;
  setField: <K extends keyof ChurchFormState>(field: K, value: ChurchFormState[K]) => void;
  userPresent: boolean;
};

type ListSectionProps = {
  copy: ChurchesCopy;
  deleteMutation: UseMutationResult<unknown, Error, string, unknown>;
  churches: ChurchInfo[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onEdit: (church: ChurchInfo) => void;
  churchUsage: Map<string, ChurchUsageStats>;
};

export type ChurchesCopy = {
  newChurch: string;
  formHint: string;
  editing: string;
  loginToSave: string;
  name: string;
  lineage: string;
  city: string;
  state: string;
  country: string;
  latitude: string;
  longitude: string;
  notes: string;
  saveChanges: string;
  createChurch: string;
  saving: string;
  cancelEdit: string;
  saved: string;
  map: string;
  works: string;
  local: string;
  responsible: string;
  people: string;
  current: string;
  initiation: string;
  edit: string;
  deleting: string;
  delete: string;
  churchesRegistered: string;
  loading: string;
  noChurches: string;
};

export function ChurchFormSection({
  copy,
  editingId,
  errorMessage,
  form,
  isSuccess,
  mutation,
  onCancelEdit,
  onSubmit,
  setField,
  userPresent
}: FormSectionProps) {
  return (
    <form
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{copy.newChurch}</h2>
          <p className="text-xs text-slate-500">{copy.formHint}</p>
        </div>
        <div className="text-xs text-slate-600">
          {editingId ? <span className="text-amber-700">{copy.editing} {editingId}</span> : null}
          {!userPresent ? <span className="ml-2 text-amber-600">{copy.loginToSave}</span> : null}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg bg-slate-100 p-3 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          {copy.name}
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.name}
            onChange={event => setField('name', event.target.value)}
            placeholder="Ex.: Igreja da Floresta"
            required
          />
        </label>

        <label className="text-sm text-slate-700">
          {copy.lineage}
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.lineage}
            onChange={event => setField('lineage', event.target.value)}
            placeholder="Ex.: ICEFLU, CEFLI, IDCEFLU, Barquinha, UdV, Linha Unificada, etc."
          />
        </label>

        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          <label className="text-sm text-slate-700">
            {copy.city}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.city}
              onChange={event => setField('city', event.target.value)}
              placeholder="Ex.: Rio Branco"
            />
          </label>
          <label className="text-sm text-slate-700">
            {copy.state}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.state}
              onChange={event => setField('state', event.target.value)}
              placeholder="AC"
            />
          </label>
          <label className="text-sm text-slate-700">
            {copy.country}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.country}
              onChange={event => setField('country', event.target.value)}
              placeholder="Brasil"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <label className="text-sm text-slate-700">
            {copy.latitude}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.lat}
              onChange={event => setField('lat', event.target.value)}
              placeholder="Ex.: -9.975"
            />
          </label>
          <label className="text-sm text-slate-700">
            {copy.longitude}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.lng}
              onChange={event => setField('lng', event.target.value)}
              placeholder="Ex.: -67.812"
            />
          </label>
        </div>

        <label className="text-sm text-slate-700 sm:col-span-2">
          {copy.notes}
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            rows={2}
            value={form.observations}
            onChange={event => setField('observations', event.target.value)}
            placeholder="Responsáveis, contato, notas livres"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? copy.saving : editingId ? copy.saveChanges : copy.createChurch}
        </button>
        {editingId ? (
          <button type="button" className="text-xs text-slate-600 underline" onClick={onCancelEdit}>
            {copy.cancelEdit}
          </button>
        ) : null}
        {errorMessage ? <span className="text-xs text-red-600">{errorMessage}</span> : null}
        {isSuccess ? <span className="text-xs text-emerald-700">{copy.saved}</span> : null}
      </div>
    </form>
  );
}

function ChurchCard({
  copy,
  deleteMutation,
  church,
  onDelete,
  onEdit,
  uso
}: {
  copy: ChurchesCopy;
  deleteMutation: UseMutationResult<unknown, Error, string, unknown>;
  church: ChurchInfo;
  onDelete: (id: string) => void;
  onEdit: (church: ChurchInfo) => void;
  uso: ChurchUsageStats;
}) {
  const localParts = [church.city, church.state, church.country].filter(Boolean).join(' • ');
  const mapLink =
    church.lat && church.lng
      ? `https://www.openstreetmap.org/?mlat=${church.lat}&mlon=${church.lng}&zoom=14`
      : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{church.name}</h3>
          {church.lineage ? <p className="text-xs text-slate-600">{church.lineage}</p> : null}
        </div>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">{church.id}</span>
      </div>
      <div className="mt-2 space-y-1 text-sm text-slate-700">
        {localParts ? <p>{localParts}</p> : null}
        {church.observations ? <p className="text-slate-600">{church.observations}</p> : null}
        {mapLink ? (
          <a className="text-xs text-slate-600 underline" href={mapLink} target="_blank" rel="noreferrer">
            {copy.map} ({church.lat?.toFixed(4)}, {church.lng?.toFixed(4)})
          </a>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div className="rounded-md bg-slate-100 px-2 py-1">
          <div className="font-semibold text-slate-800">{copy.works}</div>
          <div>{copy.local}: {uso.worksVenue}</div>
          <div>{copy.responsible}: {uso.worksResponsible}</div>
        </div>
        <div className="rounded-md bg-slate-100 px-2 py-1">
          <div className="font-semibold text-slate-800">{copy.people}</div>
          <div>{copy.current}: {uso.membersCurrentChurch}</div>
          <div>{copy.initiation}: {uso.membersInitiationChurch}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <button className="rounded border border-slate-300 px-3 py-1 font-medium text-slate-700 shadow-sm" onClick={() => onEdit(church)}>
          {copy.edit}
        </button>
        <button
          className="rounded border border-red-200 px-3 py-1 font-medium text-red-700 shadow-sm disabled:opacity-50"
          disabled={deleteMutation.isPending && deleteMutation.variables === church.id}
          onClick={() => onDelete(church.id)}
        >
          {deleteMutation.isPending && deleteMutation.variables === church.id ? copy.deleting : copy.delete}
        </button>
      </div>
    </div>
  );
}

export function ChurchesListSection({
  copy,
  deleteMutation,
  churches,
  isLoading,
  onDelete,
  onEdit,
  churchUsage
}: ListSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{copy.churchesRegistered}</h2>
        {isLoading ? <span className="text-xs text-slate-500">{copy.loading}</span> : null}
      </div>

      {churches.length === 0 && !isLoading ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          {copy.noChurches}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {churches.map(church => (
            <ChurchCard
              copy={copy}
              key={church.id}
              deleteMutation={deleteMutation}
              church={church}
              onDelete={onDelete}
              onEdit={onEdit}
              uso={churchUsage.get(church.id) ?? emptyChurchUsageStats}
            />
          ))}
        </div>
      )}
    </div>
  );
}
