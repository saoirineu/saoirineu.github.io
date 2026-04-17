import type { User } from 'firebase/auth';
import { describe, expect, it } from 'vitest';

import { avatarFallback, buildPerfilForm, buildUsuarioPayload, initialPerfilForm } from './form';

const user = {
  uid: 'user-1',
  displayName: 'Nome Auth',
  email: 'auth@example.com'
} as User;

describe('perfil form helpers', () => {
  it('builds form state preferring stored profile values', () => {
    const form = buildPerfilForm(user, {
      uid: 'user-1',
      displayName: 'Nome Perfil',
      email: 'perfil@example.com',
      currentChurchId: 'igreja-1',
      currentChurchName: 'Igreja Atual',
      padrinhoChurchIds: ['i1'],
      padrinhoChurchNames: ['Igreja Madrinha'],
      doctrineRoles: ['fiscal', 'apoio']
    });

    expect(form.displayName).toBe('Nome Perfil');
    expect(form.email).toBe('auth@example.com');
    expect(form.currentChurchName).toBe('Igreja Atual');
    expect(form.padrinhoChurchesText).toBe('Igreja Madrinha');
    expect(form.doctrineRolesText).toBe('fiscal, apoio');
  });

  it('builds payload respecting fardamento and padrinho rules', () => {
    const payload = buildUsuarioPayload(user, {
      ...initialPerfilForm,
      displayName: 'Nome Form',
      email: '',
      fardado: true,
      fardamentoDate: '2020-01-01',
      fardamentoChurchId: 'igreja-farda',
      isPadrinho: true,
      padrinhoChurchIds: ['i1', ''],
      padrinhoChurchesText: 'Igreja 1, Igreja 2',
      doctrineRolesText: 'fiscal, apoio',
      observations: 'Observacao'
    });

    expect(payload.uid).toBe('user-1');
    expect(payload.email).toBe('auth@example.com');
    expect(payload.fardado).toBe(true);
    expect(payload.isPadrinho).toBe(true);
    expect(payload.padrinhoChurchIds).toEqual(['i1']);
    expect(payload.padrinhoChurchNames).toEqual(['Igreja 1', 'Igreja 2']);
    expect(payload.doctrineRoles).toEqual(['fiscal', 'apoio']);
  });

  it('drops dependent fields when user is not fardado', () => {
    const payload = buildUsuarioPayload(user, {
      ...initialPerfilForm,
      isPadrinho: true,
      padrinhoChurchIds: ['i1'],
      padrinhoChurchesText: 'Igreja 1'
    });

    expect(payload.fardado).toBe(false);
    expect(payload.isPadrinho).toBe(false);
    expect(payload.padrinhoChurchIds).toBeUndefined();
    expect(payload.padrinhoChurchNames).toBeUndefined();
  });

  it('creates avatar fallback url from name or email', () => {
    expect(avatarFallback('Maria Silva')).toContain('Maria%20Silva');
    expect(avatarFallback(undefined, 'mail@example.com')).toContain('mail%40example.com');
  });
});
