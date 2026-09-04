import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeCapacityRows, eventCapacityBuckets, statusBlocksCapacity } from './eventCapacity';

test('only statuses that hold a place block capacity', () => {
  for (const status of ['pending', 'under-review', 'approved']) {
    assert.equal(statusBlocksCapacity(status), true, status);
  }
  for (const status of ['rejected', 'archived', 'payment-overdue', '', null, undefined, 7]) {
    assert.equal(statusBlocksCapacity(status), false, String(status));
  }
});

test('total mode yields a single bucket', () => {
  assert.deepEqual(eventCapacityBuckets({ capacityMode: 'total', totalSlots: 40 }), [
    { id: 'total', capacity: 40 }
  ]);
});

test('rooms mode yields one bucket per named room', () => {
  assert.deepEqual(
    eventCapacityBuckets({
      capacityMode: 'rooms',
      rooms: [
        { name: 'Aurora', capacity: 4 },
        { name: 'Cedro', capacity: 2 }
      ]
    }),
    [
      { id: 'Aurora', capacity: 4 },
      { id: 'Cedro', capacity: 2 }
    ]
  );
});

test('malformed events degrade to an empty or zero bucket rather than throwing', () => {
  assert.deepEqual(eventCapacityBuckets(undefined), []);
  assert.deepEqual(eventCapacityBuckets({}), [{ id: 'total', capacity: 0 }]);
  assert.deepEqual(eventCapacityBuckets({ capacityMode: 'total', totalSlots: -5 }), [
    { id: 'total', capacity: 0 }
  ]);
  assert.deepEqual(eventCapacityBuckets({ capacityMode: 'rooms', rooms: 'nope' }), []);
  // A room with no name cannot be counted against, so it is dropped.
  assert.deepEqual(eventCapacityBuckets({ capacityMode: 'rooms', rooms: [{ capacity: 3 }] }), []);
});

test('reserved counts only blocking registrations in that bucket', () => {
  const rows = computeCapacityRows(
    [{ id: 'total', capacity: 10 }],
    [
      { capacityBucket: 'total', status: 'pending' },
      { capacityBucket: 'total', status: 'approved' },
      { capacityBucket: 'total', status: 'under-review' },
      { capacityBucket: 'total', status: 'rejected' },
      { capacityBucket: 'total', status: 'archived' }
    ]
  );
  assert.deepEqual(rows, [{ id: 'total', capacity: 10, reserved: 3, available: 7 }]);
});

test('registrations are counted against their own bucket only', () => {
  const rows = computeCapacityRows(
    [
      { id: 'Aurora', capacity: 4 },
      { id: 'Cedro', capacity: 2 }
    ],
    [
      { capacityBucket: 'Aurora', status: 'pending' },
      { capacityBucket: 'Aurora', status: 'approved' },
      { capacityBucket: 'Cedro', status: 'pending' }
    ]
  );
  assert.deepEqual(rows, [
    { id: 'Aurora', capacity: 4, reserved: 2, available: 2 },
    { id: 'Cedro', capacity: 2, reserved: 1, available: 1 }
  ]);
});

test('registrations naming no bucket, or an unknown one, count against nothing', () => {
  const rows = computeCapacityRows(
    [{ id: 'Aurora', capacity: 4 }],
    [
      { status: 'pending' },
      { capacityBucket: '', status: 'pending' },
      { capacityBucket: 'Demolished Room', status: 'pending' },
      { capacityBucket: 42, status: 'pending' }
    ]
  );
  assert.deepEqual(rows, [{ id: 'Aurora', capacity: 4, reserved: 0, available: 4 }]);
});

test('an over-subscribed bucket reads as full, never as negative availability', () => {
  // Rooms can shrink after people have booked; availability must not go negative.
  const rows = computeCapacityRows(
    [{ id: 'Aurora', capacity: 2 }],
    Array.from({ length: 5 }, () => ({ capacityBucket: 'Aurora', status: 'pending' }))
  );
  assert.deepEqual(rows, [{ id: 'Aurora', capacity: 2, reserved: 2, available: 0 }]);
});

test('an empty event yields an empty, not a broken, snapshot', () => {
  assert.deepEqual(computeCapacityRows([], [{ capacityBucket: 'total', status: 'pending' }]), []);
  assert.deepEqual(computeCapacityRows([{ id: 'total', capacity: 3 }], []), [
    { id: 'total', capacity: 3, reserved: 0, available: 3 }
  ]);
});
