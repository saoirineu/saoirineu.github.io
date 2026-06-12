import { MEMBER_TEXT_FIELDS, type MemberRecord } from '../../lib/members';

/**
 * CSV export of the members table. Columns use the stable Firestore field
 * names (not localized labels) so the file round-trips cleanly into other
 * tools (Google Sheets, Excel, scripts).
 */
export const MEMBER_CSV_COLUMNS = [
  'id',
  ...MEMBER_TEXT_FIELDS,
  'needsReview',
  'reviewReasons',
  'possibleDuplicateIds',
  'sources'
] as const;

export type MemberCsvColumn = (typeof MEMBER_CSV_COLUMNS)[number];

/** RFC 4180: quote when the value holds a comma, quote or line break. */
export function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function csvValue(member: MemberRecord, column: MemberCsvColumn): string {
  switch (column) {
    case 'id':
      return member.id;
    case 'needsReview':
      return member.needsReview ? 'true' : 'false';
    case 'reviewReasons':
      return member.reviewReasons.join('; ');
    case 'possibleDuplicateIds':
      return member.possibleDuplicateIds.join('; ');
    case 'sources':
      return member.sources.map(source => `${source.file}${source.code ? `#${source.code}` : ''}`).join('; ');
    default:
      return member[column] ?? '';
  }
}

export function buildMembersCsv(members: MemberRecord[]): string {
  const lines = [MEMBER_CSV_COLUMNS.join(',')];
  for (const member of members) {
    lines.push(MEMBER_CSV_COLUMNS.map(column => csvEscape(csvValue(member, column))).join(','));
  }
  return lines.join('\r\n');
}

/** Trigger a browser download. The BOM keeps accents intact in Excel/Sheets. */
export function downloadMembersCsv(members: MemberRecord[], filename: string): void {
  const blob = new Blob(['\uFEFF', buildMembersCsv(members)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
