import type { User } from 'firebase/auth';

import type { MemberRecord } from '../../lib/members';
import { MAX_DOCTRINE_ROLES } from '../../lib/profileCatalog';
import type { PreferredCommunicationEmail, UserProfile } from '../../lib/users';

export type ProfileFormState = {
  displayName: string;
  email: string;
  email2: string;
  preferredCommunicationEmail: PreferredCommunicationEmail;
  phone: string;
  mobile: string;
  avatarUrl: string;
  isItalian: boolean;
  privacyConsent: string;
  declarationConsent: string;
  memberId: string;
  surname: string;
  firstName: string;
  fullName: string;
  fiscalCode: string;
  sex: string;
  gender: string;
  genderSelfDescription: string;
  birthDate: string;
  birthPlace: string;
  birthPlaceCode: string;
  birthProvince: string;
  birthProvinceCode: string;
  birthCountry: string;
  birthCountryCode: string;
  citizenship: string;
  citizenshipCountryCodes: string[];
  nationality: string;
  address: string;
  postalCode: string;
  city: string;
  state: string;
  province: string;
  region: string;
  country: string;
  countryCode: string;
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
  identityDocumentPrimaryName: string;
  identityDocumentPrimaryPath: string;
  identityDocumentSecondaryName: string;
  identityDocumentSecondaryPath: string;
  membershipFeeAmount: string;
  currentChurchId: string;
  currentChurchName: string;
  originChurchName: string;
  isInitiated: boolean;
  initiationDate: string;
  initiationVenue: string;
  initiationChurchId: string;
  initiationChurchName: string;
  initiatorName: string;
  initiatedWith: string;
  isSponsor: boolean;
  sponsorChurchIds: string[];
  sponsorChurchesText: string;
  doctrineRoles: string[];
  doctrineRoleDraft: string;
  doctrineRolesText: string;
  observations: string;
};

export type ProfileFormFieldSetter = <K extends keyof ProfileFormState>(
  field: K,
  value: ProfileFormState[K]
) => void;

export const initialProfileForm: ProfileFormState = {
  displayName: '',
  email: '',
  email2: '',
  preferredCommunicationEmail: 'login',
  phone: '',
  mobile: '',
  avatarUrl: '',
  isItalian: true,
  privacyConsent: '',
  declarationConsent: '',
  memberId: '',
  surname: '',
  firstName: '',
  fullName: '',
  fiscalCode: '',
  sex: '',
  gender: '',
  genderSelfDescription: '',
  birthDate: '',
  birthPlace: '',
  birthPlaceCode: '',
  birthProvince: '',
  birthProvinceCode: '',
  birthCountry: '',
  birthCountryCode: '',
  citizenship: '',
  citizenshipCountryCodes: [],
  nationality: '',
  address: '',
  postalCode: '',
  city: '',
  state: '',
  province: '',
  region: '',
  country: '',
  countryCode: '',
  profession: '',
  memberCode: '',
  memberStatus: '',
  group: '',
  category: '',
  cardNumber: '',
  cardExpiry: '',
  referenceSeat: '',
  originSociety: '',
  registrationRequestDate: '',
  registrationDate: '',
  renewalDate: '',
  cancellationDate: '',
  firstWorkDate: '',
  identityDocumentPrimaryName: '',
  identityDocumentPrimaryPath: '',
  identityDocumentSecondaryName: '',
  identityDocumentSecondaryPath: '',
  membershipFeeAmount: '',
  currentChurchId: '',
  currentChurchName: '',
  originChurchName: '',
  isInitiated: false,
  initiationDate: '',
  initiationVenue: '',
  initiationChurchId: '',
  initiationChurchName: '',
  initiatorName: '',
  initiatedWith: '',
  isSponsor: false,
  sponsorChurchIds: [],
  sponsorChurchesText: '',
  doctrineRoles: [],
  doctrineRoleDraft: '',
  doctrineRolesText: '',
  observations: ''
};

function splitCommaValues(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function hasText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0;
}

export const PROFILE_BIRTH_DATE_PICKER_START = '2000-01-01';

export function isValidOptionalEmail(value: string) {
  const email = value.trim();
  return email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function avatarFallback(name?: string, email?: string) {
  const base = name || email || '?';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(base)}&background=1e293b&color=fff`;
}

/** Text fields the ICEFLU form requires, depending on the Italian / non-Italian variant. */
const REQUIRED_TEXT_FIELDS_COMMON: Array<keyof ProfileFormState> = [
  'firstName', 'surname', 'birthDate', 'birthCountry', 'birthProvince', 'citizenship', 'fiscalCode',
  'address', 'postalCode', 'city', 'province', 'country', 'email', 'profession'
];

/**
 * The required fields for the current variant. Everything on the ICEFLU form is
 * mandatory except the optional second identity-document image (the back), which
 * is never in this list.
 */
export function requiredProfileTextFields(isItalian: boolean): Array<keyof ProfileFormState> {
  return [
    ...REQUIRED_TEXT_FIELDS_COMMON,
    'mobile',
    ...(isItalian ? (['sex', 'birthPlace'] as Array<keyof ProfileFormState>) : [])
  ];
}

/** Required fields still missing a value (text fields + the primary identity document). */
export function missingRequiredProfileFields(form: ProfileFormState, hasSelectedIdentityDocument = false): string[] {
  const missing: string[] = requiredProfileTextFields(form.isItalian).filter(field => !hasText(form[field] as string));
  if (!isValidOptionalEmail(form.email2)) {
    missing.push('email2');
  }
  if (form.gender === 'self-describe' && !hasText(form.genderSelfDescription)) {
    missing.push('genderSelfDescription');
  }
  if (!hasText(form.identityDocumentPrimaryPath) && !hasSelectedIdentityDocument) {
    missing.push('identityDocumentPrimary');
  }
  // Privacy and Declaration must be explicitly agreed to (not just answered).
  if (form.privacyConsent !== 'agree') missing.push('privacyConsent');
  if (form.declarationConsent !== 'agree') missing.push('declarationConsent');
  return missing;
}

export function isProfileFormReadyForApproval(form: ProfileFormState, hasSelectedIdentityDocument = false) {
  return missingRequiredProfileFields(form, hasSelectedIdentityDocument).length === 0;
}

export function buildProfileForm(user: User, profile?: UserProfile | null): ProfileFormState {
  const preferredCommunicationEmail = profile?.preferredCommunicationEmail === 'secondary' && profile.email2 && isValidOptionalEmail(profile.email2)
    ? 'secondary'
    : 'login';

  return {
    displayName: profile?.displayName || user.displayName || '',
    email: user.email || profile?.email || '',
    email2: profile?.email2 || '',
    preferredCommunicationEmail,
    phone: profile?.phone || '',
    mobile: profile?.mobile || '',
    avatarUrl: profile?.avatarUrl || '',
    isItalian: profile?.isItalian ?? true,
    privacyConsent: profile?.privacyConsent || '',
    declarationConsent: profile?.declarationConsent || '',
    memberId: profile?.memberId || '',
    surname: profile?.surname || '',
    firstName: profile?.firstName || '',
    fullName: profile?.fullName || '',
    fiscalCode: profile?.fiscalCode || '',
    sex: profile?.sex || '',
    gender: profile?.gender || '',
    genderSelfDescription: profile?.genderSelfDescription || '',
    birthDate: profile?.birthDate || '',
    birthPlace: profile?.birthPlace || '',
    birthPlaceCode: profile?.birthPlaceCode || '',
    birthProvince: profile?.birthProvince || '',
    birthProvinceCode: profile?.birthProvinceCode || '',
    birthCountry: profile?.birthCountry || '',
    birthCountryCode: profile?.birthCountryCode || '',
    citizenship: profile?.citizenship || '',
    citizenshipCountryCodes: profile?.citizenshipCountryCodes || [],
    nationality: profile?.nationality || '',
    address: profile?.address || '',
    postalCode: profile?.postalCode || '',
    city: profile?.city || '',
    state: profile?.state || '',
    province: profile?.province || '',
    region: profile?.region || '',
    country: profile?.country || '',
    countryCode: profile?.countryCode || '',
    profession: profile?.profession || '',
    memberCode: profile?.memberCode || '',
    memberStatus: profile?.memberStatus || '',
    group: profile?.group || '',
    category: profile?.category || '',
    cardNumber: profile?.cardNumber || '',
    cardExpiry: profile?.cardExpiry || '',
    referenceSeat: profile?.referenceSeat || '',
    originSociety: profile?.originSociety || '',
    registrationRequestDate: profile?.registrationRequestDate || '',
    registrationDate: profile?.registrationDate || '',
    renewalDate: profile?.renewalDate || '',
    cancellationDate: profile?.cancellationDate || '',
    firstWorkDate: profile?.firstWorkDate || '',
    identityDocumentPrimaryName: profile?.identityDocumentPrimaryName || '',
    identityDocumentPrimaryPath: profile?.identityDocumentPrimaryPath || '',
    identityDocumentSecondaryName: profile?.identityDocumentSecondaryName || '',
    identityDocumentSecondaryPath: profile?.identityDocumentSecondaryPath || '',
    membershipFeeAmount: profile?.membershipFeeAmount || '',
    currentChurchId: profile?.currentChurchId || '',
    currentChurchName: profile?.currentChurchName || '',
    originChurchName: profile?.originChurchName || '',
    isInitiated: profile?.isInitiated || false,
    initiationDate: profile?.initiationDate || '',
    initiationVenue: profile?.initiationVenue || '',
    initiationChurchId: profile?.initiationChurchId || '',
    initiationChurchName: profile?.initiationChurchName || '',
    initiatorName: profile?.initiatorName || '',
    initiatedWith: profile?.initiatedWith || '',
    isSponsor: profile?.isSponsor || false,
    sponsorChurchIds: profile?.sponsorChurchIds || [],
    sponsorChurchesText: profile?.sponsorChurchNames?.join(', ') || '',
    doctrineRoles: profile?.doctrineRoles || [],
    doctrineRoleDraft: '',
    doctrineRolesText: profile?.doctrineRoles?.join(', ') || '',
    observations: profile?.observations || ''
  };
}

/** Member registry fields copied into the form when the matching form field is empty. */
const MEMBER_PREFILL_FIELDS = [
  'surname', 'firstName', 'fullName', 'fiscalCode', 'sex', 'birthDate',
  'birthPlace', 'birthProvince', 'birthCountry', 'citizenship', 'nationality',
  'address', 'postalCode', 'city', 'province', 'region', 'country',
  'profession', 'memberCode', 'memberStatus', 'group', 'category',
  'cardNumber', 'cardExpiry', 'referenceSeat', 'originSociety',
  'registrationRequestDate', 'registrationDate', 'renewalDate',
  'cancellationDate', 'firstWorkDate', 'email2', 'phone', 'mobile'
] as const;

/**
 * Prefill empty form fields from the member ("socio") record tied to the
 * user's email and remember the link via memberId. Values already in the form
 * (saved profile or user edits) always win — the member record only fills gaps,
 * so the user remains free to change everything.
 */
export function applyMemberPrefill(form: ProfileFormState, member: MemberRecord): ProfileFormState {
  const next: ProfileFormState = { ...form, memberId: member.id };
  for (const field of MEMBER_PREFILL_FIELDS) {
    if (!next[field]) next[field] = member[field] ?? '';
  }
  if (!next.email) next.email = member.email ?? '';
  if (!next.displayName) {
    next.displayName = member.fullName || [member.surname, member.firstName].filter(Boolean).join(' ');
  }
  return next;
}

/**
 * Last-resort enrichment from the auth provider (e.g. Google gives the full
 * name and sometimes a phone number). Applied after the member prefill, so
 * registry data wins over provider data and saved data wins over both.
 */
export function applyAuthFallback(form: ProfileFormState, user: User): ProfileFormState {
  const next = { ...form };
  if (!next.displayName && user.displayName) next.displayName = user.displayName;
  if (!next.email && user.email) next.email = user.email;
  if (!next.fullName && user.displayName) next.fullName = user.displayName;
  if (!next.mobile && user.phoneNumber) next.mobile = user.phoneNumber;
  return next;
}

export function buildUserPayload(user: User, form: ProfileFormState): Partial<UserProfile> {
  const isInitiated = form.isInitiated;
  const uniqueDoctrineRoles = Array.from(new Set([
    ...form.doctrineRoles,
    ...splitCommaValues(form.doctrineRolesText)
  ].map(role => role.trim()).filter(Boolean))).slice(0, MAX_DOCTRINE_ROLES);
  const secondaryEmail = form.email2.trim();
  const acceptedSecondaryEmail = secondaryEmail && isValidOptionalEmail(secondaryEmail) ? secondaryEmail : '';
  const preferredCommunicationEmail = form.preferredCommunicationEmail === 'secondary' && acceptedSecondaryEmail
    ? 'secondary'
    : 'login';
  const genderSelfDescription = form.gender === 'self-describe' ? form.genderSelfDescription.trim() : '';

  return {
    uid: user.uid,
    displayName: form.displayName || undefined,
    email: user.email || form.email || undefined,
    email2: acceptedSecondaryEmail || undefined,
    preferredCommunicationEmail,
    phone: form.phone || undefined,
    mobile: form.mobile || undefined,
    avatarUrl: form.avatarUrl || undefined,
    isItalian: form.isItalian,
    privacyConsent: form.privacyConsent || undefined,
    declarationConsent: form.declarationConsent || undefined,
    memberId: form.memberId || undefined,
    surname: form.surname || undefined,
    firstName: form.firstName || undefined,
    fullName: form.fullName || undefined,
    fiscalCode: form.fiscalCode || undefined,
    sex: form.sex || undefined,
    gender: form.gender || undefined,
    genderSelfDescription: genderSelfDescription || undefined,
    birthDate: form.birthDate || undefined,
    birthPlace: form.birthPlace || undefined,
    birthPlaceCode: form.birthPlaceCode || undefined,
    birthProvince: form.birthProvince || undefined,
    birthProvinceCode: form.birthProvinceCode || undefined,
    birthCountry: form.birthCountry || undefined,
    birthCountryCode: form.birthCountryCode || undefined,
    citizenship: form.citizenship || undefined,
    citizenshipCountryCodes: form.citizenshipCountryCodes.length ? form.citizenshipCountryCodes : undefined,
    nationality: form.nationality || undefined,
    address: form.address || undefined,
    postalCode: form.postalCode || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    province: form.province || undefined,
    region: form.region || undefined,
    country: form.country || undefined,
    countryCode: form.countryCode || undefined,
    profession: form.profession || undefined,
    memberCode: form.memberCode || undefined,
    memberStatus: form.memberStatus || undefined,
    group: form.group || undefined,
    category: form.category || undefined,
    cardNumber: form.cardNumber || undefined,
    cardExpiry: form.cardExpiry || undefined,
    referenceSeat: form.referenceSeat || undefined,
    originSociety: form.originSociety || undefined,
    registrationRequestDate: form.registrationRequestDate || undefined,
    registrationDate: form.registrationDate || undefined,
    renewalDate: form.renewalDate || undefined,
    cancellationDate: form.cancellationDate || undefined,
    firstWorkDate: form.firstWorkDate || undefined,
    identityDocumentPrimaryName: form.identityDocumentPrimaryName || undefined,
    identityDocumentPrimaryPath: form.identityDocumentPrimaryPath || undefined,
    identityDocumentSecondaryName: form.identityDocumentSecondaryName || undefined,
    identityDocumentSecondaryPath: form.identityDocumentSecondaryPath || undefined,
    membershipFeeAmount: form.membershipFeeAmount || undefined,
    currentChurchId: form.currentChurchId || undefined,
    currentChurchName: form.currentChurchName || undefined,
    originChurchName: form.originChurchName || undefined,
    isInitiated,
    initiationDate: isInitiated ? form.initiationDate || undefined : undefined,
    initiationVenue: isInitiated ? form.initiationVenue || undefined : undefined,
    initiationChurchId: isInitiated ? form.initiationChurchId || undefined : undefined,
    initiationChurchName: isInitiated ? form.initiationChurchName || undefined : undefined,
    initiatorName: isInitiated ? form.initiatorName || undefined : undefined,
    initiatedWith: isInitiated ? form.initiatedWith || undefined : undefined,
    isSponsor: false,
    sponsorChurchIds: undefined,
    sponsorChurchNames: undefined,
    doctrineRoles: uniqueDoctrineRoles.length ? uniqueDoctrineRoles : undefined,
    observations: form.observations || undefined
  };
}
