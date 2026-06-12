import type { User } from 'firebase/auth';

import type { MemberRecord } from '../../lib/members';
import type { UserProfile } from '../../lib/users';

export type ProfileFormState = {
  displayName: string;
  email: string;
  email2: string;
  phone: string;
  mobile: string;
  avatarUrl: string;
  memberId: string;
  surname: string;
  firstName: string;
  fullName: string;
  fiscalCode: string;
  sex: string;
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
  identityDocumentPrimaryName: string;
  identityDocumentSecondaryName: string;
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
  phone: '',
  mobile: '',
  avatarUrl: '',
  memberId: '',
  surname: '',
  firstName: '',
  fullName: '',
  fiscalCode: '',
  sex: '',
  birthDate: '',
  birthPlace: '',
  birthProvince: '',
  birthCountry: '',
  citizenship: '',
  nationality: '',
  address: '',
  postalCode: '',
  city: '',
  state: '',
  province: '',
  region: '',
  country: '',
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
  identityDocumentSecondaryName: '',
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
  doctrineRolesText: '',
  observations: ''
};

function splitCommaValues(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function avatarFallback(name?: string, email?: string) {
  const base = name || email || '?';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(base)}&background=1e293b&color=fff`;
}

export function buildProfileForm(user: User, profile?: UserProfile | null): ProfileFormState {
  return {
    displayName: profile?.displayName || user.displayName || '',
    email: user.email || profile?.email || '',
    email2: profile?.email2 || '',
    phone: profile?.phone || '',
    mobile: profile?.mobile || '',
    avatarUrl: profile?.avatarUrl || '',
    memberId: profile?.memberId || '',
    surname: profile?.surname || '',
    firstName: profile?.firstName || '',
    fullName: profile?.fullName || '',
    fiscalCode: profile?.fiscalCode || '',
    sex: profile?.sex || '',
    birthDate: profile?.birthDate || '',
    birthPlace: profile?.birthPlace || '',
    birthProvince: profile?.birthProvince || '',
    birthCountry: profile?.birthCountry || '',
    citizenship: profile?.citizenship || '',
    nationality: profile?.nationality || '',
    address: profile?.address || '',
    postalCode: profile?.postalCode || '',
    city: profile?.city || '',
    state: profile?.state || '',
    province: profile?.province || '',
    region: profile?.region || '',
    country: profile?.country || '',
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
    identityDocumentSecondaryName: profile?.identityDocumentSecondaryName || '',
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
  const isSponsor = isInitiated && form.isSponsor;
  const sponsorChurchNames = splitCommaValues(form.sponsorChurchesText);
  const doctrineRoles = splitCommaValues(form.doctrineRolesText);

  return {
    uid: user.uid,
    displayName: form.displayName || undefined,
    email: form.email || user.email || undefined,
    email2: form.email2 || undefined,
    phone: form.phone || undefined,
    mobile: form.mobile || undefined,
    avatarUrl: form.avatarUrl || undefined,
    memberId: form.memberId || undefined,
    surname: form.surname || undefined,
    firstName: form.firstName || undefined,
    fullName: form.fullName || undefined,
    fiscalCode: form.fiscalCode || undefined,
    sex: form.sex || undefined,
    birthDate: form.birthDate || undefined,
    birthPlace: form.birthPlace || undefined,
    birthProvince: form.birthProvince || undefined,
    birthCountry: form.birthCountry || undefined,
    citizenship: form.citizenship || undefined,
    nationality: form.nationality || undefined,
    address: form.address || undefined,
    postalCode: form.postalCode || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    province: form.province || undefined,
    region: form.region || undefined,
    country: form.country || undefined,
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
    identityDocumentSecondaryName: form.identityDocumentSecondaryName || undefined,
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
    isSponsor,
    sponsorChurchIds: isSponsor ? form.sponsorChurchIds.filter(Boolean) : undefined,
    sponsorChurchNames: isSponsor ? sponsorChurchNames : undefined,
    doctrineRoles: doctrineRoles.length ? doctrineRoles : undefined,
    observations: form.observations || undefined
  };
}
