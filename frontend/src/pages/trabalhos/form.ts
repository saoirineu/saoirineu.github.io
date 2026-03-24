import { Timestamp } from 'firebase/firestore';

import type { BebidaInfo, IgrejaInfo, Trabalho, TrabalhoInput } from '../../lib/trabalhos';

export type TrabalhoFormState = {
  titulo: string;
  data: string;
  horario: string;
  duracaoEsperadaMin: string;
  duracaoEfetivaMin: string;
  hinarios: string;
  igrejaRespId: string;
  igrejaRespNome: string;
  igrejasTexto: string;
  localId: string;
  localNome: string;
  localTexto: string;
  total: string;
  fardados: string;
  homens: string;
  mulheres: string;
  criancas: string;
  outros: string;
  outrosDescricao: string;
  loteId: string;
  loteDescricao: string;
  loteTexto: string;
  quantidadeLitros: string;
  anotacoes: string;
};

type TimestampLike = Timestamp | Date | string | null | undefined;

export const initialTrabalhoForm: TrabalhoFormState = {
  titulo: '',
  data: '',
  horario: '',
  duracaoEsperadaMin: '',
  duracaoEfetivaMin: '',
  hinarios: '',
  igrejaRespId: '',
  igrejaRespNome: '',
  igrejasTexto: '',
  localId: '',
  localNome: '',
  localTexto: '',
  total: '',
  fardados: '',
  homens: '',
  mulheres: '',
  criancas: '',
  outros: '',
  outrosDescricao: '',
  loteId: '',
  loteDescricao: '',
  loteTexto: '',
  quantidadeLitros: '',
  anotacoes: ''
};

function isTimestampValue(value: unknown): value is Timestamp {
  return value instanceof Timestamp;
}

export function asDate(value: TimestampLike) {
  if (!value) return null;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value instanceof Date) return value;
  if (isTimestampValue(value)) return value.toDate();
  return null;
}

export function formatDate(value: TimestampLike) {
  const date = asDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('pt-BR');
}

export function formatTime(value: TimestampLike) {
  const date = asDate(value);
  if (!date) return '—';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function totalParticipantes(participantes?: Trabalho['participantes']) {
  if (!participantes) return null;

  const total =
    (participantes.total ?? 0) ||
    (participantes.homens ?? 0) +
      (participantes.mulheres ?? 0) +
      (participantes.criancas ?? 0) +
      (participantes.outros ?? 0);

  return {
    total,
    fardados: participantes.fardados ?? null,
    homens: participantes.homens ?? 0,
    mulheres: participantes.mulheres ?? 0,
    criancas: participantes.criancas ?? 0,
    outros: participantes.outros ?? 0,
    outrosDescricao: participantes.outrosDescricao
  };
}

export function buildTrabalhoPayload(args: {
  bebidaLotes?: BebidaInfo[];
  form: TrabalhoFormState;
  igrejas?: IgrejaInfo[];
  userId: string;
}): TrabalhoInput {
  const { bebidaLotes, form, igrejas, userId } = args;
  const dataTs = form.data ? Timestamp.fromDate(new Date(form.data)) : null;
  const horarioTs = form.horario && form.data
    ? Timestamp.fromDate(new Date(`${form.data}T${form.horario}:00`))
    : null;

  const igrejaResp = igrejas?.find(igreja => igreja.id === form.igrejaRespId);
  const localSelecionado = igrejas?.find(igreja => igreja.id === form.localId);
  const loteSelecionado = bebidaLotes?.find(lote => lote.id === form.loteId);

  const totalManual = form.total ? Number(form.total) : undefined;
  const totalDerivado =
    (form.homens ? Number(form.homens) : 0) +
    (form.mulheres ? Number(form.mulheres) : 0) +
    (form.criancas ? Number(form.criancas) : 0) +
    (form.outros ? Number(form.outros) : 0);

  return {
    titulo: form.titulo || undefined,
    data: dataTs,
    horarioInicio: horarioTs,
    duracaoEsperadaMin: form.duracaoEsperadaMin ? Number(form.duracaoEsperadaMin) : null,
    duracaoEfetivaMin: form.duracaoEfetivaMin ? Number(form.duracaoEfetivaMin) : null,
    localId: localSelecionado?.id,
    localNome: localSelecionado?.nome,
    localTexto: form.localTexto || undefined,
    hinarios: form.hinarios
      .split(',')
      .map(item => item.trim())
      .filter(Boolean),
    igrejasResponsaveisIds: igrejaResp ? [igrejaResp.id] : undefined,
    igrejasResponsaveisNomes: igrejaResp ? [igrejaResp.nome] : undefined,
    igrejasResponsaveisTexto: form.igrejasTexto || undefined,
    participantes: {
      total: totalManual ?? totalDerivado,
      fardados: form.fardados ? Number(form.fardados) : undefined,
      homens: form.homens ? Number(form.homens) : undefined,
      mulheres: form.mulheres ? Number(form.mulheres) : undefined,
      criancas: form.criancas ? Number(form.criancas) : undefined,
      outros: form.outros ? Number(form.outros) : undefined,
      outrosDescricao: form.outrosDescricao || undefined
    },
    bebida: {
      loteId: loteSelecionado?.id || undefined,
      loteDescricao: loteSelecionado?.descricao || form.loteDescricao || undefined,
      loteTexto: form.loteTexto || undefined,
      quantidadeLitros: form.quantidadeLitros ? Number(form.quantidadeLitros) : null
    },
    anotacoes: form.anotacoes || undefined,
    createdBy: userId
  };
}

export function prefillTrabalhoForm(trabalho: Trabalho): TrabalhoFormState {
  const data = asDate(trabalho.data);
  const horario = asDate(trabalho.horarioInicio);

  return {
    titulo: trabalho.titulo || '',
    data: data ? data.toISOString().slice(0, 10) : '',
    horario: horario ? horario.toISOString().slice(11, 16) : '',
    duracaoEsperadaMin: trabalho.duracaoEsperadaMin?.toString() || '',
    duracaoEfetivaMin: trabalho.duracaoEfetivaMin?.toString() || '',
    hinarios: trabalho.hinarios?.join(', ') || '',
    igrejaRespId: trabalho.igrejasResponsaveisIds?.[0] || '',
    igrejaRespNome: trabalho.igrejasResponsaveisNomes?.[0] || '',
    igrejasTexto: trabalho.igrejasResponsaveisTexto || '',
    localId: trabalho.localId || '',
    localNome: trabalho.localNome || '',
    localTexto: trabalho.localTexto || '',
    total: trabalho.participantes?.total?.toString() || '',
    fardados: trabalho.participantes?.fardados?.toString() || '',
    homens: trabalho.participantes?.homens?.toString() || '',
    mulheres: trabalho.participantes?.mulheres?.toString() || '',
    criancas: trabalho.participantes?.criancas?.toString() || '',
    outros: trabalho.participantes?.outros?.toString() || '',
    outrosDescricao: trabalho.participantes?.outrosDescricao || '',
    loteId: trabalho.bebida?.loteId || '',
    loteDescricao: trabalho.bebida?.loteDescricao || '',
    loteTexto: trabalho.bebida?.loteTexto || '',
    quantidadeLitros:
      (trabalho.bebida?.quantidadeLitros ?? '') === ''
        ? ''
        : (trabalho.bebida?.quantidadeLitros ?? '').toString(),
    anotacoes: trabalho.anotacoes || ''
  };
}