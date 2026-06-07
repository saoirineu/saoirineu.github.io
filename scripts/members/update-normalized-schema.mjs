#!/usr/bin/env node
/**
 * One-off, edit-preserving schema update for an EXISTING
 * data/members/members.normalized.json (e.g. after manual curation):
 *
 *   - removes the `certificates` array from each member (keeps `firstWorkDate`)
 *   - adds `line` (1-based spreadsheet row) to each source, by looking up the
 *     source's `code` in the original workbooks
 *   - refreshes members.report.md (recomputed from the workbooks)
 *
 * Use this INSTEAD of re-running build-members.mjs when you have hand-edits in
 * the JSON you don't want to lose. It rewrites the JSON in place but only
 * touches `certificates` and `sources[].line` — every other field you edited is
 * preserved.
 *
 * Usage:
 *   node scripts/members/update-normalized-schema.mjs            # dry run
 *   node scripts/members/update-normalized-schema.mjs --write
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DATA_DIR,
  FILES,
  buildMembers,
  buildReport,
  parseCertificates,
  parseComplete,
  parseImporter,
  readRows
} from './build-members.mjs';

const WRITE = process.argv.includes('--write');
const jsonPath = join(DATA_DIR, 'members.normalized.json');
const reportPath = join(DATA_DIR, 'members.report.md');

// (file, code) -> line, from the original workbooks.
const lineByCode = new Map();
const complete = parseComplete(readRows(FILES.complete));
const importer = parseImporter(readRows(FILES.importer));
const certificates = parseCertificates(readRows(FILES.certificates));
for (const record of [...complete, ...importer]) {
  const { file, code, line } = record.source;
  if (code !== undefined) lineByCode.set(`${file}:${code}`, line);
}

const members = JSON.parse(readFileSync(jsonPath, 'utf8'));
let droppedCertFields = 0;
let linesAdded = 0;
let linesMissing = 0;
for (const member of members) {
  if ('certificates' in member) {
    delete member.certificates;
    droppedCertFields += 1;
  }
  for (const source of member.sources ?? []) {
    if (source.line !== undefined) continue;
    const line = source.code !== undefined ? lineByCode.get(`${source.file}:${source.code}`) : undefined;
    if (line !== undefined) {
      source.line = line;
      linesAdded += 1;
    } else {
      linesMissing += 1;
    }
  }
}

// Recompute the report (duplicate-certificate section etc.) from the workbooks.
const built = buildMembers({ complete, importer, certificates });
const report = buildReport(
  built.members,
  built.certStats,
  { complete: complete.length, importer: importer.length, certificates: certificates.length },
  built.duplicateCertificates,
  built.autoResolved,
  built.tieResolved
);

console.log(`Members in JSON: ${members.length}`);
console.log(`certificates field dropped from: ${droppedCertFields}`);
console.log(`sources given a line: ${linesAdded}${linesMissing ? ` (could not resolve ${linesMissing})` : ''}`);

if (!WRITE) {
  console.log('\nDRY RUN — nothing written. Pass --write to apply.');
} else {
  writeFileSync(jsonPath, `${JSON.stringify(members, null, 2)}\n`);
  writeFileSync(reportPath, report);
  console.log(`\nUpdated ${jsonPath}`);
  console.log(`Refreshed ${reportPath}`);
}
