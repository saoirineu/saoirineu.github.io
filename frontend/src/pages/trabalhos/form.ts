import { Timestamp } from 'firebase/firestore';

import type { BeverageInfo, ChurchInfo, Trabalho, TrabalhoInput } from '../../lib/trabalhos';

export type TrabalhoFormState = {
  title: string;
  data: string;
  horario: string;
  duracaoEsperadaMin: string;
  duracaoEfetivaMin: string;
  hymnals: string;
  churchRespId: string;
  churchRespName: string;
  churchesText: string;
  venueId: string;
  venueName: string;
  venueText: string;
  total: string;
  fardados: string;
  homens: string;
  mulheres: string;
  children: string;
  others: string;
  othersDescription: string;
  batchId: string;
  batchDescription: string;
  batchText: string;
  liters: string;
  notes: string;
};

type TimestampLike = Timestamp | Date | string | null | undefined;

export const initialTrabalhoForm: TrabalhoFormState = {
  title: '',
  data: '',
  horario: '',
  duracaoEsperadaMin: '',
  duracaoEfetivaMin: '',
  hymnals: '',
  churchRespId: '',
  churchRespName: '',
  churchesText: '',
  venueId: '',
  venueName: '',
  venueText: '',
  total: '',
  fardados: '',
  homens: '',
  mulheres: '',
  children: '',
  others: '',
  othersDescription: '',
  batchId: '',
  batchDescription: '',
  batchText: '',
  liters: '',
  notes: ''
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

export function totalAttendees(attendees?: Trabalho['attendees']) {
  if (!attendees) return null;

  const total =
    (attendees.total ?? 0) ||
    (attendees.homens ?? 0) +
      (attendees.mulheres ?? 0) +
      (attendees.children ?? 0) +
      (attendees.others ?? 0);

  return {
    total,
    fardados: attendees.fardados ?? null,
    homens: attendees.homens ?? 0,
    mulheres: attendees.mulheres ?? 0,
    children: attendees.children ?? 0,
    others: attendees.others ?? 0,
    othersDescription: attendees.othersDescription
  };
}

export function buildTrabalhoPayload(args: {
  beverageBatches?: BeverageInfo[];
  form: TrabalhoFormState;
  churches?: ChurchInfo[];
  userId: string;
}): TrabalhoInput {
  const { beverageBatches, form, churches, userId } = args;
  const dataTs = form.data ? Timestamp.fromDate(new Date(form.data)) : null;
  const horarioTs = form.horario && form.data
    ? Timestamp.fromDate(new Date(`${form.data}T${form.horario}:00`))
    : null;

  const churchResp = churches?.find(church => church.id === form.churchRespId);
  const selectedVenue = churches?.find(church => church.id === form.venueId);
  const selectedBatch = beverageBatches?.find(batch => batch.id === form.batchId);

  const totalManual = form.total ? Number(form.total) : undefined;
  const totalDerived =
    (form.homens ? Number(form.homens) : 0) +
    (form.mulheres ? Number(form.mulheres) : 0) +
    (form.children ? Number(form.children) : 0) +
    (form.others ? Number(form.others) : 0);

  return {
    title: form.title || undefined,
    data: dataTs,
    horarioInicio: horarioTs,
    duracaoEsperadaMin: form.duracaoEsperadaMin ? Number(form.duracaoEsperadaMin) : null,
    duracaoEfetivaMin: form.duracaoEfetivaMin ? Number(form.duracaoEfetivaMin) : null,
    venueId: selectedVenue?.id,
    venueName: selectedVenue?.name,
    venueText: form.venueText || undefined,
    hymnals: form.hymnals
      .split(',')
      .map(item => item.trim())
      .filter(Boolean),
    responsibleChurchIds: churchResp ? [churchResp.id] : undefined,
    responsibleChurchNames: churchResp ? [churchResp.name] : undefined,
    responsibleChurchText: form.churchesText || undefined,
    attendees: {
      total: totalManual ?? totalDerived,
      fardados: form.fardados ? Number(form.fardados) : undefined,
      homens: form.homens ? Number(form.homens) : undefined,
      mulheres: form.mulheres ? Number(form.mulheres) : undefined,
      children: form.children ? Number(form.children) : undefined,
      others: form.others ? Number(form.others) : undefined,
      othersDescription: form.othersDescription || undefined
    },
    beverage: {
      batchId: selectedBatch?.id || undefined,
      batchDescription: selectedBatch?.description || form.batchDescription || undefined,
      batchText: form.batchText || undefined,
      liters: form.liters ? Number(form.liters) : null
    },
    notes: form.notes || undefined,
    createdBy: userId
  };
}

export function prefillTrabalhoForm(trabalho: Trabalho): TrabalhoFormState {
  const data = asDate(trabalho.data);
  const horario = asDate(trabalho.horarioInicio);

  return {
    title: trabalho.title || '',
    data: data ? data.toISOString().slice(0, 10) : '',
    horario: horario ? horario.toISOString().slice(11, 16) : '',
    duracaoEsperadaMin: trabalho.duracaoEsperadaMin?.toString() || '',
    duracaoEfetivaMin: trabalho.duracaoEfetivaMin?.toString() || '',
    hymnals: trabalho.hymnals?.join(', ') || '',
    churchRespId: trabalho.responsibleChurchIds?.[0] || '',
    churchRespName: trabalho.responsibleChurchNames?.[0] || '',
    churchesText: trabalho.responsibleChurchText || '',
    venueId: trabalho.venueId || '',
    venueName: trabalho.venueName || '',
    venueText: trabalho.venueText || '',
    total: trabalho.attendees?.total?.toString() || '',
    fardados: trabalho.attendees?.fardados?.toString() || '',
    homens: trabalho.attendees?.homens?.toString() || '',
    mulheres: trabalho.attendees?.mulheres?.toString() || '',
    children: trabalho.attendees?.children?.toString() || '',
    others: trabalho.attendees?.others?.toString() || '',
    othersDescription: trabalho.attendees?.othersDescription || '',
    batchId: trabalho.beverage?.batchId || '',
    batchDescription: trabalho.beverage?.batchDescription || '',
    batchText: trabalho.beverage?.batchText || '',
    liters:
      (trabalho.beverage?.liters ?? '') === ''
        ? ''
        : (trabalho.beverage?.liters ?? '').toString(),
    notes: trabalho.notes || ''
  };
}
