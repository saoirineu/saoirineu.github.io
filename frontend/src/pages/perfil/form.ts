import type { User } from 'firebase/auth';

import type { UserProfile } from '../../lib/users';

export type PerfilFormState = {
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
  fardado: boolean;
  fardamentoDate: string;
  fardamentoVenue: string;
  fardamentoChurchId: string;
  fardamentoChurchName: string;
  fardadorName: string;
  fardadoComQuem: string;
  isPadrinho: boolean;
  padrinhoChurchIds: string[];
  padrinhoChurchesText: string;
  doctrineRolesText: string;
  observations: string;
};

export type PerfilFormFieldSetter = <K extends keyof PerfilFormState>(
  field: K,
  value: PerfilFormState[K]
) => void;

export const initialPerfilForm: PerfilFormState = {
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
  fardado: false,
  fardamentoDate: '',
  fardamentoVenue: '',
  fardamentoChurchId: '',
  fardamentoChurchName: '',
  fardadorName: '',
  fardadoComQuem: '',
  isPadrinho: false,
  padrinhoChurchIds: [],
  padrinhoChurchesText: '',
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

export function buildPerfilForm(user: User, perfil?: UserProfile | null): PerfilFormState {
  return {
    displayName: perfil?.displayName || user.displayName || '',
    email: user.email || perfil?.email || '',
    phone: perfil?.phone || '',
    avatarUrl: perfil?.avatarUrl || '',
    city: perfil?.city || '',
    state: perfil?.state || '',
    country: perfil?.country || '',
    currentChurchId: perfil?.currentChurchId || '',
    currentChurchName: perfil?.currentChurchName || '',
    originChurchName: perfil?.originChurchName || '',
    fardado: perfil?.fardado || false,
    fardamentoDate: perfil?.fardamentoDate || '',
    fardamentoVenue: perfil?.fardamentoVenue || '',
    fardamentoChurchId: perfil?.fardamentoChurchId || '',
    fardamentoChurchName: perfil?.fardamentoChurchName || '',
    fardadorName: perfil?.fardadorName || '',
    fardadoComQuem: perfil?.fardadoComQuem || '',
    isPadrinho: perfil?.isPadrinho || false,
    padrinhoChurchIds: perfil?.padrinhoChurchIds || [],
    padrinhoChurchesText: perfil?.padrinhoChurchNames?.join(', ') || '',
    doctrineRolesText: perfil?.doctrineRoles?.join(', ') || '',
    observations: perfil?.observations || ''
  };
}

export function buildUsuarioPayload(user: User, form: PerfilFormState): Partial<UserProfile> {
  const isFardado = form.fardado;
  const isPadrinho = isFardado && form.isPadrinho;
  const padrinhoChurchNames = splitCommaValues(form.padrinhoChurchesText);
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
    fardado: isFardado,
    fardamentoDate: isFardado ? form.fardamentoDate || undefined : undefined,
    fardamentoVenue: isFardado ? form.fardamentoVenue || undefined : undefined,
    fardamentoChurchId: isFardado ? form.fardamentoChurchId || undefined : undefined,
    fardamentoChurchName: isFardado ? form.fardamentoChurchName || undefined : undefined,
    fardadorName: isFardado ? form.fardadorName || undefined : undefined,
    fardadoComQuem: isFardado ? form.fardadoComQuem || undefined : undefined,
    isPadrinho,
    padrinhoChurchIds: isPadrinho ? form.padrinhoChurchIds.filter(Boolean) : undefined,
    padrinhoChurchNames: isPadrinho ? padrinhoChurchNames : undefined,
    doctrineRoles: doctrineRoles.length ? doctrineRoles : undefined,
    observations: form.observations || undefined
  };
}
