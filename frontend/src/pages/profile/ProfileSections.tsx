import type { ChurchInfo } from '../../lib/sessions';
import { avatarFallback, type ProfileFormFieldSetter, type ProfileFormState } from './form';

type ChurchesProps = {
  churches?: ChurchInfo[];
};

type BaseSectionProps = {
  copy: ProfileSectionsCopy;
  form: ProfileFormState;
  setField: ProfileFormFieldSetter;
};

export type ProfileSectionsCopy = {
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
  iAmInitiated: string;
  iAmSponsor: string;
  initiationDate: string;
  initiationPlace: string;
  initiationPlacePlaceholder: string;
  whoInitiatedMe: string;
  whoInitiatedMePlaceholder: string;
  initiationChurchRegistered: string;
  initiationChurchText: string;
  withWhomIWasInitiated: string;
  withWhomIWasInitiatedPlaceholder: string;
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

export function ProfilePersonalSection({
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

export function ProfileChurchesSection({ copy, form, churches, setField }: BaseSectionProps & ChurchesProps) {
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
              setField('currentChurchName', selectChurchName(churches, currentChurchId));
            }}
          >
            <option value="">{copy.selectPlaceholder}</option>
            {churches?.map(church => (
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

export function ProfileInitiationSection({ copy, form, churches, setField }: BaseSectionProps & ChurchesProps) {
  return (
    <div className="space-y-3 rounded-lg bg-slate-100 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            id="isInitiated"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-slate-900"
            checked={form.isInitiated}
            onChange={event => {
              const isChecked = event.target.checked;
              setField('isInitiated', isChecked);
              if (!isChecked) {
                setField('isSponsor', false);
                setField('sponsorChurchIds', []);
                setField('sponsorChurchesText', '');
              }
            }}
          />
          {copy.iAmInitiated}
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            id="isSponsor"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-slate-900"
            checked={form.isSponsor}
            disabled={!form.isInitiated}
            onChange={event => setField('isSponsor', event.target.checked)}
          />
          {copy.iAmSponsor}
        </label>
      </div>

      {form.isInitiated ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-3">
              <label className="text-sm text-slate-700">
                {copy.initiationDate}
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.initiationDate}
                  onChange={event => setField('initiationDate', event.target.value)}
                />
              </label>
              <label className="text-sm text-slate-700">
                {copy.initiationPlace}
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.initiationVenue}
                  onChange={event => setField('initiationVenue', event.target.value)}
                  placeholder={copy.initiationPlacePlaceholder}
                />
              </label>
              <label className="text-sm text-slate-700">
                {copy.whoInitiatedMe}
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.initiatorName}
                  onChange={event => setField('initiatorName', event.target.value)}
                  placeholder={copy.whoInitiatedMePlaceholder}
                />
              </label>
            </div>
            <div className="space-y-3">
              <label className="text-sm text-slate-700">
                {copy.initiationChurchRegistered}
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.initiationChurchId}
                  onChange={event => {
                    const initiationChurchId = event.target.value;
                    setField('initiationChurchId', initiationChurchId);
                    setField('initiationChurchName', selectChurchName(churches, initiationChurchId));
                  }}
                >
                  <option value="">{copy.selectPlaceholder}</option>
                  {churches?.map(church => (
                    <option key={church.id} value={church.id}>
                      {church.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">
                {copy.initiationChurchText}
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.initiationChurchName}
                  onChange={event => setField('initiationChurchName', event.target.value)}
                  placeholder={copy.notRegisteredYet}
                />
              </label>
              <label className="text-sm text-slate-700">
                {copy.withWhomIWasInitiated}
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.initiatedWith}
                  onChange={event => setField('initiatedWith', event.target.value)}
                  placeholder={copy.withWhomIWasInitiatedPlaceholder}
                />
              </label>
            </div>
          </div>

          {form.isSponsor ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-700">
                {copy.sponsorChurchesRegistered}
                <select
                  multiple
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.sponsorChurchIds}
                  onChange={event => {
                    const selected = Array.from(event.target.selectedOptions).map(option => option.value);
                    setField('sponsorChurchIds', selected);
                  }}
                  size={Math.min(churches?.length ?? 4, 6)}
                >
                  {churches?.map(church => (
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
                  value={form.sponsorChurchesText}
                  onChange={event => setField('sponsorChurchesText', event.target.value)}
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

export function ProfileRolesSection({ copy, form, setField }: BaseSectionProps) {
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
