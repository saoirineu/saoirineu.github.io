import type { ChurchInfo } from '../../lib/trabalhos';
import { avatarFallback, type PerfilFormFieldSetter, type PerfilFormState } from './form';

type ChurchesProps = {
  igrejas?: ChurchInfo[];
};

type BaseSectionProps = {
  copy: PerfilSectionsCopy;
  form: PerfilFormState;
  setField: PerfilFormFieldSetter;
};

export type PerfilSectionsCopy = {
  name: string;
  yourName: string;
  email: string;
  phone: string;
  optional: string;
  city: string;
  state: string;
  country: string;
  avatar: string;
  avatarUrl: string;
  useGooglePhoto: string;
  currentChurchRegistered: string;
  selectPlaceholder: string;
  currentChurchText: string;
  notRegisteredYet: string;
  originChurchText: string;
  originChurchPlaceholder: string;
  notes: string;
  iAmFardado: string;
  iAmSponsor: string;
  fardamentoDate: string;
  fardamentoPlace: string;
  fardamentoPlacePlaceholder: string;
  whoFardouMe: string;
  whoFardouMePlaceholder: string;
  fardamentoChurchRegistered: string;
  fardamentoChurchText: string;
  withWhomIWasFardado: string;
  withWhomIWasFardadoPlaceholder: string;
  sponsorChurchesRegistered: string;
  sponsorChurchesText: string;
  sponsorChurchesPlaceholder: string;
  roles: string;
  rolesPlaceholder: string;
  rolesHint: string;
};

function selectChurchName(churches: ChurchInfo[] | undefined, id: string) {
  return churches?.find(church => church.id === id)?.name ?? '';
}

export function PerfilDadosPessoaisSection({
  avatarUrl,
  copy,
  form,
  setField,
  userPhotoURL
}: BaseSectionProps & { avatarUrl: string; userPhotoURL?: string | null }) {
  const resolvedAvatar = avatarUrl || userPhotoURL || avatarFallback(form.displayName, form.email);

  return (
    <div className="grid gap-4 rounded-lg bg-slate-100 p-3 sm:grid-cols-[1fr,240px]">
      <div className="space-y-3">
        <label className="text-sm text-slate-700">
          {copy.name}
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.displayName}
            onChange={event => setField('displayName', event.target.value)}
            placeholder={copy.yourName}
          />
        </label>
        <label className="text-sm text-slate-700">
          {copy.email}
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            value={form.email}
            readOnly
          />
        </label>
        <label className="text-sm text-slate-700">
          {copy.phone}
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.phone}
            onChange={event => setField('phone', event.target.value)}
            placeholder={copy.optional}
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-sm text-slate-700">
            {copy.city}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.city}
              onChange={event => setField('city', event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700">
            {copy.state}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.state}
              onChange={event => setField('state', event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700">
            {copy.country}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.country}
              onChange={event => setField('country', event.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-lg bg-white/60 p-3 shadow-sm">
        <img
          src={resolvedAvatar}
          alt={copy.avatar}
          className="h-28 w-28 rounded-full border border-slate-200 object-cover shadow-sm"
        />
        <label className="w-full text-sm text-slate-700">
          {copy.avatarUrl}
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.avatarUrl}
            onChange={event => setField('avatarUrl', event.target.value)}
            placeholder="https://..."
          />
        </label>
        {userPhotoURL ? (
          <button
            type="button"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={() => setField('avatarUrl', userPhotoURL)}
          >
            {copy.useGooglePhoto}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PerfilIgrejasSection({ copy, form, igrejas, setField }: BaseSectionProps & ChurchesProps) {
  return (
    <div className="grid gap-3 rounded-lg bg-slate-100 p-3 sm:grid-cols-2">
      <div className="space-y-3">
        <label className="text-sm text-slate-700">
          {copy.currentChurchRegistered}
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.currentChurchId}
            onChange={event => {
              const currentChurchId = event.target.value;
              setField('currentChurchId', currentChurchId);
              setField('currentChurchName', selectChurchName(igrejas, currentChurchId));
            }}
          >
            <option value="">{copy.selectPlaceholder}</option>
            {igrejas?.map(church => (
              <option key={church.id} value={church.id}>
                {church.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          {copy.currentChurchText}
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.currentChurchName}
            onChange={event => setField('currentChurchName', event.target.value)}
            placeholder={copy.notRegisteredYet}
          />
        </label>
      </div>
      <div className="space-y-3">
        <label className="text-sm text-slate-700">
          {copy.originChurchText}
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.originChurchName}
            onChange={event => setField('originChurchName', event.target.value)}
            placeholder={copy.originChurchPlaceholder}
          />
        </label>
        <label className="text-sm text-slate-700">
          {copy.notes}
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            value={form.observations}
            onChange={event => setField('observations', event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

export function PerfilFardamentoSection({ copy, form, igrejas, setField }: BaseSectionProps & ChurchesProps) {
  return (
    <div className="space-y-3 rounded-lg bg-slate-100 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            id="fardado"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-slate-900"
            checked={form.fardado}
            onChange={event => {
              const isChecked = event.target.checked;
              setField('fardado', isChecked);
              if (!isChecked) {
                setField('isPadrinho', false);
                setField('padrinhoChurchIds', []);
                setField('padrinhoChurchesText', '');
              }
            }}
          />
          {copy.iAmFardado}
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            id="padrinho"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-slate-900"
            checked={form.isPadrinho}
            disabled={!form.fardado}
            onChange={event => setField('isPadrinho', event.target.checked)}
          />
          {copy.iAmSponsor}
        </label>
      </div>

      {form.fardado ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-3">
              <label className="text-sm text-slate-700">
                {copy.fardamentoDate}
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.fardamentoDate}
                  onChange={event => setField('fardamentoDate', event.target.value)}
                />
              </label>
              <label className="text-sm text-slate-700">
                {copy.fardamentoPlace}
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.fardamentoVenue}
                  onChange={event => setField('fardamentoVenue', event.target.value)}
                  placeholder={copy.fardamentoPlacePlaceholder}
                />
              </label>
              <label className="text-sm text-slate-700">
                {copy.whoFardouMe}
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.fardadorName}
                  onChange={event => setField('fardadorName', event.target.value)}
                  placeholder={copy.whoFardouMePlaceholder}
                />
              </label>
            </div>
            <div className="space-y-3">
              <label className="text-sm text-slate-700">
                {copy.fardamentoChurchRegistered}
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.fardamentoChurchId}
                  onChange={event => {
                    const fardamentoChurchId = event.target.value;
                    setField('fardamentoChurchId', fardamentoChurchId);
                    setField('fardamentoChurchName', selectChurchName(igrejas, fardamentoChurchId));
                  }}
                >
                  <option value="">{copy.selectPlaceholder}</option>
                  {igrejas?.map(church => (
                    <option key={church.id} value={church.id}>
                      {church.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">
                {copy.fardamentoChurchText}
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.fardamentoChurchName}
                  onChange={event => setField('fardamentoChurchName', event.target.value)}
                  placeholder={copy.notRegisteredYet}
                />
              </label>
              <label className="text-sm text-slate-700">
                {copy.withWhomIWasFardado}
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.fardadoComQuem}
                  onChange={event => setField('fardadoComQuem', event.target.value)}
                  placeholder={copy.withWhomIWasFardadoPlaceholder}
                />
              </label>
            </div>
          </div>

          {form.isPadrinho ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-700">
                {copy.sponsorChurchesRegistered}
                <select
                  multiple
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.padrinhoChurchIds}
                  onChange={event => {
                    const selected = Array.from(event.target.selectedOptions).map(option => option.value);
                    setField('padrinhoChurchIds', selected);
                  }}
                  size={Math.min(igrejas?.length ?? 4, 6)}
                >
                  {igrejas?.map(church => (
                    <option key={church.id} value={church.id}>
                      {church.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">
                {copy.sponsorChurchesText}
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.padrinhoChurchesText}
                  onChange={event => setField('padrinhoChurchesText', event.target.value)}
                  placeholder={copy.sponsorChurchesPlaceholder}
                />
              </label>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function PerfilPapeisSection({ copy, form, setField }: BaseSectionProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-slate-700">
        {copy.roles}
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={form.doctrineRolesText}
          onChange={event => setField('doctrineRolesText', event.target.value)}
          placeholder={copy.rolesPlaceholder}
        />
      </label>
      <p className="text-xs text-slate-500">
        {copy.rolesHint}
      </p>
    </div>
  );
}
