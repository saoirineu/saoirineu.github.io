import { useId, useRef, type ReactNode } from 'react';

import { isValidOptionalFiscalCode } from '../../lib/fiscalCode';
import {
  birthPlaceOptions,
  countryName,
  countryOptions,
  findCountryCode,
  findLocationCode,
  ITALIAN_REFERENCE_CHURCHES,
  MAX_DOCTRINE_ROLES,
  optionName,
  provinceOptions,
  type ProfileLocale
} from '../../lib/profileCatalog';
import type { ChurchInfo } from '../../lib/works';
import { PROFILE_BIRTH_DATE_PICKER_START, avatarFallback, isValidOptionalEmail, requiredProfileTextFields, type ProfileFormFieldSetter, type ProfileFormState } from './form';

/** Shared classes for an input/select that is present but disabled (grayed). */
const disabledFieldClass = 'bg-slate-100 text-slate-400 cursor-not-allowed';

/** Red asterisk marking a required field, matching the ICEFLU form. */
function RequiredMark() {
  return <span className="text-red-500"> *</span>;
}

type ChurchesProps = {
  churches?: ChurchInfo[];
};

const ADD_CHURCH_VALUE = '__add_church__';

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
  nameHint: string;
  fullNameHint: string;
  emailHint: string;
  email2Hint: string;
  firstName: string;
  surname: string;
  fullName: string;
  email: string;
  email2: string;
  preferredCommunicationEmail: string;
  preferredLoginEmail: string;
  preferredSecondaryEmail: string;
  phone: string;
  mobile: string;
  optional: string;
  fiscalCode: string;
  fiscalCodeInvalid: string;
  idNumber: string;
  idType: string;
  idTypePassport: string;
  idTypeIdCard: string;
  idTypeOther: string;
  idTypeOtherSpecify: string;
  sex: string;
  sexFemale: string;
  sexMale: string;
  sexHint: string;
  birthDate: string;
  birthDateMonthShortNames: string[];
  birthPlace: string;
  birthProvince: string;
  birthCountry: string;
  citizenship: string;
  citizenshipAdd: string;
  citizenshipRemove: string;
  citizenshipCurrent: string;
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
  alreadyParticipatedInSantoDaimeWork: string;
  neverParticipatedInSantoDaimeWork: string;
  firstWorkDate: string;
  firstWorkChurchOrCenter: string;
  identityDocumentPrimary: string;
  identityDocumentSecondary: string;
  membershipFeeAmount: string;
  avatar: string;
  avatarUrl: string;
  useGooglePhoto: string;
  currentChurchRegistered: string;
  referenceChurchOrCenter: string;
  addReferenceChurch: string;
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
  initiationChurchOrCenter: string;
  initiationChurchText: string;
  withWhomIWasInitiated: string;
  withWhomIWasInitiatedPlaceholder: string;
  sponsorChurchesRegistered: string;
  sponsorChurchesText: string;
  sponsorChurchesPlaceholder: string;
  roles: string;
  rolesPlaceholder: string;
  rolesHint: string;
  roleSelectPlaceholder: string;
  roleCustomLabel: string;
  roleCustomPlaceholder: string;
  roleAdd: string;
  roleRemove: string;
  roleLimitReached: string;
  doctrineRoleOptions: Array<{ value: string; label: string }>;
  icefluOnlyNote: string;
  nationalityQuestion: string;
  nationalityItalian: string;
  nationalityNonItalian: string;
  nationalityHint: string;
  information: string;
  privacyDocumentLink: string;
  privacyDocumentUrl: string;
  statuteDocumentLink: string;
  statuteDocumentUrl: string;
  privacyLabel: string;
  privacyText: string;
  declarationLabel: string;
  declarationText: string;
  consentAgree: string;
  consentDisagree: string;
};

function selectChurchName(churches: ChurchInfo[] | undefined, id: string) {
  return churches?.find(church => church.id === id)?.name ?? '';
}

/**
 * Hint bubble next to a field label. A plain `title` attribute only shows after
 * a second of motionless hover and does nothing at all on touch screens, so the
 * tooltip is drawn here: it opens on hover, on keyboard focus and on tap.
 *
 * The button sits inside a <label>, so its click is swallowed — otherwise the
 * label would forward the activation to the field it wraps.
 */
function InfoIcon({ title }: { title: string }) {
  const tooltipId = useId();
  return (
    <span className="group relative ml-1 inline-block">
      <button
        type="button"
        aria-describedby={tooltipId}
        onClick={event => event.preventDefault()}
        className="cursor-help text-slate-400 transition hover:text-slate-600 focus:text-slate-600 focus:outline-none"
      >
        ⓘ
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-56 max-w-[70vw] -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1.5 text-xs font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {title}
      </span>
    </span>
  );
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function isItalianReferenceChurch(church: ChurchInfo) {
  return ITALIAN_REFERENCE_CHURCHES.some(reference => reference.id === church.id || reference.name === church.name);
}

function formatDateWithShortMonth(value: string, monthShortNames: string[]) {
  const [year, month, day] = value.split('-');
  const monthIndex = Number(month) - 1;
  if (!year || !day || monthIndex < 0 || monthIndex >= monthShortNames.length) return value;
  return `${day}/${monthShortNames[monthIndex]}/${year}`;
}

/**
 * An ICEFLU profile text field. On this form every active field is required, so
 * `required` doubles as the enabled flag: required → editable + asterisk;
 * not required → disabled + grayed (an extra field or the inactive variant).
 */
function TextInput<K extends TextProfileField>({
  field,
  form,
  label,
  placeholder,
  setField,
  type = 'text',
  required,
  disabled: disabledProp,
  hint,
  invalidMessage
}: BaseSectionProps & {
  field: K;
  label: string;
  placeholder?: string;
  type?: 'date' | 'email' | 'number' | 'text';
  required: boolean;
  disabled?: boolean;
  hint?: string;
  /** Shown under the field, and turns the border red, while the value is rejected. */
  invalidMessage?: string;
}) {
  const disabled = disabledProp ?? !required;
  const value = form[field];
  const invalid = Boolean(invalidMessage);
  return (
    <label className={`text-sm ${disabled ? 'text-slate-400' : 'text-slate-700'}`}>
      {label}
      {required ? <RequiredMark /> : null}
      {hint ? <InfoIcon title={hint} /> : null}
      <input
        type={type}
        disabled={disabled}
        aria-invalid={invalid}
        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${invalid ? 'border-red-500 focus:border-red-500 focus:outline-red-500' : 'border-slate-200'} ${disabled ? disabledFieldClass : ''}`}
        value={value}
        onChange={event => setField(field, event.target.value as ProfileFormState[K])}
        placeholder={placeholder}
      />
      {invalid ? <p className="mt-1 text-xs text-red-600">{invalidMessage}</p> : null}
    </label>
  );
}

/** Date field shown as DD/MMM/YYYY, backed by a hidden native date picker. */
function MonthNameDateInput({
  label,
  value,
  monthShortNames,
  onChange,
  required = false,
  disabled = false
}: {
  label: ReactNode;
  value: string;
  monthShortNames: string[];
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const displayValue = formatDateWithShortMonth(value, monthShortNames);

  const openPicker = () => {
    const input = dateInputRef.current;
    if (!input || disabled) return;
    if (!value) input.value = PROFILE_BIRTH_DATE_PICKER_START;
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
      return;
    }
    input.click();
  };

  return (
    <label className={`relative text-sm ${disabled ? 'text-slate-400' : 'text-slate-700'}`}>
      {label}
      {required ? <RequiredMark /> : null}
      <input
        type="text"
        readOnly
        disabled={disabled}
        className={`mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm ${disabled ? disabledFieldClass : 'cursor-pointer bg-white'}`}
        value={displayValue}
        onClick={openPicker}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPicker();
          }
        }}
        placeholder="DD/MMM/YYYY"
      />
      <input
        ref={dateInputRef}
        type="date"
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute bottom-0 right-0 h-px w-px opacity-0"
        value={value}
        onChange={event => onChange(event.target.value)}
        onBlur={event => {
          if (!value && event.currentTarget.value === PROFILE_BIRTH_DATE_PICKER_START) {
            event.currentTarget.value = '';
          }
        }}
      />
    </label>
  );
}

function BirthDateInput({ copy, form, required, setField }: BaseSectionProps & { required: boolean }) {
  return (
    <MonthNameDateInput
      label={copy.birthDate}
      value={form.birthDate}
      monthShortNames={copy.birthDateMonthShortNames}
      required={required}
      disabled={!required}
      onChange={value => setField('birthDate', value)}
    />
  );
}

function CountrySelect<K extends TextProfileField>({
  codeField,
  field,
  form,
  label,
  locale,
  required,
  setField,
  copy
}: BaseSectionProps & {
  codeField: TextProfileField;
  field: K;
  label: string;
  locale: ProfileLocale;
  required: boolean;
}) {
  const selectedCode = form[codeField] || findCountryCode(form[field], locale);
  const selectedValue = selectedCode || (form[field] ? '__current__' : '');

  return (
    <label className="text-sm text-slate-700">
      {label}
      {required ? <RequiredMark /> : null}
      <select
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        value={selectedValue}
        onChange={event => {
          const code = event.target.value;
          if (code === '__current__') return;
          setField(codeField, code);
          setField(field, (code ? countryName(code, locale) : '') as ProfileFormState[K]);
          if (field === 'birthCountry') {
            setField('birthProvinceCode', '');
            setField('birthPlaceCode', '');
          }
          if (field === 'country') {
            setField('province', '');
          }
        }}
      >
        <option value="">{copy.selectPlaceholder}</option>
        {form[field] && !selectedCode ? (
          <option value="__current__">{form[field]}</option>
        ) : null}
        {countryOptions(locale).map(option => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function BirthProvinceInput({ copy, form, locale, required, setField }: BaseSectionProps & { locale: ProfileLocale; required: boolean }) {
  const birthCountryCode = form.birthCountryCode || findCountryCode(form.birthCountry, locale);
  const options = provinceOptions(birthCountryCode);
  const selectedCode = form.birthProvinceCode || findLocationCode(form.birthProvince, options);
  const selectedValue = selectedCode || (form.birthProvince ? '__current__' : '');

  if (!options.length) {
    // Free text once a country with no preset list is chosen; disabled until then.
    const hasCountry = Boolean(birthCountryCode || form.birthCountry.trim());
    return <TextInput copy={copy} field="birthProvince" form={form} label={copy.birthProvince} setField={setField} disabled={!hasCountry} required={required} />;
  }

  return (
    <label className="text-sm text-slate-700">
      {copy.birthProvince}
      {required ? <RequiredMark /> : null}
      <select
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        value={selectedValue}
        onChange={event => {
          const code = event.target.value;
          if (code === '__current__') return;
          setField('birthProvinceCode', code);
          setField('birthProvince', optionName(code, options));
          setField('birthPlaceCode', '');
        }}
      >
        <option value="">{copy.selectPlaceholder}</option>
        {form.birthProvince && !selectedCode ? (
          <option value="__current__">
            {form.birthProvince}
          </option>
        ) : null}
        {options.map(option => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function BirthPlaceInput({ copy, form, locale, required, setField }: BaseSectionProps & { locale: ProfileLocale; required: boolean }) {
  const birthCountryCode = form.birthCountryCode || findCountryCode(form.birthCountry, locale);
  const provinceCode = form.birthProvinceCode || findLocationCode(form.birthProvince, provinceOptions(birthCountryCode));
  const options = birthPlaceOptions(birthCountryCode, provinceCode);
  const listId = `birth-place-options-${birthCountryCode || 'free'}-${provinceCode || 'all'}`;

  return (
    <label className="text-sm text-slate-700">
      {copy.birthPlace}
      {required ? <RequiredMark /> : null}
      <input
        list={options.length ? listId : undefined}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        value={form.birthPlace}
        onChange={event => {
          const value = event.target.value;
          setField('birthPlace', value);
          setField('birthPlaceCode', findLocationCode(value, options));
        }}
      />
      {options.length ? (
        <datalist id={listId}>
          {options.map(option => (
            <option key={`${option.provinceCode}-${option.code}`} value={option.name} />
          ))}
        </datalist>
      ) : null}
    </label>
  );
}

function CitizenshipSelector({ copy, form, locale, setField }: BaseSectionProps & { locale: ProfileLocale }) {
  const selectedCodes = form.citizenshipCountryCodes;

  const syncCitizenship = (codes: string[]) => {
    const nextCodes = uniqueStrings(codes);
    setField('citizenshipCountryCodes', nextCodes);
    setField('citizenship', nextCodes.map(code => countryName(code, locale)).join(', '));
  };

  return (
    <div className="space-y-2 text-sm text-slate-700">
      <label>
        {copy.citizenship}
        <RequiredMark />
        <select
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value=""
          onChange={event => {
            const code = event.target.value;
            if (!code) return;
            syncCitizenship([...selectedCodes, code]);
          }}
        >
          <option value="">{copy.selectPlaceholder}</option>
          {countryOptions(locale).map(option => (
            <option key={option.code} value={option.code} disabled={selectedCodes.includes(option.code)}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      {form.citizenship && selectedCodes.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          {copy.citizenshipCurrent}: {form.citizenship}
        </p>
      ) : null}
      {selectedCodes.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedCodes.map(code => (
            <button
              key={code}
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
              onClick={() => syncCitizenship(selectedCodes.filter(item => item !== code))}
              title={copy.citizenshipRemove}
            >
              {countryName(code, locale)} ×
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Declaration that gates the ICEFLU field set between the Italian and non-Italian variants. */
export function ProfileNationalityDeclaration({ copy, form, setField }: BaseSectionProps) {
  return (
    <section className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3">
      <h2 className="text-sm font-semibold text-slate-900">{copy.nationalityQuestion}</h2>
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="radio"
            name="isItalian"
            className="h-4 w-4 border-slate-300 text-slate-900"
            checked={form.isItalian}
            onChange={() => setField('isItalian', true)}
          />
          {copy.nationalityItalian}
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="radio"
            name="isItalian"
            className="h-4 w-4 border-slate-300 text-slate-900"
            checked={!form.isItalian}
            onChange={() => setField('isItalian', false)}
          />
          {copy.nationalityNonItalian}
        </label>
      </div>
      <p className="text-xs text-slate-500">{copy.nationalityHint}</p>
    </section>
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
  // ICEFLU uses "Telefono" (Italian form) vs "Mobile" (non-Italian form) — one
  // phone field per variant. The other stays visible but disabled.
  const required = new Set(requiredProfileTextFields(form.isItalian));
  const secondaryEmailHasValue = form.email2.trim().length > 0;
  const secondaryEmailValid = isValidOptionalEmail(form.email2);
  const secondaryEmailAvailable = secondaryEmailHasValue && secondaryEmailValid;
  const preferredCommunicationEmail = form.preferredCommunicationEmail === 'secondary' && secondaryEmailAvailable
    ? 'secondary'
    : 'login';

  return (
    <div className="grid gap-4 rounded-lg bg-slate-100 p-3 sm:grid-cols-[1fr,240px]">
      <div className="space-y-3">
        <TextInput copy={copy} field="displayName" form={form} label={copy.name} placeholder={copy.yourName} setField={setField} disabled={false} hint={copy.nameHint} required={required.has('displayName')} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextInput copy={copy} field="firstName" form={form} label={copy.firstName} setField={setField} required={required.has('firstName')} />
          <TextInput copy={copy} field="surname" form={form} label={copy.surname} setField={setField} required={required.has('surname')} />
          <TextInput copy={copy} field="fullName" form={form} label={copy.fullName} setField={setField} disabled={false} hint={copy.fullNameHint} required={required.has('fullName')} />
        </div>
        <label className="text-sm text-slate-700">
          {copy.email}
          <RequiredMark />
          <InfoIcon title={copy.emailHint} />
          <input
            className={`mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm ${disabledFieldClass}`}
            value={form.email}
            readOnly
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-sm text-slate-700">
            {copy.email2}
            <InfoIcon title={copy.email2Hint} />
            <input
              type="email"
              aria-invalid={!secondaryEmailValid}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${secondaryEmailValid ? 'border-slate-200' : 'border-red-500 focus:border-red-500 focus:outline-red-500'}`}
              value={form.email2}
              onChange={event => {
                const nextEmail = event.target.value;
                setField('email2', nextEmail);
                if ((!nextEmail.trim() || !isValidOptionalEmail(nextEmail)) && form.preferredCommunicationEmail === 'secondary') {
                  setField('preferredCommunicationEmail', 'login');
                }
              }}
              placeholder={copy.optional}
            />
          </label>
          <TextInput copy={copy} field="phone" form={form} label={copy.phone} placeholder={copy.optional} setField={setField} disabled={false} required={required.has('phone')} />
          <TextInput copy={copy} field="mobile" form={form} label={copy.mobile} setField={setField} required={required.has('mobile')} />
          <fieldset className="sm:col-span-3 rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
            <legend className="px-1 text-sm font-medium text-slate-700">{copy.preferredCommunicationEmail}</legend>
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
                <input
                  type="radio"
                  name="preferredCommunicationEmail"
                  className="h-4 w-4 border-slate-300 text-slate-900"
                  checked={preferredCommunicationEmail === 'login'}
                  onChange={() => setField('preferredCommunicationEmail', 'login')}
                />
                {copy.preferredLoginEmail}
              </label>
              <label className={`inline-flex items-center gap-2 text-sm font-medium ${secondaryEmailAvailable ? 'text-slate-800' : 'text-slate-400'}`}>
                <input
                  type="radio"
                  name="preferredCommunicationEmail"
                  className="h-4 w-4 border-slate-300 text-slate-900 disabled:cursor-not-allowed"
                  checked={preferredCommunicationEmail === 'secondary'}
                  disabled={!secondaryEmailAvailable}
                  onChange={() => setField('preferredCommunicationEmail', 'secondary')}
                />
                {copy.preferredSecondaryEmail}
              </label>
            </div>
          </fieldset>
        </div>
      </div>
      <fieldset disabled className="flex min-w-0 flex-col items-center gap-3 rounded-lg bg-white/60 p-3 opacity-60 shadow-sm">
        <img
          src={resolvedAvatar}
          alt={copy.avatar}
          className="h-28 w-28 rounded-full border border-slate-200 object-cover shadow-sm"
        />
        <label className="w-full text-sm text-slate-400">
          {copy.avatarUrl}
          <input
            className={`mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm ${disabledFieldClass}`}
            value={form.avatarUrl}
            onChange={event => setField('avatarUrl', event.target.value)}
            placeholder="https://..."
          />
        </label>
        {userPhotoURL ? (
          <button
            type="button"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-400"
            onClick={() => setField('avatarUrl', userPhotoURL)}
          >
            {copy.useGooglePhoto}
          </button>
        ) : null}
      </fieldset>
    </div>
  );
}

export function ProfileIdentitySection({ copy, form, locale, setField }: BaseSectionProps & { locale: ProfileLocale }) {
  // Some fields are optional depending on the nationality mode, but still editable.
  const required = new Set(requiredProfileTextFields(form.isItalian));
  const sexRequired = required.has('sex');
  // The codice fiscale has a fixed shape, so a typed-but-malformed one is
  // flagged (an empty one is a missing required field, not a malformed one).
  // Non-Italians put an ID document number in the same field, in whatever
  // format their country issues, so nothing is checked there.
  const fiscalCodeInvalid = form.isItalian && !isValidOptionalFiscalCode(form.fiscalCode);
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
        <TextInput
          copy={copy}
          field="fiscalCode"
          form={form}
          label={form.isItalian ? copy.fiscalCode : copy.idNumber}
          setField={setField}
          required={required.has('fiscalCode')}
          invalidMessage={fiscalCodeInvalid ? copy.fiscalCodeInvalid : undefined}
        />
        {form.isItalian ? null : (
          <>
            <label className="text-sm text-slate-700">
              {copy.idType}
              <RequiredMark />
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={form.idType}
                onChange={event => setField('idType', event.target.value)}
              >
                <option value="">{copy.selectPlaceholder}</option>
                <option value="passport">{copy.idTypePassport}</option>
                <option value="idCard">{copy.idTypeIdCard}</option>
                <option value="other">{copy.idTypeOther}</option>
              </select>
            </label>
            {form.idType === 'other' ? (
              <TextInput copy={copy} field="idTypeOther" form={form} label={copy.idTypeOtherSpecify} setField={setField} required />
            ) : null}
          </>
        )}
        <label className="text-sm text-slate-700">
          {copy.sex}
          {sexRequired ? <RequiredMark /> : null}
          <InfoIcon title={copy.sexHint} />
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={form.sex}
            onChange={event => setField('sex', event.target.value)}
          >
            <option value="">{copy.selectPlaceholder}</option>
            <option value="M">{copy.sexMale}</option>
            <option value="F">{copy.sexFemale}</option>
          </select>
        </label>
        <BirthDateInput copy={copy} form={form} setField={setField} required={required.has('birthDate')} />
        <CountrySelect copy={copy} codeField="birthCountryCode" field="birthCountry" form={form} label={copy.birthCountry} locale={locale} setField={setField} required={required.has('birthCountry')} />
        <BirthProvinceInput copy={copy} form={form} locale={locale} setField={setField} required={required.has('birthProvince')} />
        <BirthPlaceInput copy={copy} form={form} locale={locale} setField={setField} required={required.has('birthPlace')} />
        <CitizenshipSelector copy={copy} form={form} locale={locale} setField={setField} />
        <TextInput copy={copy} field="profession" form={form} label={copy.profession} setField={setField} required={required.has('profession')} />
      </div>
    </section>
  );
}

/**
 * Single residence subdivision field. Like the Identity card's birth province,
 * it becomes a dropdown when the residence country has known options (Italy or
 * Brazil) and a free-text input otherwise. Labelled "Provincia" for Italy and
 * "State" for every other country, and always stored in `province`.
 */
function ResidenceProvinceInput({ copy, form, locale, required, setField }: BaseSectionProps & { locale: ProfileLocale; required: boolean }) {
  const countryCode = form.countryCode || findCountryCode(form.country, locale);
  const options = provinceOptions(countryCode);
  const label = countryCode === 'IT' ? copy.province : copy.state;
  const hasCountry = Boolean(countryCode || form.country.trim());

  if (!options.length) {
    return <TextInput copy={copy} field="province" form={form} label={label} setField={setField} disabled={!hasCountry} required={required} />;
  }

  const selectedCode = findLocationCode(form.province, options);
  const selectedValue = selectedCode || (form.province ? '__current__' : '');

  return (
    <label className="text-sm text-slate-700">
      {label}
      {required ? <RequiredMark /> : null}
      <select
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        value={selectedValue}
        onChange={event => {
          const code = event.target.value;
          if (code === '__current__') return;
          setField('province', optionName(code, options));
        }}
      >
        <option value="">{copy.selectPlaceholder}</option>
        {form.province && !selectedCode ? (
          <option value="__current__">{form.province}</option>
        ) : null}
        {options.map(option => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProfileResidenceSection({ copy, form, locale, setField }: BaseSectionProps & { locale: ProfileLocale }) {
  const required = new Set(requiredProfileTextFields(form.isItalian));
  return (
    <section className="space-y-3 rounded-lg bg-slate-100 p-3">
      <h2 className="text-sm font-semibold text-slate-900">{copy.residence}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <TextInput copy={copy} field="address" form={form} label={copy.address} setField={setField} required={required.has('address')} />
        </div>
        <TextInput copy={copy} field="postalCode" form={form} label={copy.postalCode} setField={setField} required={required.has('postalCode')} />
        <TextInput copy={copy} field="city" form={form} label={copy.city} setField={setField} required={required.has('city')} />
        <CountrySelect copy={copy} codeField="countryCode" field="country" form={form} label={copy.country} locale={locale} setField={setField} required={required.has('country')} />
        <ResidenceProvinceInput copy={copy} form={form} locale={locale} setField={setField} required={required.has('province')} />
      </div>
    </section>
  );
}

export function ProfileChurchesSection({
  copy,
  form,
  churches,
  onRequestCreateChurch,
  setField
}: BaseSectionProps & ChurchesProps & {
  onRequestCreateChurch: (onCreated: (churchId: string, churchName?: string) => void) => void;
}) {
  const churchOptions = (churches ?? []).filter(church => !form.isItalian || isItalianReferenceChurch(church));
  const selectedChurch = form.currentChurchId ? churches?.find(church => church.id === form.currentChurchId) : null;
  const selectedFirstWorkChurch = form.firstWorkChurchId ? churches?.find(church => church.id === form.firstWorkChurchId) : null;
  const firstWorkDisabled = !form.hasParticipatedInSantoDaimeWork;
  const visibleChurches = selectedChurch && !churchOptions.some(church => church.id === selectedChurch.id)
    ? [...churchOptions, selectedChurch]
    : churchOptions;

  return (
    <section className="space-y-3 rounded-lg bg-slate-100 p-3">
      <label className="text-sm text-slate-700">
        {copy.referenceChurchOrCenter}
        <select
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={form.currentChurchId}
          onChange={event => {
            const currentChurchId = event.target.value;
            if (currentChurchId === ADD_CHURCH_VALUE) {
              onRequestCreateChurch((churchId, churchName) => {
                setField('currentChurchId', churchId);
                setField('currentChurchName', churchName || selectChurchName(churches, churchId));
              });
              return;
            }
            setField('currentChurchId', currentChurchId);
            setField('currentChurchName', selectChurchName(churches, currentChurchId));
          }}
        >
          <option value="">{copy.selectPlaceholder}</option>
          {visibleChurches.map(church => (
            <option key={church.id} value={church.id}>
              {church.name}
            </option>
          ))}
          <option value={ADD_CHURCH_VALUE}>+ {copy.addReferenceChurch}</option>
        </select>
      </label>
      <fieldset className="flex flex-col gap-2 border-0 p-0 sm:flex-row sm:items-center sm:gap-4">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="radio"
            name="hasParticipatedInSantoDaimeWork"
            className="h-4 w-4 border-slate-300 text-slate-900"
            checked={form.hasParticipatedInSantoDaimeWork}
            onChange={() => setField('hasParticipatedInSantoDaimeWork', true)}
          />
          {copy.alreadyParticipatedInSantoDaimeWork}
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="radio"
            name="hasParticipatedInSantoDaimeWork"
            className="h-4 w-4 border-slate-300 text-slate-900"
            checked={!form.hasParticipatedInSantoDaimeWork}
            onChange={() => {
              setField('hasParticipatedInSantoDaimeWork', false);
              setField('firstWorkDate', '');
              setField('firstWorkChurchId', '');
              setField('firstWorkChurchName', '');
            }}
          />
          {copy.neverParticipatedInSantoDaimeWork}
        </label>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <MonthNameDateInput
          label={copy.firstWorkDate}
          value={form.firstWorkDate}
          monthShortNames={copy.birthDateMonthShortNames}
          onChange={value => setField('firstWorkDate', value)}
          disabled={firstWorkDisabled}
        />
        <label className={`text-sm ${firstWorkDisabled ? 'text-slate-400' : 'text-slate-700'}`}>
          {copy.firstWorkChurchOrCenter}
          <select
            disabled={firstWorkDisabled}
            className={`mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm ${firstWorkDisabled ? disabledFieldClass : 'bg-white'}`}
            value={form.firstWorkChurchId}
            onChange={event => {
              const firstWorkChurchId = event.target.value;
              if (firstWorkChurchId === ADD_CHURCH_VALUE) {
                onRequestCreateChurch((churchId, churchName) => {
                  setField('firstWorkChurchId', churchId);
                  setField('firstWorkChurchName', churchName || selectChurchName(churches, churchId));
                });
                return;
              }
              setField('firstWorkChurchId', firstWorkChurchId);
              setField('firstWorkChurchName', selectChurchName(churches, firstWorkChurchId));
            }}
          >
            <option value="">{copy.selectPlaceholder}</option>
            {churches?.map(church => (
              <option key={church.id} value={church.id}>
                {church.name}
              </option>
            ))}
            {selectedFirstWorkChurch && !churches?.some(church => church.id === selectedFirstWorkChurch.id) ? (
              <option value={selectedFirstWorkChurch.id}>{selectedFirstWorkChurch.name}</option>
            ) : null}
            <option value={ADD_CHURCH_VALUE}>+ {copy.addReferenceChurch}</option>
          </select>
        </label>
      </div>
    </section>
  );
}

/** ICEFLU "Informative": required Privacy + Declaration consents (agree / not agree). */
export function ProfileConsentsSection({ copy, form, setField }: BaseSectionProps) {
  const items: Array<{ field: 'privacyConsent' | 'declarationConsent'; label: string; text: string }> = [
    { field: 'privacyConsent', label: copy.privacyLabel, text: copy.privacyText },
    { field: 'declarationConsent', label: copy.declarationLabel, text: copy.declarationText }
  ];
  return (
    <section className="space-y-4 rounded-lg bg-slate-100 p-3">
      <h2 className="text-sm font-semibold text-slate-900">{copy.information}</h2>
      <div className="flex flex-wrap gap-3 text-sm">
        <a className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2" href={copy.privacyDocumentUrl} target="_blank" rel="noreferrer">
          {copy.privacyDocumentLink}
        </a>
        <a className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2" href={copy.statuteDocumentUrl} target="_blank" rel="noreferrer">
          {copy.statuteDocumentLink}
        </a>
      </div>
      {items.map(item => (
        <div key={item.field} className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">
            {item.label}
            <RequiredMark />
          </h3>
          <p className="text-sm text-slate-600">{item.text}</p>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="radio"
                name={item.field}
                className="h-4 w-4 border-slate-300 text-slate-900"
                checked={form[item.field] === 'agree'}
                onChange={() => setField(item.field, 'agree')}
              />
              {copy.consentAgree}
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="radio"
                name={item.field}
                className="h-4 w-4 border-slate-300 text-slate-900"
                checked={form[item.field] === 'disagree'}
                onChange={() => setField(item.field, 'disagree')}
              />
              {copy.consentDisagree}
            </label>
          </div>
        </div>
      ))}
    </section>
  );
}

/** ICEFLU "Nota": a free, optional notes field. */
export function ProfileNotesSection({ copy, form, setField }: BaseSectionProps) {
  return (
    <section className="space-y-2 rounded-lg bg-slate-100 p-3">
      <label className="text-sm text-slate-700">
        {copy.notes}
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          rows={3}
          value={form.observations}
          onChange={event => setField('observations', event.target.value)}
        />
      </label>
    </section>
  );
}

export function ProfileInitiationSection({
  copy,
  form,
  churches,
  initiatorNames = [],
  onRequestCreateChurch,
  setField
}: BaseSectionProps & ChurchesProps & {
  initiatorNames?: string[];
  onRequestCreateChurch: (onCreated: (churchId: string, churchName?: string) => void) => void;
}) {
  // Unlike the reference church, the Fardamento church/center is not restricted
  // to Italian reference churches for Italian users.
  const selectedChurch = form.initiationChurchId ? churches?.find(church => church.id === form.initiationChurchId) : null;
  const initiatorListId = 'initiator-name-options';

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
      </div>

      {form.isInitiated ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <MonthNameDateInput
            label={copy.initiationDate}
            value={form.initiationDate}
            monthShortNames={copy.birthDateMonthShortNames}
            onChange={value => setField('initiationDate', value)}
          />
          <label className="text-sm text-slate-700">
            {copy.initiationChurchOrCenter}
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={form.initiationChurchId}
              onChange={event => {
                const initiationChurchId = event.target.value;
                if (initiationChurchId === ADD_CHURCH_VALUE) {
                  onRequestCreateChurch((churchId, churchName) => {
                    setField('initiationChurchId', churchId);
                    setField('initiationChurchName', churchName || selectChurchName(churches, churchId));
                  });
                  return;
                }
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
              {selectedChurch && !churches?.some(church => church.id === selectedChurch.id) ? (
                <option value={selectedChurch.id}>{selectedChurch.name}</option>
              ) : null}
              <option value={ADD_CHURCH_VALUE}>+ {copy.addReferenceChurch}</option>
            </select>
          </label>
          <label className="text-sm text-slate-700">
            {copy.whoInitiatedMe}
            <input
              list={initiatorNames.length ? initiatorListId : undefined}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={form.initiatorName}
              onChange={event => setField('initiatorName', event.target.value)}
              placeholder={copy.whoInitiatedMePlaceholder}
            />
            {initiatorNames.length ? (
              <datalist id={initiatorListId}>
                {initiatorNames.map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            ) : null}
          </label>
        </div>
      ) : null}
    </div>
  );
}

export function ProfileRolesSection({ copy, form, setField }: BaseSectionProps) {
  const selectedRoles = form.doctrineRoles;
  const draftIsCustom = form.doctrineRoleDraft === 'other';
  const roleLimitReached = selectedRoles.length >= MAX_DOCTRINE_ROLES;

  const addRole = (role: string) => {
    const nextRole = role.trim();
    if (!nextRole || selectedRoles.includes(nextRole) || roleLimitReached) return;
    setField('doctrineRoles', [...selectedRoles, nextRole]);
    setField('doctrineRoleDraft', '');
  };

  const roleLabel = (role: string) => copy.doctrineRoleOptions.find(option => option.value === role)?.label ?? role;

  return (
    <section className="space-y-3 rounded-lg bg-slate-100 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          {copy.roles}
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={form.doctrineRoleDraft}
            disabled={roleLimitReached}
            onChange={event => {
              const value = event.target.value;
              if (!value) return;
              if (value === 'other') {
                setField('doctrineRoleDraft', value);
                return;
              }
              addRole(value);
            }}
          >
            <option value="">{copy.roleSelectPlaceholder}</option>
            {copy.doctrineRoleOptions.map(option => (
              <option
                key={option.value}
                value={option.value}
                disabled={selectedRoles.includes(option.value)}
                // "Describe another role" is an action rather than a role, so it
                // is set apart. Option styling is honoured by Chrome and Firefox;
                // Safari draws its own native menu and ignores it.
                className={option.value === 'other' ? 'font-bold' : undefined}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {draftIsCustom ? (
          <label className="text-sm text-slate-700">
            {copy.roleCustomLabel}
            <div className="mt-1 flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.doctrineRolesText}
                onChange={event => setField('doctrineRolesText', event.target.value)}
                placeholder={copy.roleCustomPlaceholder}
              />
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={roleLimitReached || !form.doctrineRolesText.trim()}
                onClick={() => {
                  addRole(form.doctrineRolesText);
                  setField('doctrineRolesText', '');
                }}
              >
                {copy.roleAdd}
              </button>
            </div>
          </label>
        ) : null}
      </div>
      {selectedRoles.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedRoles.map(role => (
            <button
              key={role}
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
              onClick={() => setField('doctrineRoles', selectedRoles.filter(item => item !== role))}
              title={copy.roleRemove}
            >
              {roleLabel(role)} ×
            </button>
          ))}
        </div>
      ) : null}
      <p className="text-xs text-slate-500">
        {roleLimitReached ? copy.roleLimitReached : copy.rolesHint}
      </p>
    </section>
  );
}
