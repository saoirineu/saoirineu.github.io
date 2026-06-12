import { describe, expect, it } from 'vitest';

import type { MemberRecord } from '../../lib/members';
import { MEMBER_CSV_COLUMNS, buildMembersCsv, csvEscape } from './csv';

function makeMember(overrides: Partial<MemberRecord> = {}): MemberRecord {
  return {
    id: 'CF1',
    sources: [{ file: 'complete', code: '35', line: 93 }],
    conflicts: {},
    superseeded: {},
    reviewReasons: [],
    possibleDuplicateIds: [],
    needsReview: false,
    ...overrides
  };
}

describe('members CSV export', () => {
  it('escapes commas, quotes and line breaks per RFC 4180', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape('Via Ghiselli, 5')).toBe('"Via Ghiselli, 5"');
    expect(csvEscape('detto "Il Rosso"')).toBe('"detto ""Il Rosso"""');
    expect(csvEscape('line\nbreak')).toBe('"line\nbreak"');
  });

  it('writes the header row with stable field names', () => {
    const header = buildMembersCsv([]).split('\r\n')[0];
    expect(header).toBe(MEMBER_CSV_COLUMNS.join(','));
    expect(header).toContain('id,surname,firstName');
    expect(header).toContain('registrationDate');
    expect(header).toContain('firstWorkDate');
  });

  it('serializes one row per member with empty cells for missing fields', () => {
    const csv = buildMembersCsv([
      makeMember({
        surname: 'SERRE',
        firstName: 'MARA',
        email: 'skywalter@eirene.re.it',
        firstWorkDate: '1996-10-01',
        needsReview: true,
        reviewReasons: ['family-email'],
        possibleDuplicateIds: ['CF2']
      })
    ]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    const cells = lines[1].split(',');
    expect(cells).toHaveLength(MEMBER_CSV_COLUMNS.length);
    expect(cells[MEMBER_CSV_COLUMNS.indexOf('id')]).toBe('CF1');
    expect(cells[MEMBER_CSV_COLUMNS.indexOf('surname')]).toBe('SERRE');
    expect(cells[MEMBER_CSV_COLUMNS.indexOf('firstWorkDate')]).toBe('1996-10-01');
    expect(cells[MEMBER_CSV_COLUMNS.indexOf('city')]).toBe('');
    expect(cells[MEMBER_CSV_COLUMNS.indexOf('needsReview')]).toBe('true');
    expect(cells[MEMBER_CSV_COLUMNS.indexOf('reviewReasons')]).toBe('family-email');
    expect(cells[MEMBER_CSV_COLUMNS.indexOf('possibleDuplicateIds')]).toBe('CF2');
    expect(cells[MEMBER_CSV_COLUMNS.indexOf('sources')]).toBe('complete#35');
  });

  it('keeps quoted multi-value cells parseable', () => {
    const csv = buildMembersCsv([
      makeMember({
        reviewReasons: ['family-email', 'possible-duplicate'],
        sources: [
          { file: 'complete', code: '1', line: 2 },
          { file: 'importer', code: '9', line: 11 }
        ]
      })
    ]);
    const row = csv.split('\r\n')[1];
    expect(row).toContain('family-email; possible-duplicate');
    expect(row).toContain('complete#1; importer#9');
  });
});
