import { describe, expect, it } from 'vitest';

import {
  buildEncontroEuropeuPayload,
  calculateContribution,
  calculateNightCount,
  initialEncontroEuropeuFormValues,
  resolveInitialLocale,
  validateEncontroEuropeuForm
} from './form';

describe('encontro europeu helpers', () => {
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
        isIcefluMember: true,
        needsExtraLinen: true
      })
    ).toEqual({
      nights: 3,
      lodging: 210,
      spiritualWorks: 150,
      extras: 20,
      total: 380
    });
  });

  it('starts with september check-in and check-out defaults', () => {
    expect(initialEncontroEuropeuFormValues.checkIn).toBe('2026-09-10');
    expect(initialEncontroEuropeuFormValues.checkOut).toBe('2026-09-16');
  });

  it('builds normalized payload', () => {
    const payload = buildEncontroEuropeuPayload({
      values: {
        ...initialEncontroEuropeuFormValues,
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
        identityDocumentPath: 'encontroEuropeuInscricoes/abc/identity-id.pdf',
        consentDocumentName: 'consent.pdf'
      }
    });

    expect(payload.firstName).toBe('Maria');
    expect(payload.lastName).toBe('Silva');
    expect(payload.country).toBe('Italia');
    expect(payload.identityDocumentName).toBe('id.pdf');
    expect(payload.identityDocumentPath).toBe('encontroEuropeuInscricoes/abc/identity-id.pdf');
    expect(payload.consentDocumentName).toBe('consent.pdf');
    expect(payload.status).toBe('pending');
  });

  it('validates required fields and date logic', () => {
    expect(validateEncontroEuropeuForm(initialEncontroEuropeuFormValues)).toBe('firstName');

    expect(
      validateEncontroEuropeuForm({
        ...initialEncontroEuropeuFormValues,
        firstName: 'Maria',
        lastName: 'Silva',
        country: 'Italia',
        church: 'Centro',
        centerLeader: 'Dirigente',
        selectedWorks: ['fri-11-19'],
        checkIn: '2026-09-13',
        checkOut: '2026-09-12'
      })
    ).toBe('checkOut');
  });
});