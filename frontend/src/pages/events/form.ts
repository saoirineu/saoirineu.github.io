import { slugify, type CapacityMode, type EventInput, type EventKind, type EventRecord, type EventStatus } from '../../lib/events';

export type EventFormWork = {
  id: string;
  labelPt: string;
  labelEn: string;
  labelEs: string;
  labelIt: string;
  dateTime: string;
};

export type EventFormValues = {
  titlePt: string;
  titleEn: string;
  titleEs: string;
  titleIt: string;
  slug: string;
  status: EventStatus;
  kind: EventKind;
  capacityMode: CapacityMode;
  totalSlots: string;
  rooms: Array<{ name: string; capacity: string }>;
  cautionDepositPercent: string;
  paymentBeneficiary: string;
  paymentIban: string;
  paymentSwift: string;
  paymentCausale: string;
  works: EventFormWork[];
  lodgingNightRate: string;
  mealsNightRate: string;
  extraLinen: string;
  worksAnyone: string;
  worksInitiated: string;
  worksIceflu: string;
  checkInSuggested: string;
  checkOutSuggested: string;
};

export const initialEventForm: EventFormValues = {
  titlePt: '',
  titleEn: '',
  titleEs: '',
  titleIt: '',
  slug: '',
  status: 'draft',
  kind: 'multi',
  capacityMode: 'total',
  totalSlots: '',
  rooms: [],
  cautionDepositPercent: '30',
  paymentBeneficiary: '',
  paymentIban: '',
  paymentSwift: '',
  paymentCausale: '',
  works: [{ id: 'work-1', labelPt: '', labelEn: '', labelEs: '', labelIt: '', dateTime: '' }],
  lodgingNightRate: '70',
  mealsNightRate: '30',
  extraLinen: '20',
  worksAnyone: '',
  worksInitiated: '',
  worksIceflu: '',
  checkInSuggested: '',
  checkOutSuggested: ''
};

export function parseNumberList(value: string): number[] {
  return value
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(part => Number(part))
    .filter(num => !Number.isNaN(num));
}

function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function buildEventInput(values: EventFormValues): EventInput {
  const slugSource = values.slug.trim() || values.titleEn || values.titlePt || values.titleEs || values.titleIt;

  return {
    title: {
      pt: values.titlePt.trim(),
      en: values.titleEn.trim(),
      es: values.titleEs.trim(),
      it: values.titleIt.trim()
    },
    slug: slugify(slugSource),
    status: values.status,
    kind: values.kind,
    capacityMode: values.capacityMode,
    totalSlots: values.capacityMode === 'total' ? toNumber(values.totalSlots) : undefined,
    rooms:
      values.capacityMode === 'rooms'
        ? values.rooms.map(room => ({ name: room.name.trim(), capacity: toNumber(room.capacity) }))
        : undefined,
    cautionDepositRate: toNumber(values.cautionDepositPercent) / 100,
    payment: {
      beneficiary: values.paymentBeneficiary.trim() || undefined,
      iban: values.paymentIban.trim() || undefined,
      swift: values.paymentSwift.trim() || undefined,
      causale: values.paymentCausale.trim() || undefined
    },
    works: values.works.map(work => ({
      id: work.id,
      label: { pt: work.labelPt.trim(), en: work.labelEn.trim(), es: work.labelEs.trim(), it: work.labelIt.trim() },
      dateTime: work.dateTime
    })),
    pricing: {
      lodgingNightRate: toNumber(values.lodgingNightRate),
      mealsNightRate: toNumber(values.mealsNightRate),
      extraLinen: toNumber(values.extraLinen),
      worksByCount: {
        anyone: parseNumberList(values.worksAnyone),
        initiated: parseNumberList(values.worksInitiated),
        iceflu: parseNumberList(values.worksIceflu)
      }
    },
    checkInSuggested: values.checkInSuggested.trim() || undefined,
    checkOutSuggested: values.checkOutSuggested.trim() || undefined
  };
}

export function prefillEventForm(record: EventRecord): EventFormValues {
  return {
    titlePt: record.title.pt,
    titleEn: record.title.en,
    titleEs: record.title.es,
    titleIt: record.title.it,
    slug: record.slug,
    status: record.status,
    kind: record.kind,
    capacityMode: record.capacityMode,
    totalSlots: record.totalSlots != null ? String(record.totalSlots) : '',
    rooms: (record.rooms ?? []).map(room => ({ name: room.name, capacity: String(room.capacity) })),
    cautionDepositPercent: String(Math.round(record.cautionDepositRate * 100)),
    paymentBeneficiary: record.payment.beneficiary ?? '',
    paymentIban: record.payment.iban ?? '',
    paymentSwift: record.payment.swift ?? '',
    paymentCausale: record.payment.causale ?? '',
    works: record.works.length
      ? record.works.map(work => ({
          id: work.id,
          labelPt: work.label.pt,
          labelEn: work.label.en,
          labelEs: work.label.es,
          labelIt: work.label.it,
          dateTime: work.dateTime
        }))
      : initialEventForm.works,
    lodgingNightRate: String(record.pricing.lodgingNightRate),
    mealsNightRate: String(record.pricing.mealsNightRate),
    extraLinen: String(record.pricing.extraLinen),
    worksAnyone: record.pricing.worksByCount.anyone.join(', '),
    worksInitiated: record.pricing.worksByCount.initiated.join(', '),
    worksIceflu: record.pricing.worksByCount.iceflu.join(', '),
    checkInSuggested: record.checkInSuggested ?? '',
    checkOutSuggested: record.checkOutSuggested ?? ''
  };
}
