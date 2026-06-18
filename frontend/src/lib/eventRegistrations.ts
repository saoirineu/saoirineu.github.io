import type { EventRecord } from './events';

// Pure, event-parameterized registration logic (Phase 4c, part 1).
// The Firestore CRUD, capacity transactions, rules and the generic renderer build on these.

export type EventAttendanceMode = 'lodging' | 'meals' | 'spiritual';

export type EventContributionInputs = {
  attendanceMode: EventAttendanceMode;
  checkIn?: string;
  checkOut?: string;
  selectedWorks: string[];
  isInitiated: boolean;
  isIcefluMember: boolean;
  needsExtraLinen: boolean;
};

export type EventContributionBreakdown = {
  nights: number;
  lodging: number;
  spiritualWorks: number;
  extras: number;
  total: number;
};

function asDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateEventNightCount(checkIn?: string, checkOut?: string): number {
  const start = asDate(checkIn);
  const end = asDate(checkOut);
  if (!start || !end) return 0;
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diffDays > 0 ? diffDays : 0;
}

export function calculateEventContribution(event: EventRecord, values: EventContributionInputs): EventContributionBreakdown {
  const nights = values.attendanceMode === 'spiritual' ? 0 : calculateEventNightCount(values.checkIn, values.checkOut);
  const nightRate = values.attendanceMode === 'meals' ? event.pricing.mealsNightRate : event.pricing.lodgingNightRate;
  const lodging = nights * nightRate;

  const tier = values.isIcefluMember
    ? event.pricing.worksByCount.iceflu
    : values.isInitiated
      ? event.pricing.worksByCount.initiated
      : event.pricing.worksByCount.anyone;
  const worksCount = Math.min(values.selectedWorks.length, event.works.length);
  const spiritualWorks = tier[worksCount] ?? 0;

  const extras = values.attendanceMode === 'lodging' && values.needsExtraLinen ? event.pricing.extraLinen : 0;

  return { nights, lodging, spiritualWorks, extras, total: lodging + spiritualWorks + extras };
}

export function calculateEventCautionDeposit(event: EventRecord, total: number): number {
  return Math.round(total * event.cautionDepositRate);
}

// ---- Capacity ---------------------------------------------------------------

export type EventCapacityBucket = { id: string; capacity: number };
export type EventCapacitySnapshotRow = EventCapacityBucket & { reserved: number; available: number };

// 'total' mode → a single bucket id 'total'; 'rooms' mode → one bucket per room name.
export function eventCapacityBuckets(event: EventRecord): EventCapacityBucket[] {
  if (event.capacityMode === 'rooms') {
    return (event.rooms ?? []).map(room => ({ id: room.name, capacity: room.capacity }));
  }
  return [{ id: 'total', capacity: event.totalSlots ?? 0 }];
}

export function totalEventCapacity(event: EventRecord): number {
  return eventCapacityBuckets(event).reduce((sum, bucket) => sum + bucket.capacity, 0);
}

export function buildEventCapacitySnapshot(
  event: EventRecord,
  reservedByBucket: Record<string, number>
): EventCapacitySnapshotRow[] {
  return eventCapacityBuckets(event).map(bucket => {
    const reserved = Math.max(0, Math.min(bucket.capacity, reservedByBucket[bucket.id] ?? 0));
    return { ...bucket, reserved, available: bucket.capacity - reserved };
  });
}

export function totalEventSlotsAvailable(snapshot: EventCapacitySnapshotRow[]): number {
  return snapshot.reduce((sum, row) => sum + row.available, 0);
}

// ---- Validation -------------------------------------------------------------

export type EventRegistrationFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  church: string;
  centerLeader: string;
  centerLeaderEmail: string;
  isInitiated: boolean;
  isIcefluMember: boolean;
  isNovice: boolean;
  attendanceMode: EventAttendanceMode;
  checkIn: string;
  checkOut: string;
  selectedWorks: string[];
  needsExtraLinen: boolean;
};

export type EventRegistrationValidationError =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'country'
  | 'church'
  | 'centerLeader'
  | 'centerLeaderEmail'
  | 'selectedWorks'
  | 'checkIn'
  | 'checkOut'
  | 'identityDocument'
  | 'paymentProof'
  | 'consentDocument';

export function validateEventRegistration(
  values: EventRegistrationFormValues,
  docs: { identityDocument: File | null; paymentProof: File | null; consentDocument: File | null },
  existingPaths: { identityDocumentPath?: string; paymentProofPath?: string; consentDocumentPath?: string },
  requireConsent = false
): EventRegistrationValidationError | null {
  if (!values.firstName.trim()) return 'firstName';
  if (!values.lastName.trim()) return 'lastName';
  if (!values.email.trim()) return 'email';
  if (!values.phone.trim()) return 'phone';
  if (!values.country.trim()) return 'country';
  if (!values.church.trim()) return 'church';
  if (!values.centerLeader.trim()) return 'centerLeader';
  if (!values.centerLeaderEmail.trim()) return 'centerLeaderEmail';
  if (values.selectedWorks.length === 0) return 'selectedWorks';

  if (values.attendanceMode !== 'spiritual') {
    if (!values.checkIn) return 'checkIn';
    if (!values.checkOut) return 'checkOut';
    if (calculateEventNightCount(values.checkIn, values.checkOut) <= 0) return 'checkOut';
  }

  if (!docs.identityDocument && !existingPaths.identityDocumentPath) return 'identityDocument';
  if (!docs.paymentProof && !existingPaths.paymentProofPath) return 'paymentProof';
  if ((values.isNovice || requireConsent) && !docs.consentDocument && !existingPaths.consentDocumentPath) {
    return 'consentDocument';
  }

  return null;
}
