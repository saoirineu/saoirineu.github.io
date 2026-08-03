// Run with: node --test scripts/members/fix-estero.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyEstero,
  classifyRow,
  countryInText,
  hasEdits,
  hasItalianRegion,
  normText,
  normalizeCountry,
  parseCSV,
  serializeCSV
} from './fix-estero.mjs';

test('normText strips accents and punctuation', () => {
  assert.equal(normText('Chailly-en-Bière, Francia'), 'chailly en biere francia');
  assert.equal(normText('  ŠKOFJA LOKA '), 'skofja loka');
  assert.equal(normText(undefined), '');
});

test('normalizeCountry maps every spelling to the Italian name', () => {
  assert.equal(normalizeCountry('Switzerland'), 'Svizzera');
  assert.equal(normalizeCountry('España'), 'Spagna');
  assert.equal(normalizeCountry('Österreich'), 'Austria');
  assert.equal(normalizeCountry('Inghilterra'), 'Regno Unito');
  assert.equal(normalizeCountry('Olanda'), 'Paesi Bassi');
  assert.equal(normalizeCountry('ITA'), 'Italia');
  assert.equal(normalizeCountry('118'), undefined);
});

test('countryInText matches whole words only', () => {
  assert.equal(countryInText('Bellinzona Suiça'), 'Svizzera');
  assert.equal(countryInText('Louisville, KY USA'), 'Stati Uniti');
  assert.equal(countryInText('GRAN BRETAGNA E IRLANDA DEL NORD'), 'Regno Unito');
  assert.equal(countryInText('Franciacorta'), undefined);
  assert.equal(countryInText('Roma'), undefined);
});

test('hasItalianRegion knows the twenty regions', () => {
  assert.equal(hasItalianRegion('emilia-romagna'), true);
  assert.equal(hasItalianRegion("VALLE D'AOSTA"), true);
  assert.equal(hasItalianRegion('ESTERO'), false);
  assert.equal(hasItalianRegion(''), false);
});

test('classifyRow flags the archive markers', () => {
  const row = { city: '', address: '', province: 'ESTERO', region: '', country: 'Israele' };
  assert.deepEqual(classifyRow(row), {
    foreign: true,
    country: 'Israele',
    evidence: ['province «ESTERO» in archivio', 'colonna country «Israele»']
  });
});

test('classifyRow catches the CH = Confoederatio Helvetica rows', () => {
  // The bug this pass fixes: province CH is Chieti for ISTAT, Switzerland here.
  const result = classifyRow({
    city: 'Svizzera', address: 'Rte de cassonay 180', province: 'CH', region: 'ABRUZZO', country: 'Italia'
  });
  assert.equal(result.foreign, true);
  assert.equal(result.country, 'Svizzera');
});

test('classifyRow resolves curated foreign localities', () => {
  const chur = classifyRow({ city: 'Chur', address: 'Via poststrasse 39', province: 'CH', region: 'ABRUZZO', country: 'Italia' });
  assert.equal(chur.country, 'Svizzera');
  const kranj = classifyRow({ city: '4000 / KRANJ', address: '', province: 'ESTERO', region: '', country: 'Italia' });
  assert.equal(kranj.country, 'Slovenia');
});

test('classifyRow keeps an Italian address Italian when country holds the birth country', () => {
  const result = classifyRow({
    city: 'Loiri Porto San Paolo', address: '', province: 'OT', region: 'SARDEGNA', country: 'Romania'
  });
  assert.deepEqual(result, { foreign: false, country: undefined, evidence: [] });
});

test('classifyRow leaves rows without an address alone', () => {
  assert.equal(classifyRow({ city: '', address: '', province: '', region: '', country: '' }).foreign, false);
  assert.equal(classifyRow({ city: '', address: '', province: '/', region: '', country: 'Italia' }).foreign, false);
});

test('classifyRow reports a foreign address it cannot place', () => {
  const result = classifyRow({ city: 'South Perk', address: 'Rrelagh Cres.31', province: 'ESTERO', region: '', country: 'Italia' });
  assert.equal(result.foreign, true);
  assert.equal(result.country, undefined);
});

const HEADER = ['id', 'fullName', 'address', 'postalCode', 'city', 'province', 'region', 'country', 'referenceSeat'];

function rowsOf(...records) {
  return [HEADER, ...records];
}

test('applyEstero writes region, country and seat on foreign rows', () => {
  const rows = rowsOf(['1', "D'epagnier Eric", 'Rte de cassonay 180', '1020', 'Svizzera', 'CH', 'ABRUZZO', 'Italia', 'Casa Regina della Pace']);
  const changes = applyEstero(rows);
  assert.deepEqual(rows[1].slice(6), ['ESTERO', 'Svizzera', 'Stella Azzurra']);
  assert.equal(changes.foreign.length, 1);
  assert.equal(changes.foreign[0].before.referenceSeat, 'Casa Regina della Pace');
  // province is left as the archive wrote it
  assert.equal(rows[1][5], 'CH');
});

test('applyEstero empties country when the country cannot be established', () => {
  const rows = rowsOf(['1', 'Woodbrooh Eva', 'Rrelagh Cres.31', '', 'South Perk', 'ESTERO', '', 'Italia', '']);
  applyEstero(rows);
  assert.deepEqual(rows[1].slice(6), ['ESTERO', '', 'Stella Azzurra']);
});

test('applyEstero normalizes country on Italian rows and skips unknown ones', () => {
  const rows = rowsOf(
    ['1', 'Zennaro Sergio', '', '34100', 'Trieste', 'TS', 'FRIULI-VENEZIA GIULIA', 'Italy', 'Stella Azzurra'],
    ['2', 'Rossi Mario', '', '', 'Roma', 'RM', 'LAZIO', '', 'Casa Regina della Pace'],
    ['3', 'Anclazen Anclazen', '', '', '', '', '', '', '']
  );
  const changes = applyEstero(rows);
  assert.equal(rows[1][7], 'Italia');
  assert.equal(rows[2][7], 'Italia');
  assert.deepEqual(rows[3].slice(6), ['', '', '']);
  assert.equal(changes.italian.length, 1);
  assert.equal(changes.italianFilled, 1);
  assert.equal(changes.untouched, 1);
});

test('hasEdits tells a first run from a re-run', () => {
  const rows = rowsOf(
    ['1', "D'epagnier Eric", 'Rte de cassonay 180', '1020', 'Svizzera', 'CH', 'ABRUZZO', 'Italia', 'Casa Regina della Pace'],
    ['2', 'Rossi Mario', '', '', 'Roma', 'RM', 'LAZIO', 'Italia', 'Casa Regina della Pace']
  );
  assert.equal(hasEdits(applyEstero(rows)), true);
  assert.equal(hasEdits(applyEstero(rows)), false);
});

test('applyEstero is idempotent', () => {
  const rows = rowsOf(
    ['1', "D'epagnier Eric", 'Rte de cassonay 180', '1020', 'Svizzera', 'CH', 'ABRUZZO', 'Italia', 'Casa Regina della Pace'],
    ['2', 'Bodhidharma Solar', '', '', '', 'ESTERO', '', 'Israele', ''],
    ['3', 'Rossi Mario', '', '', 'Roma', 'RM', 'LAZIO', '', 'Casa Regina della Pace']
  );
  applyEstero(rows);
  const first = JSON.stringify(rows);
  applyEstero(rows);
  assert.equal(JSON.stringify(rows), first);
});

test('CSV round-trips quoting and CRLF', () => {
  const raw = 'id,city\r\n1,"Ixelles, Bruxelles"\r\n2,Roma\r\n';
  const rows = parseCSV(raw);
  assert.deepEqual(rows, [['id', 'city'], ['1', 'Ixelles, Bruxelles'], ['2', 'Roma']]);
  assert.equal(serializeCSV(rows), raw);
});
