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

test('keyFor follows CF → name|dob → email+name fallback priority', () => {
  assert.equal(keyFor({ fiscalCode: 'ABC', email: 'a@b.it' }), 'ABC');
  assert.ok(keyFor({ surname: 'Rossi', firstName: 'Mario', birthDate: '1980-01-01', email: 'a@b.it' }).startsWith('name-'));
  assert.ok(keyFor({ email: 'a@b.it' }).startsWith('email-'));
  assert.notEqual(
    keyFor({ surname: 'Rossi', firstName: 'Mario', email: 'family@x.it' }),
    keyFor({ surname: 'Verdi', firstName: 'Anna', email: 'family@x.it' })
  );
  assert.ok(keyFor({ surname: 'Rossi', firstName: 'Mario', birthDate: '1980-01-01' }).startsWith('name-'));
});

test('mergeGroup auto-resolves a conflict to the most recently registered value', () => {
  const complete = { source: { file: 'complete', code: '1' }, city: 'Roma', registrationDate: '2024-12-01' };
  const importer = { source: { file: 'importer', code: '9' }, city: 'Milano', profession: 'X', registrationDate: '2010-05-01' };
  const merged = mergeGroup('CF1', [complete, importer]);
  assert.equal(merged.city, 'Roma'); // complete is more recent → wins, no conflict
  assert.equal(merged.conflicts.city, undefined);
  assert.deepEqual(merged.superseeded.city, ['Milano']);
  assert.equal(merged.profession, 'X'); // gap filled from importer
  assert.ok(!merged.reviewReasons.includes('field-conflict'));
  assert.ok(!merged.reviewReasons.includes('duplicate-in-importer'));
  assert.ok(merged.autoResolved >= 1);

  // reverse: when the importer row is the more recent one, it wins
  const merged2 = mergeGroup('CF2', [
    { source: { file: 'complete', code: '1' }, city: 'Roma', registrationDate: '2010-01-01' },
    { source: { file: 'importer', code: '9' }, city: 'Milano', registrationDate: '2024-01-01' }
  ]);
  assert.equal(merged2.city, 'Milano');
});

test('mergeGroup breaks ties by preferring cloud and dropping bare-numeric junk', () => {
  const merged = mergeGroup('CF1', [
    { source: { file: 'complete', code: '1' }, country: '118', surname: 'Abbonati', registrationDate: '2014-05-09' },
    { source: { file: 'importer', code: '9' }, country: 'Italia', surname: 'Abbondati', registrationDate: '2014-05-09' }
  ]);
  assert.equal(merged.country, 'Italia'); // same date → bare-numeric "118" dropped in favor of text
  assert.equal(merged.conflicts.country, undefined);
  assert.deepEqual(merged.superseeded.country, ['118']);
  assert.equal(merged.surname, 'Abbonati'); // same date, both text → prefer cloud (COMPLETO)
  assert.equal(merged.conflicts.surname, undefined);
  assert.deepEqual(merged.superseeded.surname, ['Abbondati']);
  assert.ok(merged.tieResolved >= 2);
  assert.ok(!merged.reviewReasons.includes('field-conflict'));
});

test('mergeGroup keeps a conflict when ties cannot be broken (no cloud value)', () => {
  const merged = mergeGroup('CF1', [
    { source: { file: 'importer', code: '1' }, surname: 'Abbonati', city: 'Milano' },
    { source: { file: 'importer', code: '9' }, surname: 'Abbondati', city: 'Roma', profession: 'X' }
  ]);
  // two importer rows, no dates, no cloud value to prefer → genuine conflict
  assert.deepEqual(merged.conflicts.surname, ['Abbonati', 'Abbondati']);
  assert.deepEqual(merged.conflicts.city, ['Milano', 'Roma']);
  assert.equal(merged.superseeded.surname, undefined);
  assert.equal(merged.superseeded.city, undefined);
  assert.equal(merged.profession, 'X'); // gap filled
  assert.ok(merged.reviewReasons.includes('field-conflict'));
  assert.ok(merged.reviewReasons.includes('duplicate-in-importer'));
});

test('buildMembers does not flag clean importer duplicates when the newest entry wins', () => {
  const importer = [
    { source: { file: 'importer', code: '1', line: 5 }, surname: 'Rossi', firstName: 'Mario', email: 'mario@x.it', city: 'Roma', registrationDate: '2010-01-01' },
    { source: { file: 'importer', code: '2', line: 8 }, surname: 'Rossi', firstName: 'Mario', email: 'mario@x.it', city: 'Milano', registrationDate: '2024-01-01' }
  ];

  const { members } = buildMembers({ complete: [], importer, certificates: [] });
  assert.equal(members.length, 1);
  assert.equal(members[0].city, 'Milano');
  assert.equal(members[0].needsReview, false);
  assert.ok(!members[0].reviewReasons.includes('duplicate-in-importer'));
  assert.deepEqual(members[0].superseeded.city, ['Roma']);
});

test('buildMembers auto-merges same-name same-email duplicates and sets firstWorkDate', () => {
  const complete = [
    { source: { file: 'complete', code: '1', line: 2 }, fiscalCode: 'CF1', surname: 'Rossi', firstName: 'Mario', email: 'mario@x.it', birthDate: '1980-01-01' }
  ];
  const importer = [
    // same CF as complete → merges into one
    { source: { file: 'importer', code: '7', line: 11 }, fiscalCode: 'CF1', surname: 'Rossi', firstName: 'Mario', city: 'Roma' },
    // same normalized name + same email → folded in before the possible-duplicate pass
    { source: { file: 'importer', code: '8', line: 12 }, surname: 'ROSSI', firstName: 'Mario', email: 'mario@x.it', profession: 'Musicista', registrationDate: '2024-01-10' }
  ];
  const certificates = [
    { line: 2, code: 'C1', subject: 'ROSSI MARIO', type: 'Primo Lavoro', date: '2005-06-01', email: 'mario@x.it', subjectKey: normName('ROSSI MARIO') }
  ];

  const { members } = buildMembers({ complete, importer, certificates });
  assert.equal(members.length, 1);
  const cf = members[0];
  assert.ok(cf);
  assert.equal(cf.id, 'CF1');
  assert.equal(cf.city, 'Roma'); // filled from importer
  assert.equal(cf.profession, 'Musicista'); // folded in from the email-keyed twin
  assert.equal(cf.certificates, undefined); // certificates array is no longer stored
  assert.equal(cf.firstWorkDate, '2005-06-01'); // matched by email
  assert.deepEqual(cf.sources, [
    { file: 'complete', code: '1', line: 2 },
    { file: 'importer', code: '7', line: 11 },
    { file: 'importer', code: '8', line: 12 }
  ]);
  assert.equal(cf.possibleDuplicateIds.length, 0);
  assert.equal(cf.needsReview, false);
});

test('buildMembers auto-merges exact same-name birthdate duplicates across key types', () => {
  const complete = [
    { source: { file: 'complete', code: '545', line: 370 }, surname: 'Angeletti', firstName: 'Emanuele', birthDate: '1964-05-30', profession: 'operaio', registrationDate: '2013-12-07' }
  ];
  const importer = [
    { source: { file: 'importer', code: '732', line: 736 }, surname: 'Angeletti', firstName: 'Emanuele', birthDate: '1964-05-30', email: 'manuelangel64ae@gmail.com', country: 'Italia', registrationDate: '2013-12-07' }
  ];

  const { members } = buildMembers({ complete, importer, certificates: [] });
  assert.equal(members.length, 1);
  assert.equal(members[0].email, 'manuelangel64ae@gmail.com');
  assert.deepEqual(members[0].sources.map(source => source.file), ['complete', 'importer']);
  assert.equal(members[0].possibleDuplicateIds.length, 0);
  assert.equal(members[0].needsReview, false);
});

test('buildMembers auto-merges same-email near-name variants as typos or middle-name differences', () => {
  const complete = [
    { source: { file: 'complete', code: '343', line: 108 }, surname: 'Caffarena', firstName: 'Sara', fiscalCode: 'CFFSRA77C69D969A', birthDate: '1977-03-29', email: 'saracaffarena@hotmail.com', address: 'Via fratelli Ferrari', registrationDate: '2012-06-17' }
  ];
  const importer = [
    { source: { file: 'importer', code: '900', line: 901 }, surname: 'Carffarena', firstName: 'Sara', fiscalCode: 'CRFSRA77C69D969M', birthDate: '1977-03-29', email: 'saracaffarena@hotmail.com', address: 'Via fratelli Ferrari', registrationDate: '2012-06-23' },
    { source: { file: 'importer', code: '1260', line: 1264 }, surname: 'Canciani', firstName: 'Alex', birthDate: '1974-01-04', email: 'alexcanciani1@gmail.com', city: 'Cerviniano del Friuli', profession: 'Operatore Olistico', registrationDate: '2017-06-30' },
    { source: { file: 'importer', code: '1261', line: 1265 }, surname: 'Canciani', firstName: 'Alex Maria', fiscalCode: 'CNCLMR74A04L483F', birthDate: '1974-01-04', email: 'alexcanciani1@gmail.com', city: 'Cervignano', profession: 'Libero Professionista', registrationDate: '2018-07-27' }
  ];
  const certificates = [
    { line: 94, code: '89617', subject: 'CAFFARENA SARA', date: '2012-06-17', email: 'saracaffarena@hotmail.com', subjectKey: normName('CAFFARENA SARA') }
  ];

  const { members } = buildMembers({ complete, importer, certificates });
  const saraMatches = members.filter(member => member.email === 'saracaffarena@hotmail.com');
  assert.equal(saraMatches.length, 1);
  const sara = saraMatches[0];
  assert.ok(sara);
  assert.equal(sara.id, 'CFFSRA77C69D969A');
  assert.equal(sara.surname, 'Caffarena');
  assert.equal(sara.fiscalCode, 'CFFSRA77C69D969A');
  assert.equal(sara.registrationDate, '2012-06-23');
  assert.equal(sara.firstWorkDate, '2012-06-17');
  assert.equal(sara.possibleDuplicateIds.length, 0);
  assert.equal(sara.needsReview, false);
  assert.deepEqual(sara.superseeded.surname, ['Carffarena']);
  assert.deepEqual(sara.superseeded.fiscalCode, ['CRFSRA77C69D969M']);
  assert.deepEqual(sara.superseeded.registrationDate, ['2012-06-17']);

  const alex = members.find(member => member.email === 'alexcanciani1@gmail.com');
  assert.ok(alex);
  assert.equal(alex.id, 'CNCLMR74A04L483F');
  assert.equal(alex.possibleDuplicateIds.length, 0);
  assert.equal(alex.city, 'Cervignano');
  assert.deepEqual(alex.superseeded.firstName, ['Alex']);
  assert.deepEqual(alex.superseeded.city, ['Cerviniano del Friuli']);
});

test('buildMembers flags same-email different-name members as family-email duplicates', () => {
  const complete = [
    { source: { file: 'complete', code: '1', line: 2 }, fiscalCode: 'CF1', surname: 'Rossi', firstName: 'Mario', email: 'shared@x.it', birthDate: '1980-01-01' }
  ];
  const importer = [
    { source: { file: 'importer', code: '8', line: 12 }, surname: 'Verdi', firstName: 'Anna', email: 'shared@x.it', birthDate: '1985-02-02' }
  ];

  const { members } = buildMembers({ complete, importer, certificates: [] });
  assert.equal(members.length, 2);
  const cf = members.find(m => m.id === 'CF1');
  assert.ok(cf);
  assert.ok(cf.possibleDuplicateIds.length === 1);
  assert.ok(cf.reviewReasons.includes('family-email'));
  assert.ok(!cf.reviewReasons.includes('possible-duplicate'));
  assert.equal(cf.needsReview, true);
  const twin = members.find(m => m.id !== 'CF1');
  assert.ok(twin);
  assert.deepEqual(twin.possibleDuplicateIds, ['CF1']);
  assert.ok(twin.reviewReasons.includes('family-email'));
  assert.equal(twin.needsReview, true);
});

test('buildMembers folds a CF-less twin into the CF record by name+birthdate', () => {
  const complete = [
    { source: { file: 'complete', code: '1', line: 2 }, fiscalCode: 'CF1', surname: 'Alfano', firstName: 'Fabrizio', birthDate: '1964-03-26', email: 'alfa@x.it', city: 'Jesi' }
  ];
  const importer = [
    // same person, no CF on this row → folded into CF1 by name+birthdate
    { source: { file: 'importer', code: '9', line: 11 }, surname: 'Alfano', firstName: 'Fabrizio', birthDate: '1964-03-26', profession: 'ristoratore' }
  ];
  const { members } = buildMembers({ complete, importer, certificates: [] });
  assert.equal(members.length, 1);
  const m = members[0];
  assert.equal(m.id, 'CF1');
  assert.equal(m.fiscalCode, 'CF1');
  assert.equal(m.profession, 'ristoratore'); // gap filled from the absorbed row
  assert.deepEqual(m.sources.map(s => s.file), ['complete', 'importer']);
  assert.equal(m.possibleDuplicateIds.length, 0);
});

test('buildMembers auto-merges same-name birthdate records even when two CFs disagree', () => {
  const complete = [
    { source: { file: 'complete', code: '1' }, fiscalCode: 'CFA', surname: 'Rossi', firstName: 'Mario', birthDate: '1980-01-01' },
    { source: { file: 'complete', code: '2' }, fiscalCode: 'CFB', surname: 'Rossi', firstName: 'Mario', birthDate: '1980-01-01' }
  ];
  const importer = [
    { source: { file: 'importer', code: '9' }, surname: 'Rossi', firstName: 'Mario', birthDate: '1980-01-01', email: 'm@x.it' }
  ];
  const { members } = buildMembers({ complete, importer, certificates: [] });
  assert.equal(members.length, 1);
  assert.ok(['CFA', 'CFB'].includes(members[0].id));
  assert.ok(members[0].sources.some(source => source.file === 'importer'));
  assert.deepEqual(members[0].superseeded.fiscalCode, members[0].id === 'CFA' ? ['CFB'] : ['CFA']);
  assert.equal(members[0].needsReview, false);
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
