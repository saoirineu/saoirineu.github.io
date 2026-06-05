// Run with: node --test scripts/members/build-members.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildMembers,
  keyFor,
  mergeGroup,
  normCF,
  normEmail,
  normName,
  toISODate
} from './build-members.mjs';

test('normCF strips spaces and uppercases', () => {
  assert.equal(normCF(' bzrrce71l56l483g '), 'BZRRCE71L56L483G');
  assert.equal(normCF(''), undefined);
});

test('normEmail lowercases and keeps the first address', () => {
  assert.equal(normEmail('Foo@Bar.IT, other@x.it'), 'foo@bar.it');
  assert.equal(normEmail('not-an-email'), undefined);
});

test('normName removes accents and punctuation', () => {
  assert.equal(normName('Galliani  Giulià'), 'GALLIANI GIULIA');
});

test('toISODate handles Date and string forms', () => {
  assert.equal(toISODate(new Date(1974, 10, 21)), '1974-11-21');
  assert.equal(toISODate('2008-05-13 00:00:00'), '2008-05-13');
  assert.equal(toISODate('13/05/2008'), '2008-05-13');
  assert.equal(toISODate(''), undefined);
});

test('keyFor follows CF → email → name|dob priority', () => {
  assert.equal(keyFor({ fiscalCode: 'ABC', email: 'a@b.it' }), 'ABC');
  assert.ok(keyFor({ email: 'a@b.it' }).startsWith('email-'));
  assert.ok(keyFor({ surname: 'Rossi', firstName: 'Mario', birthDate: '1980-01-01' }).startsWith('name-'));
});

test('mergeGroup keeps COMPLETO value and records the conflicting alternative', () => {
  const complete = { source: { file: 'complete', code: '1' }, surname: 'Abbonati', city: 'Milano' };
  const importer = { source: { file: 'importer', code: '9' }, surname: 'Abbondati', city: 'Milano', profession: 'X' };
  const merged = mergeGroup('CF1', [complete, importer]);
  assert.equal(merged.surname, 'Abbonati'); // COMPLETO wins
  assert.deepEqual(merged.conflicts.surname, ['Abbonati', 'Abbondati']);
  assert.equal(merged.profession, 'X'); // gap filled from importer
  assert.equal(merged.city, 'Milano'); // identical value is not a conflict
  assert.deepEqual(merged.sources.map(s => s.file), ['complete', 'importer']);
  assert.ok(merged.reviewReasons.includes('field-conflict'));
});

test('buildMembers dedups by CF, links possible duplicates, sets firstWorkDate', () => {
  const complete = [
    { source: { file: 'complete', code: '1', line: 2 }, fiscalCode: 'CF1', surname: 'Rossi', firstName: 'Mario', email: 'mario@x.it', birthDate: '1980-01-01' }
  ];
  const importer = [
    // same CF as complete → merges into one
    { source: { file: 'importer', code: '7', line: 11 }, fiscalCode: 'CF1', surname: 'Rossi', firstName: 'Mario', city: 'Roma' },
    // no CF, shares the email → separate id, flagged as possible duplicate
    { source: { file: 'importer', code: '8', line: 12 }, surname: 'Rossi', firstName: 'Mario', email: 'mario@x.it' }
  ];
  const certificates = [
    { line: 2, code: 'C1', subject: 'ROSSI MARIO', type: 'Primo Lavoro', date: '2005-06-01', email: 'mario@x.it', subjectKey: normName('ROSSI MARIO') }
  ];

  const { members } = buildMembers({ complete, importer, certificates });
  const cf = members.find(m => m.id === 'CF1');
  assert.ok(cf);
  assert.equal(cf.city, 'Roma'); // filled from importer
  assert.equal(cf.certificates, undefined); // certificates array is no longer stored
  assert.equal(cf.firstWorkDate, '2005-06-01'); // matched by email
  assert.deepEqual(cf.sources, [
    { file: 'complete', code: '1', line: 2 },
    { file: 'importer', code: '7', line: 11 }
  ]);
  assert.ok(cf.possibleDuplicateIds.length === 1); // email-keyed twin
  const twin = members.find(m => m.id.startsWith('email-'));
  assert.ok(twin.possibleDuplicateIds.includes('CF1'));
});

test('buildMembers reports a member matched to multiple certificates', () => {
  const complete = [
    { source: { file: 'complete', code: '1', line: 2 }, fiscalCode: 'CF1', surname: 'Benzi', firstName: 'Enrico', email: 'b@x.it' }
  ];
  const certificates = [
    { line: 2, code: 'A', subject: 'BENZI ENRICO', date: '1995-06-12', email: 'b@x.it', subjectKey: normName('BENZI ENRICO') },
    { line: 3, code: 'B', subject: 'BENZI ENRICO', date: '1995-02-01', email: 'b@x.it', subjectKey: normName('BENZI ENRICO') }
  ];
  const { members, duplicateCertificates } = buildMembers({ complete, importer: [], certificates });
  const cf = members.find(m => m.id === 'CF1');
  assert.equal(cf.firstWorkDate, '1995-02-01'); // earliest kept
  assert.equal(duplicateCertificates.length, 1);
  assert.equal(duplicateCertificates[0].certificates.length, 2);
});
