import { describe, expect, it } from 'vitest';

import {
  buildEuropeanGatheringRoomAvailabilitySnapshot,
  statusBlocksRoomCapacity
} from './europeanGathering';

describe('europeanGathering room availability helpers', () => {
  it('counts only active reservation statuses as occupying a room', () => {
    expect(statusBlocksRoomCapacity('pending')).toBe(true);
    expect(statusBlocksRoomCapacity('under-review')).toBe(true);
    expect(statusBlocksRoomCapacity('approved')).toBe(true);
    expect(statusBlocksRoomCapacity('payment-overdue')).toBe(false);
    expect(statusBlocksRoomCapacity('rejected')).toBe(false);
    expect(statusBlocksRoomCapacity('archived')).toBe(false);
  });

  it('builds room availability from stored aggregate records', () => {
    expect(
      buildEuropeanGatheringRoomAvailabilitySnapshot([
        { id: 'Cedro', reserved: 2, available: 4 },
        { id: 'Luce', reserved: 8, available: 0 }
      ])
    ).toEqual(
      expect.arrayContaining([
        { name: 'Cedro', capacity: 6, reserved: 2, available: 4 },
        { name: 'Luce', capacity: 8, reserved: 8, available: 0 },
        { name: 'Aurora', capacity: 10, reserved: 0, available: 10 }
      ])
    );
  });

  it('ignores invalid legacy room ids in aggregate snapshots', () => {
    expect(
      buildEuropeanGatheringRoomAvailabilitySnapshot([
        { id: 'Au', reserved: 1, available: 0 },
        { id: 'Cedro', reserved: 1, available: 5 }
      ])
    ).toEqual(
      expect.arrayContaining([
        { name: 'Cedro', capacity: 6, reserved: 1, available: 5 },
        { name: 'Aurora', capacity: 10, reserved: 0, available: 10 }
      ])
    );
  });
});
