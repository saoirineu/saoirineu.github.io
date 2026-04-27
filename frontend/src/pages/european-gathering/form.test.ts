import { describe, expect, it } from 'vitest';

import {
  buildEuropeanGatheringPayload,
  calculateContribution,
  calculateNightCount,
  initialEuropeanGatheringFormValues,
  resolveInitialLocale,
  suggestedCheckInDate,
  suggestedCheckOutDate,
  validateEuropeanGatheringForm
} from './form';

describe('european gathering helpers', () => {
  it('resolves locale from browser language', () => {
    expect(resolveInitialLocale('it-IT')).toBe('it');
    expect(resolveInitialLocale('en-US')).toBe('en');
    expect(resolveInitialLocale('es-ES')).toBe('es');
    expect(resolveInitialLocale('pt-BR')).toBe('pt');
    expect(resolveInitialLocale('fr-FR')).toBe('pt');
  });

  it('calculates nights and contribution', () => {
    expect(calculateNightCount('2026-09-11', '2026-09-14')).toBe(3);

    expect(
      calculateContribution({
        attendanceMode: 'lodging',
        checkIn: '2026-09-11',
        checkOut: '2026-09-14',
        selectedWorks: ['fri-11-19', 'sat-12-19'],
        isInitiated: true,
        isIcefluMember: true,
        needsExtraLinen: true
      })
    ).toEqual({
      nights: 3,
      lodging: 210,
      spiritualWorks: 110,
      extras: 20,
      total: 340
    });
  });

  it('starts with empty check-in and check-out values but keeps suggested september dates', () => {
    expect(initialEuropeanGatheringFormValues.checkIn).toBe('');
    expect(initialEuropeanGatheringFormValues.checkOut).toBe('');
    expect(suggestedCheckInDate).toBe('2026-09-10');
    expect(suggestedCheckOutDate).toBe('2026-09-16');
  });

  it('builds normalized payload', () => {
    const payload = buildEuropeanGatheringPayload({
      values: {
        ...initialEuropeanGatheringFormValues,
        firstName: '  Maria ',
        lastName: ' Silva ',
        country: ' Italia ',
        church: ' Centro ',
        centerLeader: ' Dirigente ',
        isNovice: true,
        selectedWorks: ['fri-11-19']
      },
      locale: 'it',
      contribution: {
        nights: 0,
        lodging: 0,
        spiritualWorks: 100,
        extras: 0,
        total: 100
      },
      documents: {
        identityDocumentName: 'id.pdf',
        identityDocumentPath: 'europeanGatheringRegistrations/abc/identity-id.pdf',
        consentDocumentName: 'consent.pdf'
      }
    });

    expect(payload.firstName).toBe('Maria');
    expect(payload.lastName).toBe('Silva');
    expect(payload.country).toBe('Italia');
    expect(payload.identityDocumentName).toBe('id.pdf');
    expect(payload.identityDocumentPath).toBe('europeanGatheringRegistrations/abc/identity-id.pdf');
    expect(payload.consentDocumentName).toBe('consent.pdf');
    expect(payload.status).toBe('pending');
  });

  it('validates required fields and date logic', () => {
    const noDocs = { identityDocument: null, paymentProof: null, consentDocument: null };
    const noPaths = {};
    const existingPaths = {
      identityDocumentPath: 'europeanGatheringRegistrations/abc/identity-id.pdf',
      paymentProofPath: 'europeanGatheringRegistrations/abc/payment-proof.pdf'
    };

    expect(validateEuropeanGatheringForm(initialEuropeanGatheringFormValues, noDocs, noPaths)).toBe('firstName');

    expect(
      validateEuropeanGatheringForm({
        ...initialEuropeanGatheringFormValues,
        firstName: 'Maria',
        lastName: 'Silva',
        email: 'maria@example.com',
        phone: '123456789',
        country: 'Italia',
        church: 'Centro',
        centerLeader: 'Dirigente',
        centerLeaderEmail: 'dirigente@example.com',
        selectedWorks: ['fri-11-19'],
        checkIn: '2026-09-13',
        checkOut: '2026-09-12'
      }, noDocs, existingPaths)
    ).toBe('checkOut');
  });
});
