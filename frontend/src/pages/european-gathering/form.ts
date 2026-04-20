export type Locale = 'pt' | 'en' | 'es' | 'it';

export type AttendanceMode = 'lodging' | 'meals' | 'spiritual';

export type SpiritualWorkId = 'fri-11-19' | 'sat-12-19' | 'mon-14-11' | 'tue-15-19';

export type EuropeanGatheringFormValues = {
  firstName: string;
  lastName: string;
  country: string;
  church: string;
  centerLeader: string;
  phone: string;
  phoneCountryCode: string;
  email: string;
  isInitiated: boolean;
  isIcefluMember: boolean;
  isNovice: boolean;
  attendanceMode: AttendanceMode;
  checkIn: string;
  checkOut: string;
  selectedWorks: SpiritualWorkId[];
  needsExtraLinen: boolean;
  roomNumber: string;
};

export type ContributionBreakdown = {
  nights: number;
  lodging: number;
  spiritualWorks: number;
  extras: number;
  total: number;
};

export type RegistrationDocumentNames = {
  identityDocumentName?: string;
  identityDocumentPath?: string;
  paymentProofName?: string;
  paymentProofPath?: string;
  consentDocumentName?: string;
  consentDocumentPath?: string;
};

export const suggestedCheckInDate = '2026-09-10';
export const suggestedCheckOutDate = '2026-09-16';

export const initialEuropeanGatheringFormValues: EuropeanGatheringFormValues = {
  firstName: '',
  lastName: '',
  country: '',
  church: '',
  centerLeader: '',
  phone: '',
  phoneCountryCode: '+39',
  email: '',
  isInitiated: false,
  isIcefluMember: false,
  isNovice: false,
  attendanceMode: 'lodging',
  checkIn: '',
  checkOut: '',
  selectedWorks: [],
  needsExtraLinen: false,
  roomNumber: ''
};

const worksContributionByCount = {
  anyone:   [0, 100, 180, 240, 300],
  initiated: [0,  80, 150, 210, 260],
  iceflu:   [0,  60, 110, 150, 190]
} as const;

export const consentDocumentPaths: Record<Locale, string> = {
  pt: '/encontro-europeu/consenso-informado-pt.pdf',
  en: '/encontro-europeu/consenso-informado-en.pdf',
  es: '/encontro-europeu/consenso-informado-es.pdf',
  it: '/encontro-europeu/consenso-informado-it.pdf'
};

export const generalProgramPaths: Record<Locale, string> = {
  pt: '/encontro-europeu/programa-geral-pt.pdf',
  en: '/encontro-europeu/programa-geral-en.pdf',
  es: '/encontro-europeu/programa-geral-es.pdf',
  it: '/encontro-europeu/programa-geral-it.pdf'
};

export const directionsPaths: Record<Locale, string> = {
  pt: '/encontro-europeu/como-chegar-pt.pdf',
  en: '/encontro-europeu/como-chegar-en.pdf',
  es: '/encontro-europeu/como-chegar-es.pdf',
  it: '/encontro-europeu/como-chegar-it.pdf'
};

export function resolveInitialLocale(input?: string): Locale {
  const value = (input ?? '').toLowerCase();

  if (value.startsWith('it')) return 'it';
  if (value.startsWith('es')) return 'es';
  if (value.startsWith('en')) return 'en';
  return 'pt';
}

function asDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateNightCount(checkIn: string, checkOut: string) {
  const start = asDate(checkIn);
  const end = asDate(checkOut);

  if (!start || !end) {
    return 0;
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  return diffDays > 0 ? diffDays : 0;
}

export function calculateContribution(values: Pick<EuropeanGatheringFormValues, 'attendanceMode' | 'checkIn' | 'checkOut' | 'selectedWorks' | 'isInitiated' | 'isIcefluMember' | 'needsExtraLinen'>): ContributionBreakdown {
  const nights = values.attendanceMode === 'spiritual' ? 0 : calculateNightCount(values.checkIn, values.checkOut);
  const nightRate = values.attendanceMode === 'meals' ? 30 : 70;
  const lodging = nights * nightRate;
  const selectedWorksCount = Math.min(values.selectedWorks.length, 4);
  const worksTable = values.isIcefluMember ? worksContributionByCount.iceflu
    : values.isInitiated ? worksContributionByCount.initiated
    : worksContributionByCount.anyone;
  const spiritualWorks = worksTable[selectedWorksCount];
  const extras = values.attendanceMode === 'lodging' && values.needsExtraLinen ? 20 : 0;

  return {
    nights,
    lodging,
    spiritualWorks,
    extras,
    total: lodging + spiritualWorks + extras
  };
}

export function buildEuropeanGatheringPayload(args: {
  values: EuropeanGatheringFormValues;
  locale: Locale;
  contribution: ContributionBreakdown;
  documents: RegistrationDocumentNames;
}) {
  const { contribution, documents, locale, values } = args;

  return {
    locale,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    country: values.country.trim(),
    church: values.church.trim(),
    centerLeader: values.centerLeader.trim(),
    isInitiated: values.isInitiated,
    isIcefluMember: values.isIcefluMember,
    isNovice: values.isNovice,
    attendanceMode: values.attendanceMode,
    checkIn: values.attendanceMode === 'spiritual' ? undefined : values.checkIn || undefined,
    checkOut: values.attendanceMode === 'spiritual' ? undefined : values.checkOut || undefined,
    selectedWorks: values.selectedWorks,
    needsExtraLinen: values.attendanceMode === 'lodging' ? values.needsExtraLinen : false,
    roomNumber: values.roomNumber.trim() || undefined,
    identityDocumentName: documents.identityDocumentName,
    identityDocumentPath: documents.identityDocumentPath,
    paymentProofName: documents.paymentProofName,
    paymentProofPath: documents.paymentProofPath,
    consentDocumentName: values.isNovice ? documents.consentDocumentName : undefined,
    consentDocumentPath: values.isNovice ? documents.consentDocumentPath : undefined,
    phone: values.phone.trim() || undefined,
    phoneCountryCode: values.phone.trim() ? values.phoneCountryCode : undefined,
    email: values.email.trim() || undefined,
    contribution,
    status: 'pending' as const
  };
}

export function validateEuropeanGatheringForm(
  values: EuropeanGatheringFormValues,
  docs: { identityDocument: File | null; paymentProof: File | null; consentDocument: File | null },
  existingPaths: { identityDocumentPath?: string; paymentProofPath?: string; consentDocumentPath?: string }
) {
  if (!values.firstName.trim()) return 'firstName';
  if (!values.lastName.trim()) return 'lastName';
  if (!values.email.trim()) return 'email';
  if (!values.phone.trim()) return 'phone';
  if (!values.country.trim()) return 'country';
  if (!values.church.trim()) return 'church';
  if (!values.centerLeader.trim()) return 'centerLeader';
  if (values.selectedWorks.length === 0) return 'selectedWorks';

  if (values.attendanceMode !== 'spiritual') {
    if (!values.checkIn) return 'checkIn';
    if (!values.checkOut) return 'checkOut';
    if (calculateNightCount(values.checkIn, values.checkOut) <= 0) return 'checkOut';
  }

  if (!docs.identityDocument && !existingPaths.identityDocumentPath) return 'identityDocument';
  if (!docs.paymentProof && !existingPaths.paymentProofPath) return 'paymentProof';
  if (values.isNovice && !docs.consentDocument && !existingPaths.consentDocumentPath) return 'consentDocument';

  return null;
}