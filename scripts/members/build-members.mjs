#!/usr/bin/env node
/**
 * Build a single, deduplicated `members` dataset from the three Excel exports
 * in `data/members/`:
 *
 *   - ELENCO COMPLETO SOCI CLOUD.xlsx          (the cloud's current registry)
 *   - ImporterAnagrafichePF compilato.xlsx     (a larger compiled import list)
 *   - ELENCO CERTIFICATI SOCI ISCRITTI NEL CLOUD.xlsx (Primo Lavoro certificates)
 *
 * Identifier strategy (confirmed with the user):
 *   Codice Fiscale (CF) → strong non-CF key from name/birthdate or email+name.
 * Records that resolve to the same key are merged. When distinct values exist,
 * the most recent entry wins automatically and older values are kept in
 * `superseeded`; only unresolved ties remain in `conflicts` and keep the record
 * flagged `needsReview`. A second pass then folds together cross-key records
 * that look like the same person: exact same name+birthdate, or small name
 * variants / middle-name additions when email or birthdate still line up.
 * Remaining same-email but clearly different-name pairs are kept separate and
 * flagged as `family-email` for manual review. Certificates are attached to
 * their member by email then by name; unmatched ones become certificate-only
 * members.
 *
 * Outputs (committed, reviewable artifacts):
 *   - data/members/members.normalized.json
 *   - data/members/members.report.md
 *
 * Usage:
 *   node scripts/members/build-members.mjs
 *
 * The transform functions are exported for unit testing.
 */

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(__dirname, '..', '..', 'data', 'members');

export const FILES = {
  complete: 'ELENCO COMPLETO SOCI CLOUD.xlsx',
  importer: 'ImporterAnagrafichePF compilato.xlsx',
  certificates: 'ELENCO CERTIFICATI SOCI ISCRITTI NEL CLOUD.xlsx'
};

// ---------------------------------------------------------------------------
// Normalization helpers (pure, exported for tests)
// ---------------------------------------------------------------------------

export function clean(value) {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return toISODate(value);
  const text = String(value).trim().replace(/\s+/g, ' ');
  return text.length ? text : undefined;
}

export function normCF(value) {
  if (value === null || value === undefined) return undefined;
  const text = String(value).replace(/\s+/g, '').toUpperCase();
  return text.length ? text : undefined;
}

export function normEmail(value) {
  if (value === null || value === undefined) return undefined;
  // A few cells hold two addresses separated by comma/semicolon — keep the first.
  const first = String(value).split(/[,;]/)[0].trim().toLowerCase();
  return /.+@.+\..+/.test(first) ? first : undefined;
}

export function removeAccents(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normName(value) {
  if (!value) return '';
  return removeAccents(String(value)).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

export function toISODate(value) {
  if (value === null || value === undefined || value === '') return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // SheetJS (cellDates) builds dates with the local-time constructor, so the
    // local components round-trip the Excel calendar date regardless of the
    // machine timezone. Reading UTC parts would shift by one day.
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return undefined;
}

export function extractEmail(value) {
  if (!value) return undefined;
  const match = String(value).match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return match ? match[0].toLowerCase() : undefined;
}

export function shortHash(value) {
  return createHash('sha1').update(value).digest('hex').slice(0, 16);
}

// Identifier strategy: CF → email → name|dob.
export function keyFor(record) {
  if (record.fiscalCode) return record.fiscalCode;
  const exactNameDob = nameDobKey(record);
  if (exactNameDob) return `name-${shortHash(exactNameDob)}`;
  const email = normEmail(record.email);
  const named = `${normName(record.surname)}|${normName(record.firstName)}`;
  if (email && named !== '|') return `email-${shortHash(`${email}|${named}`)}`;
  if (email) return `email-${shortHash(email)}`;
  return `name-${shortHash(`${named}|${record.birthDate ?? ''}`)}`;
}

// Strong identity key (surname + first name + birth date), used to fold a record
// that lacks a Codice Fiscale into the CF twin of the same person. Null when the
// name or birth date is missing (too weak to match on).
export function nameDobKey(record) {
  const surname = normName(record.surname);
  const firstName = normName(record.firstName);
  if (!record.birthDate || (!surname && !firstName)) return null;
  return `${surname}|${firstName}|${record.birthDate}`;
}

export function sameNameEmailKey(record) {
  const email = normEmail(record.email);
  const surname = normName(record.surname);
  const firstName = normName(record.firstName);
  if (!email || (!surname && !firstName)) return null;
  return `${surname}|${firstName}|${email}`;
}

function nameTokens(value) {
  const normalized = normName(value);
  return normalized ? normalized.split(' ').filter(Boolean) : [];
}

function typoLimit(a, b) {
  const maxLen = Math.max(a.length, b.length);
  return maxLen >= 8 ? 2 : 1;
}

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, index) => index);
  const next = new Array(b.length + 1);

  for (let i = 0; i < a.length; i += 1) {
    next[0] = i + 1;
    for (let j = 0; j < b.length; j += 1) {
      const cost = a[i] === b[j] ? 0 : 1;
      next[j + 1] = Math.min(
        next[j] + 1,
        prev[j + 1] + 1,
        prev[j] + cost
      );
    }
    for (let j = 0; j < prev.length; j += 1) prev[j] = next[j];
  }

  return prev[b.length];
}

function tokensMatchWithTypos(aTokens, bTokens) {
  return aTokens.length === bTokens.length
    && aTokens.every((token, index) => editDistance(token, bTokens[index]) <= typoLimit(token, bTokens[index]));
}

function tokensShareLeadingSequence(aTokens, bTokens) {
  if (aTokens.length === bTokens.length) return false;
  const shorter = aTokens.length < bTokens.length ? aTokens : bTokens;
  const longer = aTokens.length < bTokens.length ? bTokens : aTokens;
  return shorter.length > 0
    && shorter.every((token, index) => editDistance(token, longer[index]) <= typoLimit(token, longer[index]));
}

function similarNameField(a, b, { allowLeadingExtraTokens = false } = {}) {
  const normalizedA = normName(a);
  const normalizedB = normName(b);
  if (!normalizedA || !normalizedB) return false;
  if (normalizedA === normalizedB) return true;
  if (editDistance(normalizedA, normalizedB) <= typoLimit(normalizedA, normalizedB)) return true;

  const aTokens = nameTokens(a);
  const bTokens = nameTokens(b);
  if (tokensMatchWithTypos(aTokens, bTokens)) return true;
  return allowLeadingExtraTokens && tokensShareLeadingSequence(aTokens, bTokens);
}

function sameNormalizedName(record, candidate) {
  return normName(record.surname) === normName(candidate.surname)
    && normName(record.firstName) === normName(candidate.firstName);
}

function namesLikelySamePerson(record, candidate) {
  return similarNameField(record.surname, candidate.surname)
    && similarNameField(record.firstName, candidate.firstName, { allowLeadingExtraTokens: true });
}

function birthDateCompatible(record, candidate) {
  return !record.birthDate || !candidate.birthDate || record.birthDate === candidate.birthDate;
}

function canAutoMergeByEmail(record, candidate) {
  const recordEmail = normEmail(record.email);
  if (!recordEmail || recordEmail !== normEmail(candidate.email)) return false;
  if (sameNormalizedName(record, candidate)) return true;
  return birthDateCompatible(record, candidate) && namesLikelySamePerson(record, candidate);
}

function canAutoMergeByBirthDate(record, candidate) {
  return Boolean(record.birthDate)
    && record.birthDate === candidate.birthDate
    && namesLikelySamePerson(record, candidate);
}

const CLOUD_TYPO_TRUST_FIELDS = new Set(['surname', 'firstName', 'fiscalCode']);

function isTrustedCloudTypoVariant(field, trustedValue, candidateValue) {
  if (!trustedValue || !candidateValue) return false;
  if (field === 'surname') return similarNameField(trustedValue, candidateValue);
  if (field === 'firstName') return similarNameField(trustedValue, candidateValue);
  if (field === 'fiscalCode') {
    const trusted = normCF(trustedValue);
    const candidate = normCF(candidateValue);
    return Boolean(trusted)
      && Boolean(candidate)
      && trusted.length === candidate.length
      && editDistance(trusted, candidate) <= 2;
  }
  return false;
}

function preferredCompleteTypoItem(field, items) {
  if (!CLOUD_TYPO_TRUST_FIELDS.has(field)) return null;
  const completeItems = items.filter(item => item.fromComplete);
  if (completeItems.length !== 1) return null;
  const trusted = completeItems[0];
  const otherItems = items.filter(item => item !== trusted);
  if (!otherItems.length) return null;
  return otherItems.every(item => isTrustedCloudTypoVariant(field, trusted.value, item.value)) ? trusted : null;
}

// ---------------------------------------------------------------------------
// Sheet reading
// ---------------------------------------------------------------------------

export function readRows(file) {
  const workbook = XLSX.readFile(join(DATA_DIR, file), { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true, blankrows: false });
}

function columnIndex(headerRow) {
  const index = {};
  headerRow.forEach((header, i) => {
    const key = clean(header);
    if (key && !(key in index)) index[key] = i;
  });
  return index;
}

function pick(row, index, header) {
  const i = index[header];
  return i === undefined ? undefined : row[i];
}

// ---------------------------------------------------------------------------
// Per-file parsers → uniform raw member records
// ---------------------------------------------------------------------------

// COMPLETO: header at row 0, data from row 1. Mapped by header text.
export function parseComplete(rows) {
  const index = columnIndex(rows[0]);
  const get = (row, header) => clean(pick(row, index, header));
  const out = [];
  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    if (!row || row.every(cell => cell === '' || cell === null)) continue;
    out.push({
      source: { file: 'complete', code: get(row, 'Codice'), line: r + 1 },
      memberCode: get(row, 'Codice'),
      surname: get(row, 'Cognome'),
      firstName: get(row, 'Nome'),
      sex: get(row, 'Sesso'),
      fiscalCode: normCF(pick(row, index, 'Cod. Fiscale')),
      birthDate: toISODate(pick(row, index, 'Data di Nascita')),
      birthPlace: get(row, 'Città Nasc.'),
      birthProvince: get(row, 'Prov. Nasc'),
      birthCountry: get(row, 'Nazione Nasc.'),
      email: normEmail(pick(row, index, 'E-Mail')),
      email2: normEmail(pick(row, index, 'E-Mail 2')),
      phone: get(row, 'Telefono'),
      mobile: get(row, 'Cellulare'),
      address: get(row, 'Indirizzo'),
      postalCode: get(row, 'CAP'),
      city: get(row, 'Citta Resid.'),
      province: get(row, 'Provincia'),
      region: get(row, 'Regione'),
      country: get(row, 'Nazione'),
      memberStatus: get(row, 'Attivo'),
      group: get(row, 'Gruppo'),
      category: get(row, 'Categoria'),
      cardNumber: get(row, 'Tessera'),
      cardExpiry: toISODate(pick(row, index, 'Scad. Tessera Socio')),
      referenceSeat: get(row, 'Sede Riferimento'),
      originSociety: get(row, 'Società di Provenienza'),
      profession: get(row, 'Professione'),
      nationality: get(row, 'Nazionalità'),
      citizenship: get(row, 'Cittadinanza'),
      registrationRequestDate: toISODate(pick(row, index, 'Data Richi. Iscri.')),
      registrationDate: toISODate(pick(row, index, 'Data Iscrizione')),
      renewalDate: toISODate(pick(row, index, 'Data Rinnovo')),
      cancellationDate: toISODate(pick(row, index, 'Data Cancellaz.'))
    });
  }
  return out;
}

// IMPORTER: field codes at row 3 (PER_*), data from row 4. Mapped by code.
export function parseImporter(rows) {
  const index = columnIndex(rows[3]);
  const get = (row, code) => clean(pick(row, index, code));
  const out = [];
  for (let r = 4; r < rows.length; r += 1) {
    const row = rows[r];
    if (!row || row.every(cell => cell === '' || cell === null)) continue;
    const stato = get(row, 'PER_stato');
    out.push({
      source: { file: 'importer', code: get(row, 'PER_codper'), line: r + 1 },
      surname: get(row, 'PER_cognome'),
      firstName: get(row, 'PER_nome'),
      sex: get(row, 'PER_sesso'),
      fiscalCode: normCF(pick(row, index, 'PER_codfis')),
      birthDate: toISODate(pick(row, index, 'PER_datnas')),
      birthPlace: get(row, 'PER_citnas'),
      birthProvince: get(row, 'PER_prvnas'),
      birthCountry: get(row, 'PER_paenas'),
      email: normEmail(pick(row, index, 'PER_email')),
      email2: normEmail(pick(row, index, 'PER_email2')),
      phone: get(row, 'PER_telabi'),
      mobile: get(row, 'PER_cell'),
      address: get(row, 'PER_indir'),
      postalCode: get(row, 'PER_cap'),
      city: get(row, 'PER_citta'),
      province: get(row, 'PER_provin'),
      country: get(row, 'PER_NAZION'),
      memberStatus: stato === 'A' ? 'Attivo' : stato === 'N' ? 'Non attivo' : stato,
      group: get(row, 'PER_codgrp'),
      category: get(row, 'PER_categoria'),
      cardNumber: get(row, 'PER_tessera'),
      cardExpiry: toISODate(pick(row, index, 'PER_scadtessera')),
      originSociety: get(row, 'PER_socproven'),
      profession: get(row, 'PER_professione'),
      registrationRequestDate: toISODate(pick(row, index, 'PER_datarichiscr')),
      registrationDate: toISODate(pick(row, index, 'PER_datiscriz')),
      cancellationDate: toISODate(pick(row, index, 'PER_datacanc'))
    });
  }
  return out;
}

// CERTIFICATES: header at row 0, data from row 1.
export function parseCertificates(rows) {
  const index = columnIndex(rows[0]);
  const get = (row, header) => clean(pick(row, index, header));
  const out = [];
  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    if (!row || row.every(cell => cell === '' || cell === null)) continue;
    const contacts = get(row, 'Contatti');
    out.push({
      line: r + 1,
      code: get(row, 'Codice'),
      subject: get(row, 'Soggetto'),
      type: get(row, 'Tipo Cert./Diploma'),
      date: toISODate(pick(row, index, 'Data Diploma')),
      expiry: toISODate(pick(row, index, 'Scadenza')),
      note: get(row, 'Nota'),
      contacts,
      email: extractEmail(contacts),
      subjectKey: normName(get(row, 'Soggetto'))
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

// Fields merged across registries (excludes source/cert/meta bookkeeping).
const MERGE_FIELDS = [
  'memberCode', 'surname', 'firstName', 'sex', 'fiscalCode', 'birthDate',
  'birthPlace', 'birthProvince', 'birthCountry', 'email', 'email2', 'phone',
  'mobile', 'address', 'postalCode', 'city', 'province', 'region', 'country',
  'memberStatus', 'group', 'category', 'cardNumber', 'cardExpiry',
  'referenceSeat', 'originSociety', 'profession', 'nationality', 'citizenship',
  'registrationRequestDate', 'registrationDate', 'renewalDate', 'cancellationDate'
];

// Normalized comparison key so trivial case/spacing differences don't register
// as distinct values.
function normKey(field, value) {
  if (field === 'fiscalCode') return normCF(value);
  if (field === 'email' || field === 'email2') return normEmail(value);
  return normName(value);
}

function rememberSuperseeded(superseeded, field, winner, values) {
  const existing = superseeded[field] ?? [];
  for (const value of values) {
    if (normKey(field, value) === normKey(field, winner)) continue;
    if (existing.some(current => normKey(field, current) === normKey(field, value))) continue;
    existing.push(value);
  }
  if (existing.length) superseeded[field] = existing;
}

// Registration date used to decide which conflicting value is the most recent.
// COMPLETO uses "Data Iscrizione", the importer "PER_datiscriz" — both parsed
// into `registrationDate`. When that is missing, fall back to the registration
// request date ("Data Richi. Iscri." / "PER_datarichiscr"). Empty sorts oldest.
function recencyOf(record) {
  return record.registrationDate || record.registrationRequestDate || '';
}

function isBareNumber(value) {
  return /^\d+$/.test(String(value).trim());
}

function memberKeyRank(key) {
  if (key.startsWith('email-')) return 1;
  if (key.startsWith('name-')) return 2;
  if (key.startsWith('cert-')) return 3;
  return 0;
}

function chooseCanonicalKey(entries) {
  const byKey = new Map();
  for (const entry of entries) {
    const existing = byKey.get(entry.key);
    if (!existing || entry.date > existing.date) byKey.set(entry.key, { date: entry.date });
  }
  return [...byKey.entries()]
    .sort((a, b) => {
      const rankDiff = memberKeyRank(a[0]) - memberKeyRank(b[0]);
      if (rankDiff !== 0) return rankDiff;
      const dateDiff = a[1].date < b[1].date ? 1 : a[1].date > b[1].date ? -1 : 0;
      if (dateDiff !== 0) return dateDiff;
      return a[0].localeCompare(b[0]);
    })[0][0];
}

function makeUnionFind(keys) {
  const parent = new Map(keys.map(key => [key, key]));

  const find = key => {
    let current = key;
    while (parent.get(current) !== current) current = parent.get(current);
    let cursor = key;
    while (parent.get(cursor) !== current) {
      const next = parent.get(cursor);
      parent.set(cursor, current);
      cursor = next;
    }
    return current;
  };

  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  };

  return { find, union };
}

function connectBucketRecords(records, shouldMerge, union, keyOf) {
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      if (!shouldMerge(records[i], records[j])) continue;
      const leftKey = keyOf(records[i]);
      const rightKey = keyOf(records[j]);
      if (leftKey !== rightKey) union(leftKey, rightKey);
    }
  }
}

function resolveAliasedKey(aliasByKey, key) {
  let resolved = key;
  const seen = new Set([resolved]);
  while (aliasByKey.has(resolved)) {
    const next = aliasByKey.get(resolved);
    if (seen.has(next)) break;
    seen.add(next);
    resolved = next;
  }
  return resolved;
}

function needsAction(reviewReasons) {
  return reviewReasons.includes('field-conflict')
    || reviewReasons.includes('family-email')
    || reviewReasons.includes('possible-duplicate')
    || reviewReasons.includes('certificate-only');
}

// Merge a group of raw records (one COMPLETO + zero or more importer rows) that
// share an identifier key into one member document. Conflicting fields are
// resolved automatically to the value carried by the most recently registered
// record; auto-resolved losers are stored in `superseeded`, and only ties
// (same date, or no dates) remain as manual conflicts.
export function mergeGroup(id, records) {
  const merged = { id };
  const sources = [];
  const conflicts = {};
  const superseeded = {};
  let autoResolved = 0;
  let tieResolved = 0;

  // Per field: normalized value -> { value, date, fromComplete } keeping the
  // most recent date and whether COMPLETO (the cloud registry) carried it.
  const candidates = {};
  for (const record of records) {
    if (record.source) sources.push(record.source);
    const date = recencyOf(record);
    const fromComplete = record.source?.file === 'complete';
    for (const field of MERGE_FIELDS) {
      const value = record[field];
      if (value === undefined || value === '') continue;
      const key = normKey(field, value);
      if (!candidates[field]) candidates[field] = new Map();
      const existing = candidates[field].get(key);
      if (!existing) {
        candidates[field].set(key, { value, date, fromComplete });
      } else {
        if (date > existing.date) {
          existing.date = date;
          existing.value = value; // freshest representation of the same value
        }
        existing.fromComplete = existing.fromComplete || fromComplete;
      }
    }
  }

  for (const field of MERGE_FIELDS) {
    const map = candidates[field];
    if (!map) continue;
    const items = [...map.values()];
    if (items.length === 1) {
      merged[field] = items[0].value;
      continue;
    }
    items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const trustedComplete = preferredCompleteTypoItem(field, items);
    if (trustedComplete) {
      merged[field] = trustedComplete.value;
      rememberSuperseeded(superseeded, field, trustedComplete.value, items.map(item => item.value));
      tieResolved += 1;
      continue;
    }
    const newestDate = items[0].date;
    const newest = items.filter(item => item.date === newestDate);
    if (newestDate !== '' && newest.length === 1) {
      merged[field] = newest[0].value; // strictly most recent wins
      rememberSuperseeded(superseeded, field, newest[0].value, items.map(item => item.value));
      autoResolved += 1;
      continue;
    }
    // Tie (same newest date, or no dates): prefer COMPLETO; drop bare-numeric
    // junk (e.g. country "118") when a text value is also present.
    let pool = newest;
    if (pool.some(item => !isBareNumber(item.value))) {
      pool = pool.filter(item => !isBareNumber(item.value));
    }
    const cloudPool = pool.filter(item => item.fromComplete);
    if (cloudPool.length) pool = cloudPool;
    if (field === 'fiscalCode' && items.some(item => normCF(item.value) === id)) {
      merged[field] = id;
      rememberSuperseeded(superseeded, field, id, items.map(item => item.value));
      tieResolved += 1;
      continue;
    }
    if (pool.length === 1) {
      merged[field] = pool[0].value; // tiebreaker decided
      rememberSuperseeded(superseeded, field, pool[0].value, items.map(item => item.value));
      tieResolved += 1;
    } else {
      merged[field] = items[0].value; // genuinely ambiguous → manual review
      conflicts[field] = items.map(item => item.value);
    }
  }

  if (merged.fiscalCode && records.some(record => record.source?.file === 'complete' && normCF(record.fiscalCode) === normCF(merged.fiscalCode))) {
    merged.id = merged.fiscalCode;
  }
  merged.fullName = [merged.surname, merged.firstName].filter(Boolean).join(' ') || undefined;
  merged.sources = sources;
  merged.conflicts = conflicts;
  merged.superseeded = superseeded;
  merged.reviewReasons = [];
  merged.possibleDuplicateIds = [];
  merged.autoResolved = autoResolved;
  merged.tieResolved = tieResolved;
  if (Object.keys(conflicts).length) merged.reviewReasons.push('field-conflict');
  if (Object.keys(conflicts).length && records.length > 1 && records.every(r => r.source?.file === 'importer')) {
    merged.reviewReasons.push('duplicate-in-importer');
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export function buildMembers({ complete, importer, certificates }) {
  const allRecords = [...complete, ...importer];

  const effectiveKey = record => record.fiscalCode || keyFor(record);

  const rawKeyByRecord = new Map();
  const recordsByEffectiveKey = new Map();
  const nameDobGroups = new Map();
  const birthDateGroups = new Map();
  const emailGroups = new Map();
  for (const record of allRecords) {
    const key = effectiveKey(record);
    rawKeyByRecord.set(record, key);
    if (!recordsByEffectiveKey.has(key)) recordsByEffectiveKey.set(key, []);
    recordsByEffectiveKey.get(key).push(record);

    const exactNameDob = nameDobKey(record);
    if (exactNameDob) {
      if (!nameDobGroups.has(exactNameDob)) nameDobGroups.set(exactNameDob, []);
      nameDobGroups.get(exactNameDob).push(record);
    }

    if (record.birthDate) {
      if (!birthDateGroups.has(record.birthDate)) birthDateGroups.set(record.birthDate, []);
      birthDateGroups.get(record.birthDate).push(record);
    }

    const email = normEmail(record.email);
    if (email) {
      if (!emailGroups.has(email)) emailGroups.set(email, []);
      emailGroups.get(email).push(record);
    }
  }

  const unionFind = makeUnionFind(recordsByEffectiveKey.keys());
  const keyOf = record => rawKeyByRecord.get(record);
  for (const records of nameDobGroups.values()) {
    connectBucketRecords(records, () => true, unionFind.union, keyOf);
  }
  for (const records of birthDateGroups.values()) {
    connectBucketRecords(records, canAutoMergeByBirthDate, unionFind.union, keyOf);
  }
  for (const records of emailGroups.values()) {
    connectBucketRecords(records, canAutoMergeByEmail, unionFind.union, keyOf);
  }

  const componentEntries = new Map();
  for (const record of allRecords) {
    const key = rawKeyByRecord.get(record);
    const root = unionFind.find(key);
    if (!componentEntries.has(root)) componentEntries.set(root, []);
    componentEntries.get(root).push({ key, date: recencyOf(record) });
  }

  const aliasByKey = new Map();
  for (const entries of componentEntries.values()) {
    const uniqueKeys = [...new Set(entries.map(entry => entry.key))];
    if (uniqueKeys.length < 2) continue;
    const canonical = chooseCanonicalKey(entries);
    for (const key of uniqueKeys) {
      if (key !== canonical) aliasByKey.set(key, canonical);
    }
  }

  const groupedKeyFor = record => resolveAliasedKey(aliasByKey, rawKeyByRecord.get(record));

  // Group rows by effective key. COMPLETO first so it wins precedence ties.
  const groups = new Map();
  for (const record of allRecords) {
    const key = groupedKeyFor(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }

  const members = [];
  const byId = new Map();
  const memberIdByGroupKey = new Map();
  for (const [key, records] of groups) {
    const member = mergeGroup(key, records);
    members.push(member);
    byId.set(member.id, member);
    memberIdByGroupKey.set(key, member.id);
  }

  const duplicateReasonsById = new Map(members.map(member => [member.id, new Set()]));
  const linkPair = (leftId, rightId, reason) => {
    if (leftId === rightId) return;
    const left = byId.get(leftId);
    const right = byId.get(rightId);
    if (!left || !right) return;
    if (!left.possibleDuplicateIds.includes(rightId)) left.possibleDuplicateIds.push(rightId);
    if (!right.possibleDuplicateIds.includes(leftId)) right.possibleDuplicateIds.push(leftId);
    duplicateReasonsById.get(leftId).add(reason);
    duplicateReasonsById.get(rightId).add(reason);
  };

  const linkMembersBy = (keyFn, reasonFn) => {
    const buckets = new Map();
    for (const member of members) {
      const key = keyFn(member);
      if (!key) continue;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(member.id);
    }
    for (const ids of buckets.values()) {
      if (ids.length < 2) continue;
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
          const left = byId.get(ids[i]);
          const right = byId.get(ids[j]);
          if (!left || !right) continue;
          linkPair(left.id, right.id, reasonFn(left, right));
        }
      }
    }
  };

  linkMembersBy(
    member => (member.email ? `email:${normEmail(member.email)}` : null),
    (left, right) => (namesLikelySamePerson(left, right) ? 'possible-duplicate' : 'family-email')
  );
  linkMembersBy(
    member => {
      const name = `${normName(member.surname)}|${normName(member.firstName)}`;
      return member.birthDate && name.trim() !== '|' ? `name:${name}|${member.birthDate}` : null;
    },
    () => 'possible-duplicate'
  );
  for (const member of members) {
    const reasons = duplicateReasonsById.get(member.id);
    if (!reasons) continue;
    if (reasons.has('family-email')) member.reviewReasons.push('family-email');
    if (reasons.has('possible-duplicate')) member.reviewReasons.push('possible-duplicate');
  }

  // Match certificates to set firstWorkDate (the only useful datum — every
  // certificate is a "Primo Lavoro" carrying just a date). Email match first,
  // then normalized name. The index is built from the RAW source rows (every
  // email/name variant a person ever had), so cert matching does not depend on
  // which value won conflict resolution. When several members share a contact,
  // prefer the canonical one (CF-keyed over email- or name-keyed).
  const setStronger = (map, key, id) => {
    if (!key) return;
    const existing = map.get(key);
    if (existing === undefined || memberKeyRank(id) < memberKeyRank(existing)) map.set(key, id);
  };
  const emailIndex = new Map();
  const nameIndex = new Map();
  for (const record of allRecords) {
    const id = memberIdByGroupKey.get(groupedKeyFor(record));
    setStronger(emailIndex, normEmail(record.email), id);
    setStronger(emailIndex, normEmail(record.email2), id);
    setStronger(nameIndex, `${normName(record.surname)} ${normName(record.firstName)}`.trim(), id);
  }
  const certStats = { matchedByEmail: 0, matchedByName: 0, unmatched: 0 };
  // memberId -> certificates matched to it (to report people with more than one).
  const certsByMember = new Map();
  for (const cert of certificates) {
    let member = cert.email ? byId.get(emailIndex.get(cert.email)) : undefined;
    if (member) {
      certStats.matchedByEmail += 1;
    } else if (cert.subjectKey) {
      member = byId.get(nameIndex.get(cert.subjectKey));
      if (member) certStats.matchedByName += 1;
    }
    if (member) {
      if (!certsByMember.has(member.id)) certsByMember.set(member.id, []);
      certsByMember.get(member.id).push({ date: cert.date, code: cert.code });
      if (cert.date && (!member.firstWorkDate || cert.date < member.firstWorkDate)) {
        member.firstWorkDate = cert.date;
      }
    } else {
      certStats.unmatched += 1;
      const [surname, ...rest] = (cert.subject ?? '').split(' ');
      const orphan = {
        id: `cert-${shortHash((cert.email ?? '') + (cert.subject ?? '') + cert.code)}`,
        surname,
        firstName: rest.join(' ') || undefined,
        fullName: cert.subject,
        email: cert.email,
        firstWorkDate: cert.date,
        sources: [{ file: 'certificates', code: cert.code, line: cert.line }],
        conflicts: {},
        superseeded: {},
        reviewReasons: ['certificate-only'],
        possibleDuplicateIds: []
      };
      members.push(orphan);
    }
  }

  // People who matched more than one certificate (kept firstWorkDate = earliest).
  const duplicateCertificates = [];
  for (const [id, certs] of certsByMember) {
    if (certs.length < 2) continue;
    const member = byId.get(id);
    duplicateCertificates.push({
      id,
      name: member ? member.fullName ?? id : id,
      firstWorkDate: member?.firstWorkDate,
      certificates: certs.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    });
  }

  let autoResolved = 0;
  let tieResolved = 0;
  for (const member of members) {
    member.needsReview = needsAction(member.reviewReasons);
    autoResolved += member.autoResolved ?? 0;
    tieResolved += member.tieResolved ?? 0;
    delete member.autoResolved; // transient stats, not persisted
    delete member.tieResolved;
  }

  members.sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? '', 'it'));
  return { members, certStats, duplicateCertificates, autoResolved, tieResolved };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export function buildReport(members, certStats, counts, duplicateCertificates = [], autoResolved = 0, tieResolved = 0) {
  const byKeyType = { cf: 0, email: 0, name: 0, cert: 0 };
  const bySource = { complete: 0, importer: 0, certificates: 0 };
  const reasonHist = {};
  const conflictFields = {};
  let needsReview = 0;
  let withFirstWorkDate = 0;
  for (const member of members) {
    if (member.id.startsWith('email-')) byKeyType.email += 1;
    else if (member.id.startsWith('name-')) byKeyType.name += 1;
    else if (member.id.startsWith('cert-')) byKeyType.cert += 1;
    else byKeyType.cf += 1;
    for (const source of member.sources ?? []) bySource[source.file] += 1;
    if (member.firstWorkDate) withFirstWorkDate += 1;
    for (const reason of member.reviewReasons ?? []) reasonHist[reason] = (reasonHist[reason] ?? 0) + 1;
    for (const field of Object.keys(member.conflicts ?? {})) conflictFields[field] = (conflictFields[field] ?? 0) + 1;
    if (member.needsReview) needsReview += 1;
  }

  const lines = [];
  lines.push('# Members build report', '');
  lines.push(`Generated: ${new Date().toISOString()}`, '');
  lines.push('## Source rows', '');
  lines.push(`- COMPLETO: ${counts.complete} rows`);
  lines.push(`- Importer: ${counts.importer} rows`);
  lines.push(`- Certificates: ${counts.certificates} rows`, '');
  lines.push('## Unified members', '');
  lines.push(`- **Total: ${members.length}**`);
  lines.push(`- Keyed by Codice Fiscale: ${byKeyType.cf}`);
  lines.push(`- Keyed by email (no CF): ${byKeyType.email}`);
  lines.push(`- Keyed by name+birthdate (no CF/email): ${byKeyType.name}`);
  lines.push(`- Certificate-only (unmatched): ${byKeyType.cert}`, '');
  lines.push('## Source contribution (after merge)', '');
  lines.push(`- Records carrying a COMPLETO row: ${bySource.complete}`);
  lines.push(`- Records carrying an Importer row: ${bySource.importer}`);
  lines.push(`- Members with a firstWorkDate (from a certificate): ${withFirstWorkDate}`, '');
  lines.push('## Conflict resolution', '');
  lines.push(`- Auto-resolved by recency (most recent registration wins): ${autoResolved}`);
  lines.push(`- Resolved on ties (prefer cloud, drop bare-numeric junk): ${tieResolved}`);
  lines.push('');
  lines.push('## Needs review', '');
  lines.push(`- **Flagged: ${needsReview}** of ${members.length}`);
  for (const [reason, count] of Object.entries(reasonHist).sort((a, b) => b[1] - a[1])) {
    lines.push(`  - ${reason}: ${count}`);
  }
  lines.push('', '## Remaining field conflicts (date tie / no date — left for manual review)', '');
  const conflictRows = Object.entries(conflictFields).sort((a, b) => b[1] - a[1]);
  if (conflictRows.length === 0) lines.push('- none');
  for (const [field, count] of conflictRows) lines.push(`- ${field}: ${count}`);
  lines.push('', '## Certificates', '');
  lines.push('Only the earliest certificate date is kept, as `firstWorkDate` (every certificate is a "Primo Lavoro" carrying just a date).');
  lines.push('');
  lines.push(`- Matched by email: ${certStats.matchedByEmail}`);
  lines.push(`- Matched by name: ${certStats.matchedByName}`);
  lines.push(`- Unmatched (became certificate-only members): ${certStats.unmatched}`, '');

  lines.push(`### Members with more than one certificate (${duplicateCertificates.length})`, '');
  if (duplicateCertificates.length === 0) {
    lines.push('- none');
  } else {
    lines.push('`firstWorkDate` keeps the earliest; the later one(s) are likely source duplicates of the same "Primo Lavoro".', '');
    for (const entry of duplicateCertificates) {
      const certs = entry.certificates.map(c => `${c.date ?? 'sem data'} (#${c.code ?? '?'})`).join(', ');
      lines.push(`- **${entry.name}** (${entry.id}) — firstWorkDate \`${entry.firstWorkDate ?? '?'}\` · certificates: ${certs}`);
    }
  }
  lines.push('');

  // A few concrete conflict examples to eyeball.
  const examples = members.filter(m => Object.keys(m.conflicts ?? {}).length).slice(0, 12);
  if (examples.length) {
    lines.push('## Sample conflicts', '');
    for (const member of examples) {
      const fields = Object.entries(member.conflicts)
        .map(([field, values]) => `${field}=[${values.join(' | ')}]`)
        .join('; ');
      lines.push(`- **${member.fullName ?? member.id}** (${member.id}): ${fields}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const completeRows = readRows(FILES.complete);
  const importerRows = readRows(FILES.importer);
  const certificateRows = readRows(FILES.certificates);

  const complete = parseComplete(completeRows);
  const importer = parseImporter(importerRows);
  const certificates = parseCertificates(certificateRows);

  const { members, certStats, duplicateCertificates, autoResolved, tieResolved } = buildMembers({ complete, importer, certificates });

  const reportOnly = process.argv.includes('--report-only');
  const dryRun = process.argv.includes('--dry-run');
  const jsonPath = join(DATA_DIR, 'members.normalized.json');
  const reportPath = join(DATA_DIR, 'members.report.md');
  const report = buildReport(
    members,
    certStats,
    { complete: complete.length, importer: importer.length, certificates: certificates.length },
    duplicateCertificates,
    autoResolved,
    tieResolved
  );
  if (dryRun) {
    console.log(`Members: ${members.length} · auto-resolved: ${autoResolved} · tie-resolved: ${tieResolved} · flagged needsReview: ${members.filter(m => m.needsReview).length}`);
    console.log('Dry run — no files written.');
    return;
  }
  if (!reportOnly) writeFileSync(jsonPath, `${JSON.stringify(members, null, 2)}\n`);
  writeFileSync(reportPath, report);

  console.log(`Parsed: ${complete.length} complete, ${importer.length} importer, ${certificates.length} certificates`);
  if (reportOnly) {
    console.log(`Report-only: left ${jsonPath} untouched`);
  } else {
    console.log(`Wrote ${members.length} members → ${jsonPath}`);
  }
  console.log(`Wrote report → ${reportPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
