import { Timestamp } from 'firebase/firestore';

import type { BeverageInfo, ChurchInfo, Work, WorkInput } from '../../lib/works';

export type WorkFormState = {
  title: string;
  date: string;
  startTime: string;
  expectedDurationMin: string;
  actualDurationMin: string;
  hymnals: string;
  churchRespId: string;
  churchRespName: string;
  churchesText: string;
  venueId: string;
  venueName: string;
  venueText: string;
  total: string;
  initiated: string;
  men: string;
  women: string;
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

export const initialWorkForm: WorkFormState = {
  title: '',
  date: '',
  startTime: '',
  expectedDurationMin: '',
  actualDurationMin: '',
  hymnals: '',
  churchRespId: '',
  churchRespName: '',
  churchesText: '',
  venueId: '',
  venueName: '',
  venueText: '',
  total: '',
  initiated: '',
  men: '',
  women: '',
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

export function totalAttendees(attendees?: Work['attendees']) {
  if (!attendees) return null;

  const total =
    (attendees.total ?? 0) ||
    (attendees.men ?? 0) +
      (attendees.women ?? 0) +
      (attendees.children ?? 0) +
      (attendees.others ?? 0);

  return {
    total,
    initiated: attendees.initiated ?? null,
    men: attendees.men ?? 0,
    women: attendees.women ?? 0,
    children: attendees.children ?? 0,
    others: attendees.others ?? 0,
    othersDescription: attendees.othersDescription
  };
}

export function buildWorkPayload(args: {
  beverageBatches?: BeverageInfo[];
  form: WorkFormState;
  churches?: ChurchInfo[];
  userId: string;
}): WorkInput {
  const { beverageBatches, form, churches, userId } = args;
  const dateTs = form.date ? Timestamp.fromDate(new Date(form.date)) : null;
  const startTimeTs = form.startTime && form.date
    ? Timestamp.fromDate(new Date(`${form.date}T${form.startTime}:00`))
    : null;

  const churchResp = churches?.find(church => church.id === form.churchRespId);
  const selectedVenue = churches?.find(church => church.id === form.venueId);
  const selectedBatch = beverageBatches?.find(batch => batch.id === form.batchId);

  const totalManual = form.total ? Number(form.total) : undefined;
  const totalDerived =
    (form.men ? Number(form.men) : 0) +
    (form.women ? Number(form.women) : 0) +
    (form.children ? Number(form.children) : 0) +
    (form.others ? Number(form.others) : 0);

  return {
    title: form.title || undefined,
    date: dateTs,
    startTime: startTimeTs,
    expectedDurationMin: form.expectedDurationMin ? Number(form.expectedDurationMin) : null,
    actualDurationMin: form.actualDurationMin ? Number(form.actualDurationMin) : null,
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
      initiated: form.initiated ? Number(form.initiated) : undefined,
      men: form.men ? Number(form.men) : undefined,
      women: form.women ? Number(form.women) : undefined,
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

export function prefillWorkForm(work: Work): WorkFormState {
  const date = asDate(work.date);
  const startTime = asDate(work.startTime);

  return {
    title: work.title || '',
    date: date ? date.toISOString().slice(0, 10) : '',
    startTime: startTime ? startTime.toISOString().slice(11, 16) : '',
    expectedDurationMin: work.expectedDurationMin?.toString() || '',
    actualDurationMin: work.actualDurationMin?.toString() || '',
    hymnals: work.hymnals?.join(', ') || '',
    churchRespId: work.responsibleChurchIds?.[0] || '',
    churchRespName: work.responsibleChurchNames?.[0] || '',
    churchesText: work.responsibleChurchText || '',
    venueId: work.venueId || '',
    venueName: work.venueName || '',
    venueText: work.venueText || '',
    total: work.attendees?.total?.toString() || '',
    initiated: work.attendees?.initiated?.toString() || '',
    men: work.attendees?.men?.toString() || '',
    women: work.attendees?.women?.toString() || '',
    children: work.attendees?.children?.toString() || '',
    others: work.attendees?.others?.toString() || '',
    othersDescription: work.attendees?.othersDescription || '',
    batchId: work.beverage?.batchId || '',
    batchDescription: work.beverage?.batchDescription || '',
    batchText: work.beverage?.batchText || '',
    liters:
      (work.beverage?.liters ?? '') === ''
        ? ''
        : (work.beverage?.liters ?? '').toString(),
    notes: work.notes || ''
  };
}
