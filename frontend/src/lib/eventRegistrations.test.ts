import { describe, expect, it } from 'vitest';

import type { EventRecord } from './events';
import {
  buildEventCapacitySnapshot,
  calculateEventCautionDeposit,
  calculateEventContribution,
  calculateEventNightCount,
  eventCapacityBuckets,
  totalEventCapacity,
  totalEventSlotsAvailable,
  validateEventRegistration,
  type EventRegistrationFormValues
} from './eventRegistrations';

function gatheringEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'encontro-europeu-2026',
    title: { pt: 'Encontro', en: 'Gathering', es: '', it: '' },
    slug: 'encontro-europeu-2026',
    status: 'published',
    kind: 'multi',
    capacityMode: 'total',
    totalSlots: 80,
    cautionDepositRate: 0.3,
    payment: {},
    works: [
      { id: 'fri', label: { pt: '', en: 'Fri', es: '', it: '' }, dateTime: '2026-09-25T19:00' },
      { id: 'sat', label: { pt: '', en: 'Sat', es: '', it: '' }, dateTime: '2026-09-26T19:00' },
      { id: 'mon', label: { pt: '', en: 'Mon', es: '', it: '' }, dateTime: '2026-09-28T19:00' },
      { id: 'wed', label: { pt: '', en: 'Wed', es: '', it: '' }, dateTime: '2026-09-30T19:00' }
    ],
    pricing: {
      lodgingNightRate: 70,
      mealsNightRate: 30,
      extraLinen: 20,
      worksByCount: {
        anyone: [0, 100, 180, 240, 300],
        initiated: [0, 80, 150, 210, 260],
        iceflu: [0, 60, 110, 150, 190]
      }
    },
    ...overrides
  };
}

describe('event contribution', () => {
  it('counts nights', () => {
    expect(calculateEventNightCount('2026-09-25', '2026-09-28')).toBe(3);
    expect(calculateEventNightCount('2026-09-28', '2026-09-25')).toBe(0);
    expect(calculateEventNightCount(undefined, '2026-09-28')).toBe(0);
  });

  it('matches the EG pricing (lodging + ICEFLU tier + extras)', () => {
    expect(
      calculateEventContribution(gatheringEvent(), {
        attendanceMode: 'lodging',
        checkIn: '2026-09-25',
        checkOut: '2026-09-28',
        selectedWorks: ['fri', 'sat'],
        isInitiated: true,
        isIcefluMember: true,
        needsExtraLinen: true
      })
    ).toEqual({ nights: 3, lodging: 210, spiritualWorks: 110, extras: 20, total: 340 });
  });

  it('uses meals rate and no extras when not lodging', () => {
    const result = calculateEventContribution(gatheringEvent(), {
      attendanceMode: 'meals',
      checkIn: '2026-09-25',
      checkOut: '2026-09-27',
      selectedWorks: ['fri'],
      isInitiated: false,
      isIcefluMember: false,
      needsExtraLinen: true
    });
    expect(result).toEqual({ nights: 2, lodging: 60, spiritualWorks: 100, extras: 0, total: 160 });
  });

  it('zeroes lodging for spiritual-only and caps works at the event total', () => {
    const result = calculateEventContribution(gatheringEvent(), {
      attendanceMode: 'spiritual',
      selectedWorks: ['fri', 'sat', 'mon', 'wed', 'extra-ignored'],
      isInitiated: false,
      isIcefluMember: false,
      needsExtraLinen: false
    });
    expect(result).toEqual({ nights: 0, lodging: 0, spiritualWorks: 300, extras: 0, total: 300 });
  });

  it('derives the caution deposit from the event rate', () => {
    expect(calculateEventCautionDeposit(gatheringEvent(), 340)).toBe(102);
    expect(calculateEventCautionDeposit(gatheringEvent({ cautionDepositRate: 0.5 }), 340)).toBe(170);
  });
});

describe('event capacity', () => {
  it('uses a single total bucket in total mode', () => {
    const event = gatheringEvent();
    expect(eventCapacityBuckets(event)).toEqual([{ id: 'total', capacity: 80 }]);
    expect(totalEventCapacity(event)).toBe(80);
  });

  it('uses one bucket per room in rooms mode', () => {
    const event = gatheringEvent({
      capacityMode: 'rooms',
      totalSlots: undefined,
      rooms: [
        { name: 'Cedro', capacity: 6 },
        { name: 'Luce', capacity: 8 }
      ]
    });
    expect(totalEventCapacity(event)).toBe(14);
    const snapshot = buildEventCapacitySnapshot(event, { Cedro: 6, Luce: 2 });
    expect(snapshot).toEqual([
      { id: 'Cedro', capacity: 6, reserved: 6, available: 0 },
      { id: 'Luce', capacity: 8, reserved: 2, available: 6 }
    ]);
    expect(totalEventSlotsAvailable(snapshot)).toBe(6);
  });

  it('clamps reserved counts into range', () => {
    const snapshot = buildEventCapacitySnapshot(gatheringEvent(), { total: 200 });
    expect(snapshot[0]).toEqual({ id: 'total', capacity: 80, reserved: 80, available: 0 });
  });
});

describe('validateEventRegistration', () => {
  const filled: EventRegistrationFormValues = {
    firstName: 'Maria',
    lastName: 'Silva',
    email: 'maria@example.com',
    phone: '123',
    country: 'Italia',
    church: 'Centro',
    centerLeader: 'Dirigente',
    centerLeaderEmail: 'dirigente@example.com',
    isInitiated: false,
    isIcefluMember: false,
    isNovice: false,
    attendanceMode: 'lodging',
    checkIn: '2026-09-25',
    checkOut: '2026-09-28',
    selectedWorks: ['fri'],
    needsExtraLinen: false
  };
  const someDocs = { paymentProof: new File([''], 'pay.pdf'), consentDocument: null };
  const noDocs = { paymentProof: null, consentDocument: null };

  it('flags the first missing field', () => {
    expect(validateEventRegistration({ ...filled, firstName: '' }, someDocs, {})).toBe('firstName');
    expect(validateEventRegistration({ ...filled, checkOut: '2026-09-24' }, someDocs, {})).toBe('checkOut');
    expect(validateEventRegistration(filled, noDocs, {})).toBe('paymentProof');
  });

  it('requires consent for novices or when aging requires it', () => {
    expect(validateEventRegistration({ ...filled, isNovice: true }, someDocs, {})).toBe('consentDocument');
    expect(validateEventRegistration(filled, someDocs, {}, true)).toBe('consentDocument');
    expect(validateEventRegistration(filled, someDocs, {})).toBeNull();
  });
});
