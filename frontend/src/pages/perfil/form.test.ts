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
      igrejaAtualId: 'igreja-1',
      igrejaAtualNome: 'Igreja Atual',
      padrinhoIgrejasIds: ['i1'],
      padrinhoIgrejasNomes: ['Igreja Madrinha'],
      papeisDoutrina: ['fiscal', 'apoio']
    });

    expect(form.displayName).toBe('Nome Perfil');
    expect(form.email).toBe('auth@example.com');
    expect(form.igrejaAtualNome).toBe('Igreja Atual');
    expect(form.padrinhoIgrejasTexto).toBe('Igreja Madrinha');
    expect(form.papeisTexto).toBe('fiscal, apoio');
  });

  it('builds payload respecting fardamento and padrinho rules', () => {
    const payload = buildUsuarioPayload(user, {
      ...initialPerfilForm,
      displayName: 'Nome Form',
      email: '',
      fardado: true,
      fardamentoData: '2020-01-01',
      fardamentoIgrejaId: 'igreja-farda',
      padrinhoMadrinha: true,
      padrinhoIgrejasIds: ['i1', ''],
      padrinhoIgrejasTexto: 'Igreja 1, Igreja 2',
      papeisTexto: 'fiscal, apoio',
      observacoes: 'Observacao'
    });

    expect(payload.uid).toBe('user-1');
    expect(payload.email).toBe('auth@example.com');
    expect(payload.fardado).toBe(true);
    expect(payload.padrinhoMadrinha).toBe(true);
    expect(payload.padrinhoIgrejasIds).toEqual(['i1']);
    expect(payload.padrinhoIgrejasNomes).toEqual(['Igreja 1', 'Igreja 2']);
    expect(payload.papeisDoutrina).toEqual(['fiscal', 'apoio']);
  });

  it('drops dependent fields when user is not fardado', () => {
    const payload = buildUsuarioPayload(user, {
      ...initialPerfilForm,
      padrinhoMadrinha: true,
      padrinhoIgrejasIds: ['i1'],
      padrinhoIgrejasTexto: 'Igreja 1'
    });

    expect(payload.fardado).toBe(false);
    expect(payload.padrinhoMadrinha).toBe(false);
    expect(payload.padrinhoIgrejasIds).toBeUndefined();
    expect(payload.padrinhoIgrejasNomes).toBeUndefined();
  });

  it('creates avatar fallback url from name or email', () => {
    expect(avatarFallback('Maria Silva')).toContain('Maria%20Silva');
    expect(avatarFallback(undefined, 'mail@example.com')).toContain('mail%40example.com');
  });
});