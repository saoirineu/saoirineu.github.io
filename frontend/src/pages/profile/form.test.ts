import type { User } from 'firebase/auth';
import { describe, expect, it } from 'vitest';

import { avatarFallback, buildProfileForm, buildUserPayload, initialProfileForm } from './form';

const user = {
  uid: 'user-1',
  displayName: 'Nome Auth',
  email: 'auth@example.com'
} as User;

describe('profile form helpers', () => {
  it('builds form state preferring stored profile values', () => {
    const form = buildProfileForm(user, {
      uid: 'user-1',
      displayName: 'Nome Perfil',
      email: 'perfil@example.com',
      firstName: 'Maria',
      surname: 'Rossi',
      fiscalCode: 'CF123',
      birthDate: '1980-01-02',
      address: 'Via Roma 1',
      currentChurchId: 'igreja-1',
      currentChurchName: 'Igreja Atual',
      sponsorChurchIds: ['i1'],
      sponsorChurchNames: ['Igreja Madrinha'],
      doctrineRoles: ['fiscal', 'apoio']
    });

    expect(form.displayName).toBe('Nome Perfil');
    expect(form.email).toBe('auth@example.com');
    expect(form.firstName).toBe('Maria');
    expect(form.fiscalCode).toBe('CF123');
    expect(form.address).toBe('Via Roma 1');
    expect(form.currentChurchName).toBe('Igreja Atual');
    expect(form.sponsorChurchesText).toBe('Igreja Madrinha');
    expect(form.doctrineRolesText).toBe('fiscal, apoio');
  });

  it('builds payload respecting initiation and sponsor rules', () => {
    const payload = buildUserPayload(user, {
      ...initialProfileForm,
      displayName: 'Nome Form',
      email: '',
      firstName: 'Maria',
      surname: 'Rossi',
      fiscalCode: 'CF123',
      birthDate: '1980-01-02',
      address: 'Via Roma 1',
      postalCode: '00100',
      city: 'Roma',
      province: 'RM',
      profession: 'Insegnante',
      isInitiated: true,
      initiationDate: '2020-01-01',
      initiationChurchId: 'igreja-farda',
      isSponsor: true,
      sponsorChurchIds: ['i1', ''],
      sponsorChurchesText: 'Igreja 1, Igreja 2',
      doctrineRolesText: 'fiscal, apoio',
      observations: 'Observacao'
    });

    expect(payload.uid).toBe('user-1');
    expect(payload.email).toBe('auth@example.com');
    expect(payload.firstName).toBe('Maria');
    expect(payload.fiscalCode).toBe('CF123');
    expect(payload.address).toBe('Via Roma 1');
    expect(payload.province).toBe('RM');
    expect(payload.isInitiated).toBe(true);
    expect(payload.isSponsor).toBe(true);
    expect(payload.sponsorChurchIds).toEqual(['i1']);
    expect(payload.sponsorChurchNames).toEqual(['Igreja 1', 'Igreja 2']);
    expect(payload.doctrineRoles).toEqual(['fiscal', 'apoio']);
  });

  it('drops dependent fields when user is not initiated', () => {
    const payload = buildUserPayload(user, {
      ...initialProfileForm,
      isSponsor: true,
      sponsorChurchIds: ['i1'],
      sponsorChurchesText: 'Igreja 1'
    });

    expect(payload.isInitiated).toBe(false);
    expect(payload.isSponsor).toBe(false);
    expect(payload.sponsorChurchIds).toBeUndefined();
    expect(payload.sponsorChurchNames).toBeUndefined();
  });

  it('creates avatar fallback url from name or email', () => {
    expect(avatarFallback('Maria Silva')).toContain('Maria%20Silva');
    expect(avatarFallback(undefined, 'mail@example.com')).toContain('mail%40example.com');
  });
});
