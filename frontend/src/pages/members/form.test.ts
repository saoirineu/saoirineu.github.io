import { describe, expect, it } from 'vitest';

import type { MemberRecord } from '../../lib/members';
import {
  applyConflictResolution,
  formatFullName,
  mergeMemberRecords,
  summarizeReview
} from './form';

function makeMember(overrides: Partial<MemberRecord> = {}): MemberRecord {
  return {
    id: 'CF1',
    sources: [{ file: 'complete', code: '1', line: 2 }],
    conflicts: {},
    reviewReasons: [],
    possibleDuplicateIds: [],
    needsReview: false,
    ...overrides
  };
}

describe('members form helpers', () => {
  it('formats the full name from parts when fullName is absent', () => {
    expect(formatFullName({ surname: 'Rossi', firstName: 'Mario' })).toBe('Rossi Mario');
    expect(formatFullName({ fullName: 'Mario Rossi', surname: 'X', firstName: 'Y' })).toBe('Mario Rossi');
  });

  it('summarizes review state from conflicts, duplicates and sticky tags', () => {
    expect(summarizeReview({ conflicts: {}, possibleDuplicateIds: [], reviewReasons: [] })).toEqual({
      needsReview: false,
      reviewReasons: []
    });
    expect(summarizeReview({ conflicts: { city: ['A', 'B'] }, possibleDuplicateIds: [], reviewReasons: [] })).toEqual({
      needsReview: true,
      reviewReasons: ['field-conflict']
    });
    // a clean importer-merge keeps its informational tag but is not flagged
    expect(
      summarizeReview({ conflicts: {}, possibleDuplicateIds: [], reviewReasons: ['duplicate-in-importer'] })
    ).toEqual({ needsReview: false, reviewReasons: ['duplicate-in-importer'] });
    // certificate-only still needs linking
    expect(summarizeReview({ conflicts: {}, possibleDuplicateIds: [], reviewReasons: ['certificate-only'] })).toEqual({
      needsReview: true,
      reviewReasons: ['certificate-only']
    });
  });

  it('resolves a conflict by setting the winning value and dropping it', () => {
    const member = makeMember({ city: 'Milano', conflicts: { city: ['Milano', 'Roma'] } });
    const patch = applyConflictResolution(member, 'city', 'Roma');
    expect(patch.city).toBe('Roma');
    expect(patch.conflicts).toEqual({});
    expect(patch.needsReview).toBe(false);
    expect(patch.reviewReasons).toEqual([]);
  });

  it('keeps flagged when other conflicts remain after resolving one', () => {
    const member = makeMember({ conflicts: { city: ['A', 'B'], address: ['X', 'Y'] } });
    const patch = applyConflictResolution(member, 'city', 'A');
    expect(patch.conflicts).toEqual({ address: ['X', 'Y'] });
    expect(patch.needsReview).toBe(true);
    expect(patch.reviewReasons).toEqual(['field-conflict']);
  });

  it('merges a source into a target: gap-fill, conflicts, unions, cleared link', () => {
    const target = makeMember({
      id: 'CF1',
      surname: 'Rossi',
      city: 'Milano',
      possibleDuplicateIds: ['email-abc']
    });
    const source = makeMember({
      id: 'email-abc',
      surname: 'Rossi',
      city: 'Roma', // conflicts with target
      profession: 'Artista', // gap-fill
      sources: [{ file: 'importer', code: '8', line: 12 }],
      firstWorkDate: '2005-01-01',
      possibleDuplicateIds: ['CF1']
    });

    const patch = mergeMemberRecords(target, source);
    expect(patch.profession).toBe('Artista'); // filled gap
    expect(patch.conflicts).toEqual({ city: ['Milano', 'Roma'] }); // divergence recorded
    expect(patch.sources).toEqual([
      { file: 'complete', code: '1', line: 2 },
      { file: 'importer', code: '8', line: 12 }
    ]);
    expect(patch.firstWorkDate).toBe('2005-01-01');
    expect(patch.possibleDuplicateIds).toEqual([]); // the two merged ids drop out
    expect(patch.needsReview).toBe(true); // because of the city conflict
  });
});
