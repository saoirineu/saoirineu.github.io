import { describe, expect, it } from 'vitest';

import type { MemberRecord } from '../../lib/members';
import {
  applyConflictResolution,
  dismissDuplicateLink,
  duplicateReason,
  formatFullName,
  mergeMemberRecords,
  summarizeReview
} from './form';

function makeMember(overrides: Partial<MemberRecord> = {}): MemberRecord {
  return {
    id: 'CF1',
    sources: [{ file: 'complete', code: '1', line: 2 }],
    conflicts: {},
    superseeded: {},
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
    expect(
      summarizeReview({ conflicts: {}, possibleDuplicateIds: ['CF2'], reviewReasons: ['family-email'] })
    ).toEqual({ needsReview: true, reviewReasons: ['family-email'] });
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
    expect(patch.superseeded).toEqual({ city: ['Milano'] });
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

  it('explains why two members are possible duplicates', () => {
    const agui = makeMember({ id: 'CF1', surname: 'AGUI', firstName: 'DOMENICO', email: 'arcalchemica@gmail.com', birthDate: '1983-12-03' });
    const bertocchi = makeMember({ id: 'CF2', surname: 'BERTOCCHI', firstName: 'SILVIA', email: 'arcalchemica@gmail.com', birthDate: '1981-03-19' });
    // different people sharing one email → linked as family-email
    expect(duplicateReason(agui, bertocchi)).toEqual({ kind: 'family-email', value: 'arcalchemica@gmail.com' });

    // same person under two fiscal codes (no shared email) → linked by name + birth date
    const a = makeMember({ id: 'CF3', surname: 'Rossi', firstName: 'Mário', birthDate: '1980-01-01', email: 'a@x.it' });
    const b = makeMember({ id: 'CF4', surname: 'ROSSI', firstName: 'MARIO', birthDate: '1980-01-01', email: 'b@x.it' });
    expect(duplicateReason(a, b)).toEqual({ kind: 'name-birthdate' });

    const canciani = makeMember({ id: 'CF5', surname: 'Canciani', firstName: 'Alex Maria', email: 'alexcanciani1@gmail.com', birthDate: '1974-01-04' });
    const cancianiImport = makeMember({ id: 'CF6', surname: 'Canciani', firstName: 'Alex', email: 'alexcanciani1@gmail.com', birthDate: '1974-01-04' });
    expect(duplicateReason(canciani, cancianiImport)).toEqual({ kind: 'email', value: 'alexcanciani1@gmail.com' });

    const c = makeMember({ id: 'CF7', surname: 'Verdi', firstName: 'Anna', birthDate: '1990-05-05' });
    expect(duplicateReason(a, c)).toEqual({ kind: 'other' });
  });

  it('merges a source into a target: gap-fill, conflicts, unions, cleared link', () => {
    const target = makeMember({
      id: 'CF1',
      surname: 'Rossi',
      city: 'Milano',
      possibleDuplicateIds: ['email-abc'],
      superseeded: { email: ['old@x.it'] }
    });
    const source = makeMember({
      id: 'email-abc',
      surname: 'Rossi',
      city: 'Roma', // conflicts with target
      profession: 'Artista', // gap-fill
      sources: [{ file: 'importer', code: '8', line: 12 }],
      firstWorkDate: '2005-01-01',
      possibleDuplicateIds: ['CF1'],
      superseeded: { city: ['Torino'] }
    });

    const patch = mergeMemberRecords(target, source);
    expect(patch.profession).toBe('Artista'); // filled gap
    expect(patch.conflicts).toEqual({ city: ['Milano', 'Roma'] }); // divergence recorded
    expect(patch.superseeded).toEqual({ email: ['old@x.it'], city: ['Torino'] });
    expect(patch.sources).toEqual([
      { file: 'complete', code: '1', line: 2 },
      { file: 'importer', code: '8', line: 12 }
    ]);
    expect(patch.firstWorkDate).toBe('2005-01-01');
    expect(patch.possibleDuplicateIds).toEqual([]); // the two merged ids drop out
    expect(patch.needsReview).toBe(true); // because of the city conflict
  });

  it('keeps a family-email pair separate without dropping other duplicate review reasons', () => {
    const member = makeMember({
      id: 'CF1',
      surname: 'Rossi',
      firstName: 'Mario',
      birthDate: '1980-01-01',
      email: 'shared@x.it',
      reviewReasons: ['family-email', 'possible-duplicate'],
      possibleDuplicateIds: ['CF2', 'CF3']
    });
    const family = makeMember({
      id: 'CF2',
      surname: 'Verdi',
      firstName: 'Anna',
      birthDate: '1985-02-02',
      email: 'shared@x.it',
      reviewReasons: ['family-email'],
      possibleDuplicateIds: ['CF1']
    });
    const duplicate = makeMember({
      id: 'CF3',
      surname: 'Rossi',
      firstName: 'Mario',
      birthDate: '1980-01-01',
      email: 'other@x.it',
      reviewReasons: ['possible-duplicate'],
      possibleDuplicateIds: ['CF1']
    });

    const patches = dismissDuplicateLink({ member, candidate: family, allMembers: [member, family, duplicate] });
    expect(patches.memberPatch.possibleDuplicateIds).toEqual(['CF3']);
    expect(patches.memberPatch.reviewReasons).toEqual(['possible-duplicate']);
    expect(patches.memberPatch.needsReview).toBe(true);
    expect(patches.candidatePatch.possibleDuplicateIds).toEqual([]);
    expect(patches.candidatePatch.reviewReasons).toEqual([]);
    expect(patches.candidatePatch.needsReview).toBe(false);
  });
});
