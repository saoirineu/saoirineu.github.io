import type { User } from 'firebase/auth';

import type { UserProfile } from '../../lib/users';

export type ProfileFormState = {
  displayName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  city: string;
  state: string;
  country: string;
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
  phone: '',
  avatarUrl: '',
  city: '',
  state: '',
  country: '',
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
    phone: profile?.phone || '',
    avatarUrl: profile?.avatarUrl || '',
    city: profile?.city || '',
    state: profile?.state || '',
    country: profile?.country || '',
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

export function buildUserPayload(user: User, form: ProfileFormState): Partial<UserProfile> {
  const isInitiated = form.isInitiated;
  const isSponsor = isInitiated && form.isSponsor;
  const sponsorChurchNames = splitCommaValues(form.sponsorChurchesText);
  const doctrineRoles = splitCommaValues(form.doctrineRolesText);

  return {
    uid: user.uid,
    displayName: form.displayName || undefined,
    email: form.email || user.email || undefined,
    phone: form.phone || undefined,
    avatarUrl: form.avatarUrl || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    country: form.country || undefined,
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
