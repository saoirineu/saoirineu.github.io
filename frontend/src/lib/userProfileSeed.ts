import type { User } from 'firebase/auth';

import type { MemberRecord } from './members';
import type { UserProfile } from './users';

export type AuthProfileUser = Pick<User, 'uid' | 'displayName' | 'email' | 'photoURL'>;

type StringProfileField = {
  [K in keyof UserProfile]-?: UserProfile[K] extends string | undefined ? K : never;
}[keyof UserProfile];

const MEMBER_PROFILE_FIELDS = [
  'surname',
  'firstName',
  'fullName',
  'fiscalCode',
  'sex',
  'birthDate',
  'birthPlace',
  'birthProvince',
  'birthCountry',
  'email2',
  'phone',
  'mobile',
  'address',
  'postalCode',
  'city',
  'province',
  'region',
  'country',
  'memberCode',
  'memberStatus',
  'group',
  'category',
  'cardNumber',
  'cardExpiry',
  'referenceSeat',
  'originSociety',
  'profession',
  'nationality',
  'citizenship',
  'registrationRequestDate',
  'registrationDate',
  'renewalDate',
  'cancellationDate',
  'firstWorkDate'
] as const satisfies readonly (StringProfileField & keyof MemberRecord)[];

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeName(value?: string) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function memberNameCandidates(member: MemberRecord): string[] {
  const firstSurname = [member.firstName, member.surname].filter(hasText).join(' ');
  const surnameFirst = [member.surname, member.firstName].filter(hasText).join(' ');
  return [member.fullName, firstSurname, surnameFirst].filter(hasText);
}

function fillMissingString<K extends StringProfileField>(
  payload: Partial<UserProfile>,
  existingProfile: UserProfile | null | undefined,
  field: K,
  value: string | undefined
) {
  if (!hasText(value) || hasText(existingProfile?.[field])) return;
  payload[field] = value as UserProfile[K];
}

export function displayNameFromMember(member: MemberRecord): string | undefined {
  return memberNameCandidates(member)[0];
}

export function selectMemberForProfilePrefill(
  members: MemberRecord[],
  user: Pick<AuthProfileUser, 'displayName'>
): MemberRecord | undefined {
  if (members.length === 0) return undefined;
  if (members.length === 1) return members[0];

  const authName = normalizeName(user.displayName ?? undefined);
  if (!authName) return undefined;

  return members.find(member =>
    memberNameCandidates(member).some(candidate => normalizeName(candidate) === authName)
  );
}

export function buildUserProfileLoginPayload(
  user: AuthProfileUser,
  existingProfile: UserProfile | null | undefined,
  member: MemberRecord | undefined
): Partial<UserProfile> {
  const payload: Partial<UserProfile> = {
    uid: user.uid,
    email: user.email ?? existingProfile?.email
  };

  fillMissingString(payload, existingProfile, 'displayName', user.displayName ?? (member ? displayNameFromMember(member) : undefined));
  fillMissingString(payload, existingProfile, 'avatarUrl', user.photoURL ?? undefined);

  if (member) {
    fillMissingString(payload, existingProfile, 'memberId', member.id);
    for (const field of MEMBER_PROFILE_FIELDS) {
      fillMissingString(payload, existingProfile, field, member[field]);
    }

    fillMissingString(payload, existingProfile, 'phone', member.phone ?? member.mobile);
    fillMissingString(payload, existingProfile, 'state', member.province ?? member.region);
  }

  return payload;
}
