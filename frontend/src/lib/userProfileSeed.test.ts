import { describe, expect, it } from 'vitest';

import type { MemberRecord } from './members';
import type { UserProfile } from './users';
import {
  buildUserProfileLoginPayload,
  selectMemberForProfilePrefill,
  type AuthProfileUser
} from './userProfileSeed';

function makeMember(overrides: Partial<MemberRecord> = {}): MemberRecord {
  return {
    id: 'member-1',
    sources: [],
    conflicts: {},
    superseeded: {},
    reviewReasons: [],
    possibleDuplicateIds: [],
    needsReview: false,
    ...overrides
  };
}

const authUser: AuthProfileUser = {
  uid: 'user-1',
  displayName: null,
  email: 'maria@example.com',
  photoURL: null
};

describe('user profile seed helpers', () => {
  it('fills missing profile fields from a matched member', () => {
    const payload = buildUserProfileLoginPayload(authUser, null, makeMember({
      id: 'CF123',
      firstName: 'Maria',
      surname: 'Rossi',
      fullName: 'Maria Rossi',
      fiscalCode: 'CF123',
      birthDate: '1980-01-02',
      birthPlace: 'Roma',
      birthCountry: 'Italia',
      citizenship: 'Italiana',
      address: 'Via Roma 1',
      postalCode: '00100',
      city: 'Roma',
      province: 'RM',
      country: 'Italia',
      mobile: '+39 333',
      profession: 'Insegnante',
      memberCode: '42',
      firstWorkDate: '2020-05-01'
    }));

    expect(payload).toMatchObject({
      uid: 'user-1',
      email: 'maria@example.com',
      memberId: 'CF123',
      displayName: 'Maria Rossi',
      firstName: 'Maria',
      surname: 'Rossi',
      fiscalCode: 'CF123',
      city: 'Roma',
      province: 'RM',
      state: 'RM',
      mobile: '+39 333',
      phone: '+39 333',
      firstWorkDate: '2020-05-01'
    });
  });

  it('does not overwrite profile fields already saved by the user', () => {
    const existingProfile: UserProfile = {
      uid: 'user-1',
      displayName: 'Nome scelto',
      phone: 'user phone',
      city: 'Venezia'
    };

    const payload = buildUserProfileLoginPayload(
      { ...authUser, displayName: 'Auth Name', photoURL: 'https://photo.example/avatar.png' },
      existingProfile,
      makeMember({ fullName: 'Maria Rossi', phone: 'member phone', city: 'Roma' })
    );

    expect(payload.displayName).toBeUndefined();
    expect(payload.phone).toBeUndefined();
    expect(payload.city).toBeUndefined();
    expect(payload.avatarUrl).toBe('https://photo.example/avatar.png');
  });

  it('selects a shared-email member only when the auth name disambiguates it', () => {
    const maria = makeMember({ id: 'maria', firstName: 'Maria', surname: 'Rossi' });
    const luca = makeMember({ id: 'luca', firstName: 'Luca', surname: 'Bianchi' });

    expect(selectMemberForProfilePrefill([maria, luca], { displayName: 'Maria Rossi' })?.id).toBe('maria');
    expect(selectMemberForProfilePrefill([maria, luca], { displayName: null })).toBeUndefined();
  });
});
