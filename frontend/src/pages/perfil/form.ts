import type { User } from 'firebase/auth';

import type { UsuarioPerfil } from '../../lib/usuarios';

export type PerfilFormState = {
  displayName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  cidade: string;
  estado: string;
  pais: string;
  igrejaAtualId: string;
  igrejaAtualNome: string;
  igrejaOrigemNome: string;
  fardado: boolean;
  fardamentoData: string;
  fardamentoLocal: string;
  fardamentoIgrejaId: string;
  fardamentoIgrejaNome: string;
  fardadorNome: string;
  fardadoComQuem: string;
  padrinhoMadrinha: boolean;
  padrinhoIgrejasIds: string[];
  padrinhoIgrejasTexto: string;
  papeisTexto: string;
  observacoes: string;
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
  cidade: '',
  estado: '',
  pais: '',
  igrejaAtualId: '',
  igrejaAtualNome: '',
  igrejaOrigemNome: '',
  fardado: false,
  fardamentoData: '',
  fardamentoLocal: '',
  fardamentoIgrejaId: '',
  fardamentoIgrejaNome: '',
  fardadorNome: '',
  fardadoComQuem: '',
  padrinhoMadrinha: false,
  padrinhoIgrejasIds: [],
  padrinhoIgrejasTexto: '',
  papeisTexto: '',
  observacoes: ''
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

export function buildPerfilForm(user: User, perfil?: UsuarioPerfil | null): PerfilFormState {
  return {
    displayName: perfil?.displayName || user.displayName || '',
    email: user.email || perfil?.email || '',
    phone: perfil?.phone || '',
    avatarUrl: perfil?.avatarUrl || '',
    cidade: perfil?.cidade || '',
    estado: perfil?.estado || '',
    pais: perfil?.pais || '',
    igrejaAtualId: perfil?.igrejaAtualId || '',
    igrejaAtualNome: perfil?.igrejaAtualNome || '',
    igrejaOrigemNome: perfil?.igrejaOrigemNome || '',
    fardado: perfil?.fardado || false,
    fardamentoData: perfil?.fardamentoData || '',
    fardamentoLocal: perfil?.fardamentoLocal || '',
    fardamentoIgrejaId: perfil?.fardamentoIgrejaId || '',
    fardamentoIgrejaNome: perfil?.fardamentoIgrejaNome || '',
    fardadorNome: perfil?.fardadorNome || '',
    fardadoComQuem: perfil?.fardadoComQuem || '',
    padrinhoMadrinha: perfil?.padrinhoMadrinha || false,
    padrinhoIgrejasIds: perfil?.padrinhoIgrejasIds || [],
    padrinhoIgrejasTexto: perfil?.padrinhoIgrejasNomes?.join(', ') || '',
    papeisTexto: perfil?.papeisDoutrina?.join(', ') || '',
    observacoes: perfil?.observacoes || ''
  };
}

export function buildUsuarioPayload(user: User, form: PerfilFormState): Partial<UsuarioPerfil> {
  const isFardado = form.fardado;
  const isPadrinho = isFardado && form.padrinhoMadrinha;
  const padrinhoIgrejasNomes = splitCommaValues(form.padrinhoIgrejasTexto);
  const papeisList = splitCommaValues(form.papeisTexto);

  return {
    uid: user.uid,
    displayName: form.displayName || undefined,
    email: form.email || user.email || undefined,
    phone: form.phone || undefined,
    avatarUrl: form.avatarUrl || undefined,
    cidade: form.cidade || undefined,
    estado: form.estado || undefined,
    pais: form.pais || undefined,
    igrejaAtualId: form.igrejaAtualId || undefined,
    igrejaAtualNome: form.igrejaAtualNome || undefined,
    igrejaOrigemNome: form.igrejaOrigemNome || undefined,
    fardado: isFardado,
    fardamentoData: isFardado ? form.fardamentoData || undefined : undefined,
    fardamentoLocal: isFardado ? form.fardamentoLocal || undefined : undefined,
    fardamentoIgrejaId: isFardado ? form.fardamentoIgrejaId || undefined : undefined,
    fardamentoIgrejaNome: isFardado ? form.fardamentoIgrejaNome || undefined : undefined,
    fardadorNome: isFardado ? form.fardadorNome || undefined : undefined,
    fardadoComQuem: isFardado ? form.fardadoComQuem || undefined : undefined,
    padrinhoMadrinha: isPadrinho,
    padrinhoIgrejasIds: isPadrinho ? form.padrinhoIgrejasIds.filter(Boolean) : undefined,
    padrinhoIgrejasNomes: isPadrinho ? padrinhoIgrejasNomes : undefined,
    papeisDoutrina: papeisList.length ? papeisList : undefined,
    observacoes: form.observacoes || undefined
  };
}