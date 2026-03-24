import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';

import {
  asOptionalBoolean,
  asOptionalNumber,
  asOptionalString,
  asOptionalTimestamp,
  asRecord,
  asStringArray,
  isRecord,
  removeUndefinedDeep
} from './firestoreData';

describe('firestoreData helpers', () => {
  it('recognizes plain records and normalizes non-records', () => {
    expect(isRecord({ ok: true })).toBe(true);
    expect(isRecord(['x'])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(asRecord('invalid')).toEqual({});
    expect(asRecord({ value: 1 })).toEqual({ value: 1 });
  });

  it('coerces optional scalar values safely', () => {
    const timestamp = Timestamp.fromDate(new Date('2024-05-18T10:00:00.000Z'));

    expect(asOptionalTimestamp(timestamp)).toBe(timestamp);
    expect(asOptionalTimestamp('2024-05-18')).toBeNull();
    expect(asOptionalString('abc')).toBe('abc');
    expect(asOptionalString(1)).toBeUndefined();
    expect(asOptionalNumber(42)).toBe(42);
    expect(asOptionalNumber('42')).toBeUndefined();
    expect(asOptionalBoolean(false)).toBe(false);
    expect(asOptionalBoolean('false')).toBeUndefined();
  });

  it('filters non-string array entries', () => {
    expect(asStringArray(['a', 1, 'b', null])).toEqual(['a', 'b']);
    expect(asStringArray([1, 2])).toBeUndefined();
    expect(asStringArray('x')).toBeUndefined();
  });

  it('removes undefined values recursively while preserving null and array order', () => {
    const cleaned = removeUndefinedDeep({
      keepNull: null,
      nested: {
        keep: 'value',
        drop: undefined,
        list: [1, undefined, { ok: true, nope: undefined }]
      },
      drop: undefined
    });

    expect(cleaned).toEqual({
      keepNull: null,
      nested: {
        keep: 'value',
        list: [1, undefined, { ok: true }]
      }
    });
  });

  it('preserves firestore sentinel values', () => {
    const sentinel = serverTimestamp();
    const cleaned = removeUndefinedDeep({
      submittedAt: sentinel,
      drop: undefined
    });

    expect(cleaned).toEqual({ submittedAt: sentinel });
    expect(cleaned.submittedAt).toBe(sentinel);
  });
});