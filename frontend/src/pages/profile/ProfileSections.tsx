import type { ChurchInfo } from '../../lib/works';
import { avatarFallback, type ProfileFormFieldSetter, type ProfileFormState } from './form';

type ChurchesProps = {
  churches?: ChurchInfo[];
};

type BaseSectionProps = {
  copy: ProfileSectionsCopy;
  form: ProfileFormState;
  setField: ProfileFormFieldSetter;
};

type TextProfileField = {
  [K in keyof ProfileFormState]: ProfileFormState[K] extends string ? K : never;
}[keyof ProfileFormState];

export type ProfileSectionsCopy = {
  identity: string;
  residence: string;
  association: string;
  memberLinked: string;
  name: string;
  yourName: string;
  firstName: string;
  surname: string;
  fullName: string;
  email: string;
  email2: string;
  phone: string;
  mobile: string;
  optional: string;
  fiscalCode: string;
  sex: string;
  sexFemale: string;
  sexMale: string;
  birthDate: string;
  birthPlace: string;
  birthProvince: string;
  birthCountry: string;
  citizenship: string;
  nationality: string;
  address: string;
  postalCode: string;
  city: string;
  state: string;
  province: string;
  region: string;
  country: string;
  profession: string;
  memberCode: string;
  memberStatus: string;
  group: string;
  category: string;
  cardNumber: string;
  cardExpiry: string;
  referenceSeat: string;
  originSociety: string;
  registrationRequestDate: string;
  registrationDate: string;
  renewalDate: string;
  cancellationDate: string;
  firstWorkDate: string;
  identityDocumentPrimary: string;
  identityDocumentSecondary: string;
  membershipFeeAmount: string;
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

function TextInput<K extends TextProfileField>({
  field,
  form,
  label,
  placeholder,
  setField,
  type = 'text'
}: BaseSectionProps & {
  field: K;
  label: string;
  placeholder?: string;
  type?: 'date' | 'email' | 'number' | 'text';
}) {
  return (
    <label className="text-sm text-slate-700">
      {label}
      <input
        type={type}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        value={form[field]}
        onChange={event => setField(field, event.target.value as ProfileFormState[K])}
        placeholder={placeholder}
      />
    </label>
  );
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
        <TextInput copy={copy} field="displayName" form={form} label={copy.name} placeholder={copy.yourName} setField={setField} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextInput copy={copy} field="firstName" form={form} label={copy.firstName} setField={setField} />
          <TextInput copy={copy} field="surname" form={form} label={copy.surname} setField={setField} />
          <TextInput copy={copy} field="fullName" form={form} label={copy.fullName} setField={setField} />
        </div>
        <label className="text-sm text-slate-700">
          {copy.email}
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            value={form.email}
            readOnly
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextInput copy={copy} field="email2" form={form} label={copy.email2} setField={setField} type="email" />
          <TextInput copy={copy} field="phone" form={form} label={copy.phone} placeholder={copy.optional} setField={setField} />
          <TextInput copy={copy} field="mobile" form={form} label={copy.mobile} placeholder={copy.optional} setField={setField} />
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

export function ProfileIdentitySection({ copy, form, setField }: BaseSectionProps) {
  return (
    <section className="space-y-3 rounded-lg bg-slate-100 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{copy.identity}</h2>
        {form.memberId ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            {copy.memberLinked}: {form.memberId}
          </span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextInput copy={copy} field="fiscalCode" form={form} label={copy.fiscalCode} setField={setField} />
        <label className="text-sm text-slate-700">
          {copy.sex}
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.sex}
            onChange={event => setField('sex', event.target.value)}
          >
            <option value="">{copy.selectPlaceholder}</option>
            <option value="F">{copy.sexFemale}</option>
            <option value="M">{copy.sexMale}</option>
          </select>
        </label>
        <TextInput copy={copy} field="birthDate" form={form} label={copy.birthDate} setField={setField} type="date" />
        <TextInput copy={copy} field="birthPlace" form={form} label={copy.birthPlace} setField={setField} />
        <TextInput copy={copy} field="birthProvince" form={form} label={copy.birthProvince} setField={setField} />
        <TextInput copy={copy} field="birthCountry" form={form} label={copy.birthCountry} setField={setField} />
        <TextInput copy={copy} field="citizenship" form={form} label={copy.citizenship} setField={setField} />
        <TextInput copy={copy} field="nationality" form={form} label={copy.nationality} setField={setField} />
        <TextInput copy={copy} field="profession" form={form} label={copy.profession} setField={setField} />
      </div>
    </section>
  );
}

export function ProfileResidenceSection({ copy, form, setField }: BaseSectionProps) {
  return (
    <section className="space-y-3 rounded-lg bg-slate-100 p-3">
      <h2 className="text-sm font-semibold text-slate-900">{copy.residence}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <TextInput copy={copy} field="address" form={form} label={copy.address} setField={setField} />
        </div>
        <TextInput copy={copy} field="postalCode" form={form} label={copy.postalCode} setField={setField} />
        <TextInput copy={copy} field="city" form={form} label={copy.city} setField={setField} />
        <TextInput copy={copy} field="province" form={form} label={copy.province} setField={setField} />
        <TextInput copy={copy} field="state" form={form} label={copy.state} setField={setField} />
        <TextInput copy={copy} field="region" form={form} label={copy.region} setField={setField} />
        <TextInput copy={copy} field="country" form={form} label={copy.country} setField={setField} />
      </div>
    </section>
  );
}

export function ProfileAssociationSection({ copy, form, setField }: BaseSectionProps) {
  return (
    <section className="space-y-3 rounded-lg bg-slate-100 p-3">
      <h2 className="text-sm font-semibold text-slate-900">{copy.association}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextInput copy={copy} field="memberCode" form={form} label={copy.memberCode} setField={setField} />
        <TextInput copy={copy} field="memberStatus" form={form} label={copy.memberStatus} setField={setField} />
        <TextInput copy={copy} field="group" form={form} label={copy.group} setField={setField} />
        <TextInput copy={copy} field="category" form={form} label={copy.category} setField={setField} />
        <TextInput copy={copy} field="cardNumber" form={form} label={copy.cardNumber} setField={setField} />
        <TextInput copy={copy} field="cardExpiry" form={form} label={copy.cardExpiry} setField={setField} />
        <TextInput copy={copy} field="referenceSeat" form={form} label={copy.referenceSeat} setField={setField} />
        <TextInput copy={copy} field="originSociety" form={form} label={copy.originSociety} setField={setField} />
        <TextInput copy={copy} field="registrationRequestDate" form={form} label={copy.registrationRequestDate} setField={setField} type="date" />
        <TextInput copy={copy} field="registrationDate" form={form} label={copy.registrationDate} setField={setField} type="date" />
        <TextInput copy={copy} field="renewalDate" form={form} label={copy.renewalDate} setField={setField} type="date" />
        <TextInput copy={copy} field="cancellationDate" form={form} label={copy.cancellationDate} setField={setField} type="date" />
        <TextInput copy={copy} field="firstWorkDate" form={form} label={copy.firstWorkDate} setField={setField} type="date" />
        <TextInput copy={copy} field="membershipFeeAmount" form={form} label={copy.membershipFeeAmount} setField={setField} type="number" />
      </div>
    </section>
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
