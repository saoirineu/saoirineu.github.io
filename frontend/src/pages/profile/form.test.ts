import type { User } from 'firebase/auth';
import { describe, expect, it } from 'vitest';

import type { MemberRecord } from '../../lib/members';
import {
  applyAuthFallback,
  applyMemberPrefill,
  avatarFallback,
  buildProfileForm,
  buildUserPayload,
  initialProfileForm,
  isProfileFormReadyForApproval,
  isValidOptionalEmail
} from './form';

const user = {
  uid: 'user-1',
  displayName: 'Nome Auth',
  email: 'auth@example.com'
} as User;

function makeMember(overrides: Partial<MemberRecord> = {}): MemberRecord {
  return {
    id: 'CF1',
    sources: [{ file: 'complete', code: '1', line: 2 }],
    conflicts: {},
    superseeded: {},
    reviewReasons: [],
    possibleDuplicateIds: [],
    needsReview: false,
    ...overrides
  };
}

describe('profile form helpers', () => {
  it('builds form state preferring stored profile values', () => {
    const form = buildProfileForm(user, {
      uid: 'user-1',
      displayName: 'Nome Perfil',
      email: 'perfil@example.com',
      email2: 'secondary@example.com',
      preferredCommunicationEmail: 'secondary',
      firstName: 'Maria',
      surname: 'Rossi',
      fiscalCode: 'CF123',
      identityDocumentPrimaryName: 'id.pdf',
      identityDocumentPrimaryPath: 'users/user-1/id.pdf',
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
    expect(form.email2).toBe('secondary@example.com');
    expect(form.preferredCommunicationEmail).toBe('secondary');
    expect(form.firstName).toBe('Maria');
    expect(form.fiscalCode).toBe('CF123');
    expect(form.identityDocumentPrimaryPath).toBe('users/user-1/id.pdf');
    expect(form.address).toBe('Via Roma 1');
    expect(form.currentChurchName).toBe('Igreja Atual');
    expect(form.sponsorChurchesText).toBe('Igreja Madrinha');
    expect(form.doctrineRolesText).toBe('fiscal, apoio');
  });

  it('builds payload respecting initiation and sponsor rules', () => {
    const payload = buildUserPayload(user, {
      ...initialProfileForm,
      displayName: 'Nome Form',
      email: 'typed@example.com',
      email2: 'secondary@example.com',
      preferredCommunicationEmail: 'secondary',
      firstName: 'Maria',
      surname: 'Rossi',
      fiscalCode: 'CF123',
      identityDocumentPrimaryName: 'id.pdf',
      identityDocumentPrimaryPath: 'users/user-1/id.pdf',
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
    expect(payload.email2).toBe('secondary@example.com');
    expect(payload.preferredCommunicationEmail).toBe('secondary');
    expect(payload.firstName).toBe('Maria');
    expect(payload.fiscalCode).toBe('CF123');
    expect(payload.identityDocumentPrimaryPath).toBe('users/user-1/id.pdf');
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

  it('falls back to login email as preferred when secondary email is empty', () => {
    const payload = buildUserPayload(user, {
      ...initialProfileForm,
      preferredCommunicationEmail: 'secondary'
    });

    expect(payload.email2).toBeUndefined();
    expect(payload.preferredCommunicationEmail).toBe('login');

    const form = buildProfileForm(user, {
      uid: 'user-1',
      email2: 'not-an-email',
      preferredCommunicationEmail: 'secondary'
    });

    expect(form.preferredCommunicationEmail).toBe('login');
  });

  it('accepts empty or valid secondary email only', () => {
    expect(isValidOptionalEmail('')).toBe(true);
    expect(isValidOptionalEmail(' secondary@example.com ')).toBe(true);
    expect(isValidOptionalEmail('not-an-email')).toBe(false);
    expect(isValidOptionalEmail('person@example')).toBe(false);

    const payload = buildUserPayload(user, {
      ...initialProfileForm,
      email2: 'not-an-email',
      preferredCommunicationEmail: 'secondary'
    });

    expect(payload.email2).toBeUndefined();
    expect(payload.preferredCommunicationEmail).toBe('login');
  });

  it('creates avatar fallback url from name or email', () => {
    expect(avatarFallback('Maria Silva')).toContain('Maria%20Silva');
    expect(avatarFallback(undefined, 'mail@example.com')).toContain('mail%40example.com');
  });

  it('requires every ICEFLU field (per nationality), the document, and both consents', () => {
    const italianReady = {
      ...initialProfileForm,
      isItalian: true,
      firstName: 'Maria',
      surname: 'Rossi',
      birthDate: '1980-01-02',
      sex: 'F',
      birthPlace: 'Roma',
      citizenship: 'Italiana',
      fiscalCode: 'CF123',
      address: 'Via Roma 1',
      postalCode: '00100',
      city: 'Roma',
      province: 'RM',
      country: 'Italia',
      email: 'maria@example.com',
      mobile: '+39 333 1234567',
      profession: 'Insegnante',
      identityDocumentPrimaryPath: 'users/user-1/id.pdf',
      privacyConsent: 'agree',
      declarationConsent: 'agree'
    };

    expect(isProfileFormReadyForApproval(italianReady)).toBe(true);
    expect(isProfileFormReadyForApproval({ ...italianReady, birthDate: '2001-01-01' })).toBe(true);
    expect(isProfileFormReadyForApproval({ ...italianReady, profession: '' })).toBe(false);
    expect(isProfileFormReadyForApproval({ ...italianReady, province: '' })).toBe(false);
    expect(isProfileFormReadyForApproval({ ...italianReady, mobile: '' })).toBe(false);
    expect(isProfileFormReadyForApproval({ ...italianReady, email2: 'secondary@example.com' })).toBe(true);
    expect(isProfileFormReadyForApproval({ ...italianReady, email2: 'not-an-email' })).toBe(false);
    // a freshly selected document file stands in for a stored path
    expect(isProfileFormReadyForApproval({ ...italianReady, identityDocumentPrimaryPath: '' }, true)).toBe(true);
    expect(isProfileFormReadyForApproval({ ...italianReady, identityDocumentPrimaryPath: '' })).toBe(false);
    // both consents must be an explicit "agree"
    expect(isProfileFormReadyForApproval({ ...italianReady, privacyConsent: '' })).toBe(false);
    expect(isProfileFormReadyForApproval({ ...italianReady, declarationConsent: 'disagree' })).toBe(false);

    // Non-Italian variant: birthCountry + mobile required; sex/birthPlace/province are not.
    const nonItalianReady = {
      ...italianReady,
      isItalian: false,
      sex: '',
      birthPlace: '',
      province: '',
      phone: '',
      birthCountry: 'Brasil',
      mobile: '+5511999999999'
    };

    expect(isProfileFormReadyForApproval(nonItalianReady)).toBe(true);
    expect(isProfileFormReadyForApproval({ ...nonItalianReady, birthCountry: '' })).toBe(false);
    expect(isProfileFormReadyForApproval({ ...nonItalianReady, mobile: '' })).toBe(false);
  });

  it('prefills only empty fields from the linked member and records the link', () => {
    const member = makeMember({
      id: 'SRRMRA74E68L219U',
      surname: 'SERRE',
      firstName: 'MARA',
      birthDate: '1974-05-28',
      city: 'VEZZANO SUL CROSTOLO',
      profession: 'CASALINGA',
      email: 'skywalter@eirene.re.it',
      firstWorkDate: '1996-10-01'
    });
    const form = applyMemberPrefill(
      { ...initialProfileForm, city: 'Bologna', email: 'auth@example.com' },
      member
    );

    expect(form.memberId).toBe('SRRMRA74E68L219U');
    expect(form.surname).toBe('SERRE');
    expect(form.firstName).toBe('MARA');
    expect(form.birthDate).toBe('1974-05-28');
    expect(form.firstWorkDate).toBe('1996-10-01');
    expect(form.city).toBe('Bologna'); // saved/typed values always win
    expect(form.email).toBe('auth@example.com');
    expect(form.displayName).toBe('SERRE MARA');
  });

  it('falls back to auth provider data only for fields still empty', () => {
    const googleUser = {
      uid: 'user-1',
      displayName: 'Renato Fabbri',
      email: 'renato@example.com',
      phoneNumber: '+39 333 0000000'
    } as User;

    const empty = applyAuthFallback({ ...initialProfileForm }, googleUser);
    expect(empty.fullName).toBe('Renato Fabbri');
    expect(empty.displayName).toBe('Renato Fabbri');
    expect(empty.email).toBe('renato@example.com');
    expect(empty.mobile).toBe('+39 333 0000000');

    // member data applied first wins over the auth provider
    const member = makeMember({ surname: 'FABBRI', firstName: 'RENATO', fullName: 'FABBRI RENATO', mobile: '333111' });
    const prefilled = applyAuthFallback(applyMemberPrefill({ ...initialProfileForm }, member), googleUser);
    expect(prefilled.fullName).toBe('FABBRI RENATO');
    expect(prefilled.mobile).toBe('333111');
  });
});
