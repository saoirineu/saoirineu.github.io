// Server-side capacity accounting for event registrations.
//
// This used to run in the browser: adjustEventCapacity() incremented the bucket
// inside the same transaction that wrote the registration, which meant the rule
// had to let clients write the counters — and a rule cannot verify a count, so
// any signed-in member could set reserved to capacity (closing the event for
// everyone) or to zero (overbooking it).
//
// The count is now derived here, from the registrations themselves, so it is
// authoritative and self-healing: whatever a counter says, the next write
// recomputes it from the documents that actually exist.
//
// Pure, so the arithmetic is testable without a Firestore harness.

export type CapacityBucket = { id: string; capacity: number };
export type CapacityRow = CapacityBucket & { reserved: number; available: number };

/** Mirrors capacityBlockingStatuses in frontend/src/lib/eventRegistrations.ts. */
const BLOCKING_STATUSES = ['pending', 'under-review', 'approved'];

export function statusBlocksCapacity(status: unknown): boolean {
  return typeof status === 'string' && BLOCKING_STATUSES.includes(status);
}

/**
 * Mirrors eventCapacityBuckets in the frontend: 'rooms' mode gives one bucket per
 * room name, anything else a single bucket called 'total'.
 */
export function eventCapacityBuckets(event: Record<string, unknown> | undefined): CapacityBucket[] {
  if (!event) return [];

  if (event.capacityMode === 'rooms') {
    const rooms = Array.isArray(event.rooms) ? event.rooms : [];
    return rooms
      .map(room => {
        const entry = (room ?? {}) as { name?: unknown; capacity?: unknown };
        const id = typeof entry.name === 'string' ? entry.name : '';
        const capacity = typeof entry.capacity === 'number' && entry.capacity >= 0 ? entry.capacity : 0;
        return { id, capacity };
      })
      .filter(bucket => bucket.id !== '');
  }

  const totalSlots = typeof event.totalSlots === 'number' && event.totalSlots >= 0 ? event.totalSlots : 0;
  return [{ id: 'total', capacity: totalSlots }];
}

/**
 * Recomputes every bucket from the registrations that exist.
 *
 * A registration counts against a bucket when its status still holds a place and
 * its capacityBucket names that bucket. Registrations naming no bucket, or one the
 * event no longer defines, count against nothing — the same as the client did when
 * bucketFor() returned null.
 *
 * `reserved` is clamped into [0, capacity]: an event whose rooms shrank below what
 * is already booked should read as full, not as negative availability.
 */
export function computeCapacityRows(
  buckets: readonly CapacityBucket[],
  registrations: readonly { capacityBucket?: unknown; status?: unknown }[]
): CapacityRow[] {
  const counts = new Map<string, number>();
  for (const registration of registrations) {
    if (!statusBlocksCapacity(registration.status)) continue;
    const bucketId = registration.capacityBucket;
    if (typeof bucketId !== 'string' || bucketId === '') continue;
    counts.set(bucketId, (counts.get(bucketId) ?? 0) + 1);
  }

  return buckets.map(bucket => {
    const reserved = Math.max(0, Math.min(bucket.capacity, counts.get(bucket.id) ?? 0));
    return { ...bucket, reserved, available: bucket.capacity - reserved };
  });
}
