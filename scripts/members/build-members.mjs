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
 *   Codice Fiscale (CF) → email → normalized `surname|firstName|birthDate`.
 * Records that resolve to the same key are merged. COMPLETO wins on field
 * conflicts; the alternative is recorded in `conflicts` and the record is
 * flagged `needsReview`. Records that share an email or name+birthdate but
 * resolved to different ids are cross-linked via `possibleDuplicateIds` so they
 * can be merged from the admin UI. Certificates are attached to their member by
 * email then by name; unmatched ones become certificate-only members.
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
  if (record.email) return `email-${shortHash(record.email)}`;
  const nameKey = `${normName(record.surname)}|${normName(record.firstName)}|${record.birthDate ?? ''}`;
  return `name-${shortHash(nameKey)}`;
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

// Merge a group of raw records (one COMPLETO + zero or more importer rows) that
// share an identifier key into one member document. Conflicting fields are
// resolved automatically to the value carried by the most recently registered
// record; only ties (same date, or no dates) remain as manual conflicts.
export function mergeGroup(id, records) {
  const merged = { id };
  const sources = [];
  const conflicts = {};
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
    const newestDate = items[0].date;
    const newest = items.filter(item => item.date === newestDate);
    if (newestDate !== '' && newest.length === 1) {
      merged[field] = newest[0].value; // strictly most recent wins
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
    if (pool.length === 1) {
      merged[field] = pool[0].value; // tiebreaker decided
      tieResolved += 1;
    } else {
      merged[field] = items[0].value; // genuinely ambiguous → manual review
      conflicts[field] = items.map(item => item.value);
    }
  }

  merged.fullName = [merged.surname, merged.firstName].filter(Boolean).join(' ') || undefined;
  merged.sources = sources;
  merged.conflicts = conflicts;
  merged.reviewReasons = [];
  merged.possibleDuplicateIds = [];
  merged.autoResolved = autoResolved;
  merged.tieResolved = tieResolved;
  if (Object.keys(conflicts).length) merged.reviewReasons.push('field-conflict');
  if (records.length > 1 && records.every(r => r.source?.file === 'importer')) {
    merged.reviewReasons.push('duplicate-in-importer');
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export function buildMembers({ complete, importer, certificates }) {
  const allRecords = [...complete, ...importer];

  // Map each name+birthdate to its Codice Fiscale, so a record lacking a CF can
  // be folded into the CF twin of the same person. Skip ambiguous keys where two
  // different CFs share a name+birthdate (distinct people / data errors).
  const cfByNameDob = new Map();
  for (const record of allRecords) {
    if (!record.fiscalCode) continue;
    const key = nameDobKey(record);
    if (!key) continue;
    if (!cfByNameDob.has(key)) cfByNameDob.set(key, record.fiscalCode);
    else if (cfByNameDob.get(key) !== record.fiscalCode) cfByNameDob.set(key, null); // ambiguous
  }

  // Effective grouping key: CF when present; otherwise a matching CF found via
  // name+birthdate; otherwise the email/name fallback from keyFor.
  const effectiveKey = record => {
    if (record.fiscalCode) return record.fiscalCode;
    const key = nameDobKey(record);
    if (key) {
      const cf = cfByNameDob.get(key);
      if (cf) return cf;
    }
    return keyFor(record);
  };

  // Group rows by effective key. COMPLETO first so it wins precedence ties.
  const groups = new Map();
  for (const record of allRecords) {
    const key = effectiveKey(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }

  const members = [];
  const byId = new Map();
  for (const [key, records] of groups) {
    const member = mergeGroup(key, records);
    members.push(member);
    byId.set(member.id, member);
  }

  // Cross-key possible duplicates: same email or same name+dob, different id.
  const linkBy = keyFn => {
    const buckets = new Map();
    for (const member of members) {
      const k = keyFn(member);
      if (!k) continue;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(member.id);
    }
    for (const ids of buckets.values()) {
      if (ids.length < 2) continue;
      for (const id of ids) {
        const member = byId.get(id);
        for (const other of ids) {
          if (other !== id && !member.possibleDuplicateIds.includes(other)) {
            member.possibleDuplicateIds.push(other);
          }
        }
      }
    }
  };
  linkBy(m => (m.email ? `email:${normEmail(m.email)}` : null));
  linkBy(m => {
    const name = `${normName(m.surname)}|${normName(m.firstName)}`;
    return m.birthDate && name.trim() !== '|' ? `name:${name}|${m.birthDate}` : null;
  });
  for (const member of members) {
    if (member.possibleDuplicateIds.length) member.reviewReasons.push('possible-duplicate');
  }

  // Match certificates to set firstWorkDate (the only useful datum — every
  // certificate is a "Primo Lavoro" carrying just a date). Email match first,
  // then normalized name. The index is built from the RAW source rows (every
  // email/name variant a person ever had), so cert matching does not depend on
  // which value won conflict resolution. When several members share a contact,
  // prefer the canonical one (CF-keyed over email- or name-keyed).
  const idRank = id =>
    id.startsWith('email-') ? 1 : id.startsWith('name-') ? 2 : id.startsWith('cert-') ? 3 : 0;
  const setStronger = (map, key, id) => {
    if (!key) return;
    const existing = map.get(key);
    if (existing === undefined || idRank(id) < idRank(existing)) map.set(key, id);
  };
  const emailIndex = new Map();
  const nameIndex = new Map();
  for (const record of allRecords) {
    const id = effectiveKey(record);
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
    member.needsReview = member.reviewReasons.length > 0;
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
