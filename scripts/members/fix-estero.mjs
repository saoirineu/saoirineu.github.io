#!/usr/bin/env node
/**
 * Second pass over `data/members/soci-2026-06-12-completo.csv`: the rows whose
 * address is outside Italy.
 *
 * The first pass (which filled R province, S region and AA referenceSeat from
 * the ISTAT comuni list) treated a row as foreign only when the archive said so
 * — `province` = ESTERO/EE, or a foreign name in the `country` column — and
 * then left R/S/AA untouched. That missed the rows where the archive wrote an
 * ISO country code in `province`: `CH` is Switzerland for the person who filled
 * the form and Chieti for the ISTAT table, so five Swiss addresses came out as
 * ABRUZZO / Casa Regina della Pace. The `country` column was never touched at
 * all, so those same rows kept the archive's default `Italia`.
 *
 * This pass fixes both and writes the three columns the foreign rows need:
 *
 *   S region        -> ESTERO
 *   T country       -> the country of the address, in Italian, when it can be
 *                      established; emptied when it cannot (the archive's
 *                      `Italia` on a foreign address is noise, not data)
 *   AA referenceSeat-> Stella Azzurra
 *
 * Rows with an Italian address get `country` = Italia (this also normalizes
 * `Italy`/`ITA` and clears junk such as `118`). Rows with no usable address at
 * all are left untouched — unknown is not the same as foreign.
 *
 * R province is deliberately NOT touched: it still carries the archive's own
 * value (ESTERO, EE, or the ISO code that caused the bug).
 *
 * Outputs (committed, reviewable artifacts):
 *   - data/members/soci-2026-06-12-completo.csv (rewritten in place)
 *   - data/members/soci-2026-06-12-completo.estero.report.md
 *
 * Usage:
 *   node scripts/members/fix-estero.mjs [--dry-run]
 *
 * The transform functions are exported for unit testing. Re-running the script
 * on its own output is a no-op.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(__dirname, '..', '..', 'data', 'members');
export const CSV_FILE = join(DATA_DIR, 'soci-2026-06-12-completo.csv');
export const REPORT_FILE = join(DATA_DIR, 'soci-2026-06-12-completo.estero.report.md');

export const REGION_ESTERO = 'ESTERO';
export const SEAT_ESTERO = 'Stella Azzurra';
export const COUNTRY_ITALIA = 'Italia';

export const ITALIAN_REGIONS = new Set([
  'ABRUZZO', 'BASILICATA', 'CALABRIA', 'CAMPANIA', 'EMILIA-ROMAGNA',
  'FRIULI-VENEZIA GIULIA', 'LAZIO', 'LIGURIA', 'LOMBARDIA', 'MARCHE', 'MOLISE',
  'PIEMONTE', 'PUGLIA', 'SARDEGNA', 'SICILIA', 'TOSCANA', 'TRENTINO-ALTO ADIGE',
  'UMBRIA', "VALLE D'AOSTA", 'VENETO'
]);

// The archive's own markers for "lives abroad".
export const FOREIGN_PROVINCE_MARKERS = new Set(['ESTERO', 'EE']);

// ---------------------------------------------------------------------------
// Country vocabulary
// ---------------------------------------------------------------------------

/**
 * Every spelling of a country found in the archive (Italian, English, native,
 * misspelled) mapped to the Italian name we write. Keys are normalized text.
 * Sovereign states only: `Inghilterra` becomes Regno Unito, `Olanda` becomes
 * Paesi Bassi.
 */
export const COUNTRY_ALIASES = new Map([
  ['italia', 'Italia'], ['italy', 'Italia'], ['ita', 'Italia'],
  ['svizzera', 'Svizzera'], ['suica', 'Svizzera'], ['suisse', 'Svizzera'],
  ['switzerland', 'Svizzera'], ['schweiz', 'Svizzera'],
  ['francia', 'Francia'], ['france', 'Francia'],
  ['germania', 'Germania'], ['germany', 'Germania'], ['deutschland', 'Germania'],
  ['austria', 'Austria'], ['osterreich', 'Austria'],
  ['spagna', 'Spagna'], ['spain', 'Spagna'], ['espana', 'Spagna'],
  ['portogallo', 'Portogallo'], ['portugal', 'Portogallo'],
  ['belgio', 'Belgio'], ['belgium', 'Belgio'], ['belgique', 'Belgio'],
  ['olanda', 'Paesi Bassi'], ['paesi bassi', 'Paesi Bassi'],
  ['netherlands', 'Paesi Bassi'], ['holland', 'Paesi Bassi'],
  ['lussemburgo', 'Lussemburgo'], ['luxembourg', 'Lussemburgo'],
  ['regno unito', 'Regno Unito'], ['united kingdom', 'Regno Unito'],
  ['inghilterra', 'Regno Unito'], ['england', 'Regno Unito'], ['uk', 'Regno Unito'],
  ['gran bretagna', 'Regno Unito'], ['gran bretagna e irlanda del nord', 'Regno Unito'],
  ['irlanda', 'Irlanda'], ['ireland', 'Irlanda'],
  ['slovenia', 'Slovenia'], ['slovenija', 'Slovenia'],
  ['slovacchia', 'Slovacchia'], ['slovakia', 'Slovacchia'],
  ['croazia', 'Croazia'], ['croatia', 'Croazia'], ['hrvatska', 'Croazia'],
  ['romania', 'Romania'],
  ['bulgaria', 'Bulgaria'],
  ['grecia', 'Grecia'], ['greece', 'Grecia'],
  ['svezia', 'Svezia'], ['sweden', 'Svezia'],
  ['estonia', 'Estonia'],
  ['israele', 'Israele'], ['israel', 'Israele'],
  ['giappone', 'Giappone'], ['japan', 'Giappone'],
  ['canada', 'Canada'],
  ['stati uniti', 'Stati Uniti'], ['united states', 'Stati Uniti'], ['usa', 'Stati Uniti'],
  ['messico', 'Messico'], ['mexico', 'Messico'],
  ['panama', 'Panama'],
  ['colombia', 'Colombia'],
  ['brasile', 'Brasile'], ['brasil', 'Brasile'], ['brazil', 'Brasile'],
  ['san marino', 'San Marino']
]);

/**
 * Country names that appear inside the `city` field ("Bellinzona Suiça",
 * "Londrina Pr Brasile", "SVIZZERA"). Longest first so "gran bretagna e
 * irlanda del nord" wins over "irlanda".
 */
export const COUNTRY_WORDS = [...COUNTRY_ALIASES.keys()]
  .filter((word) => word !== 'italia' && word !== 'italy' && word !== 'ita')
  .sort((a, b) => b.length - a.length);

/**
 * Foreign localities the archive wrote without any country marker. Curated by
 * hand from the 1.872 rows: each key is a `city` value that no Italian comune
 * carries. Also used to resolve the country of rows the archive had already
 * flagged as ESTERO/EE but left without a usable `country`.
 */
export const FOREIGN_CITIES = new Map([
  ['chur', 'Svizzera'],
  ['insone', 'Svizzera'],
  ['espendes', 'Svizzera'],
  ['coppet', 'Svizzera'],
  ['mergoscia', 'Svizzera'],
  ['bellinzona', 'Svizzera'],
  ['castaneda', 'Svizzera'],
  ['garaverio figino', 'Svizzera'],
  ['baden ch', 'Svizzera'],
  ['zurigo', 'Svizzera'],
  ['alicante', 'Spagna'],
  ['ibiza', 'Spagna'],
  ['cuellar', 'Spagna'],
  ['lemoa bizkaia', 'Spagna'],
  ['centelles', 'Spagna'],
  ['sant cugat del valles', 'Spagna'],
  ['madrid', 'Spagna'],
  ['maisons alfort valle della marna', 'Francia'],
  ['toulose', 'Francia'],
  ['lambersart', 'Francia'],
  ['blessington', 'Irlanda'],
  ['ieici', 'Croazia'],
  ['novi vinodolski', 'Croazia'],
  ['osijek', 'Croazia'],
  ['koper', 'Slovenia'],
  ['nova gorica', 'Slovenia'],
  ['miren', 'Slovenia'],
  ['dobrovo v brdih', 'Slovenia'],
  ['skofja loka', 'Slovenia'],
  ['ljubljana', 'Slovenia'],
  ['4000 kranj', 'Slovenia'],
  ['uppsala', 'Svezia'],
  ['holzgau', 'Austria'],
  ['salzburg', 'Austria'],
  ['weinzberg', 'Germania'],
  ['reichenbach vogtl', 'Germania'],
  ['slejerberg', 'Germania'],
  ['diessen', 'Germania'],
  ['luxembourg', 'Lussemburgo'],
  ['chiajna', 'Romania'],
  ['bucarest', 'Romania'],
  ['belo horizonte', 'Brasile'],
  ['cambridge', 'Regno Unito'],
  ['oxford', 'Regno Unito'],
  ['londra', 'Regno Unito'],
  ['bristol', 'Regno Unito'],
  ['bakewell', 'Regno Unito'],
  ['plovdiv', 'Bulgaria'],
  ['preveza', 'Grecia'],
  ['gibsons', 'Canada'],
  ['murata', 'San Marino'],
  // The state disappeared in 1993; every member the archive files under it is
  // Slovak (birthplace and nationality agree), so Slovacchia it is.
  ['cecoslovacchia', 'Slovacchia']
]);

/** Rows whose resolution deserves a line in the report. */
export const NOTES = new Map([
  ['name-6f2841a18113af20', "l'archivio segna Spagna, ma l'indirizzo (Route Blagnac, «Toulose») è a Tolosa"],
  ['name-707c20b84711f75e', 'CAP 1200-172 in formato portoghese (Lisbona); tenuto il Brasile in archivio'],
  ['name-d6d5125410b7ac1b', 'CAP 1200-172 in formato portoghese (Lisbona); tenuto il Brasile in archivio'],
  ['name-ebe63a49a9dcbf80', 'città «CECOSLOVACCHIA»: risolta in Slovacchia (nazionalità slovacca)'],
  ['name-a88616c8cfed3d51', 'città «Florida» ma CAP 80504 (Colorado): paese sicuro, località no'],
  ['name-8a41cf4aa39eb1d0', 'città «South Perk» non identificabile: paese lasciato vuoto']
]);

// ---------------------------------------------------------------------------
// Normalization helpers (pure, exported for tests)
// ---------------------------------------------------------------------------

export function normText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Maps any spelling of a country to its Italian name, or undefined. */
export function normalizeCountry(value) {
  return COUNTRY_ALIASES.get(normText(value));
}

/** The country named inside a free-text field, or undefined. */
export function countryInText(value) {
  const text = normText(value);
  if (!text) return undefined;
  const words = ` ${text} `;
  for (const word of COUNTRY_WORDS) {
    if (words.includes(` ${word} `)) return COUNTRY_ALIASES.get(word);
  }
  return undefined;
}

export function hasItalianRegion(region) {
  return ITALIAN_REGIONS.has(String(region ?? '').trim().toUpperCase());
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * Decides whether a row's address is outside Italy and, if so, in which
 * country. Returns `{ foreign, country, evidence }`; `country` is undefined
 * when the address is foreign but the country cannot be established.
 */
export function classifyRow(row) {
  const province = String(row.province ?? '').trim().toUpperCase();
  const region = String(row.region ?? '').trim().toUpperCase();
  const cityCountry = countryInText(row.city);
  const curatedCountry = FOREIGN_CITIES.get(normText(row.city));
  const fieldCountry = normalizeCountry(row.country);
  const fieldIsForeign = Boolean(fieldCountry) && fieldCountry !== COUNTRY_ITALIA;

  const evidence = [];
  if (FOREIGN_PROVINCE_MARKERS.has(province)) evidence.push(`province «${province}» in archivio`);
  if (region === REGION_ESTERO) evidence.push('region già ESTERO');
  if (cityCountry) evidence.push(`«${String(row.city).trim()}» nomina ${cityCountry}`);
  if (!cityCountry && curatedCountry) evidence.push(`«${String(row.city).trim()}» è in ${curatedCountry}`);
  // The `country` column is the weakest signal — it holds birth country or
  // citizenship as often as residence — so it only counts when nothing else
  // places the address in an Italian region.
  if (fieldIsForeign && !hasItalianRegion(region)) evidence.push(`colonna country «${String(row.country).trim()}»`);

  if (!evidence.length) return { foreign: false, country: undefined, evidence: [] };
  return {
    foreign: true,
    country: cityCountry || curatedCountry || (fieldIsForeign ? fieldCountry : undefined),
    evidence
  };
}

// ---------------------------------------------------------------------------
// CSV (RFC 4180, CRLF, quoted only where needed — matches the input file)
// ---------------------------------------------------------------------------

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (char !== '\r') field += char;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function serializeCSV(rows) {
  const escape = (value) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  return `${rows.map((row) => row.map(escape).join(',')).join('\r\n')}\r\n`;
}

// ---------------------------------------------------------------------------
// The pass
// ---------------------------------------------------------------------------

/**
 * Applies the rules to a parsed CSV (header + rows) in place and returns the
 * change log used to build the report.
 */
export function applyEstero(rows) {
  const header = rows[0];
  const col = Object.fromEntries(header.map((name, index) => [name, index]));
  const changes = { foreign: [], italian: [], italianFilled: 0, untouched: 0 };

  for (const row of rows.slice(1)) {
    if (row.length < header.length) continue;
    const read = (name) => row[col[name]] ?? '';
    const { foreign, country, evidence } = classifyRow({
      city: read('city'),
      address: read('address'),
      province: read('province'),
      region: read('region'),
      country: read('country')
    });

    const before = {
      region: read('region'),
      country: read('country'),
      referenceSeat: read('referenceSeat')
    };

    if (foreign) {
      row[col.region] = REGION_ESTERO;
      row[col.country] = country ?? '';
      row[col.referenceSeat] = SEAT_ESTERO;
      changes.foreign.push({
        id: read('id'),
        name: read('fullName'),
        city: read('city'),
        postalCode: read('postalCode'),
        province: read('province'),
        country: country ?? '',
        before,
        evidence,
        note: NOTES.get(read('id'))
      });
    } else if (hasItalianRegion(before.region)) {
      if (before.country !== COUNTRY_ITALIA) {
        row[col.country] = COUNTRY_ITALIA;
        if (before.country.trim()) {
          changes.italian.push({
            id: read('id'),
            name: read('fullName'),
            city: read('city'),
            region: before.region,
            before: before.country
          });
        } else changes.italianFilled += 1;
      }
    } else {
      changes.untouched += 1;
    }
  }
  return changes;
}

function righe(count) {
  return `${count} rig${count === 1 ? 'a' : 'he'}`;
}

function table(headers, lines) {
  return [
    `| ${headers.join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...lines
  ].join('\n');
}

export function buildReport(changes, today) {
  const byCountry = new Map();
  for (const row of changes.foreign) {
    const key = row.country || '(non determinato)';
    byCountry.set(key, (byCountry.get(key) ?? 0) + 1);
  }
  const seatReplaced = changes.foreign.filter((r) => r.before.referenceSeat && r.before.referenceSeat !== SEAT_ESTERO);
  const regionReplaced = changes.foreign.filter((r) => r.before.region && r.before.region !== REGION_ESTERO);
  const noCountry = changes.foreign.filter((r) => !r.country);
  const cell = (value) => String(value ?? '').replace(/\|/g, '\\|');

  return `# soci-2026-06-12-completo.csv — righe estere

Generato il ${today} da \`scripts/members/fix-estero.mjs\`, seconda passata sul
file prodotto il 2026-07-28 (vedi \`soci-2026-06-12-completo.report.md\`).

Per ogni riga il cui **indirizzo** è fuori dall'Italia:

| colonna | valore |
|---|---|
| S region | \`ESTERO\` |
| T country | il paese dell'indirizzo, in italiano, quando ricavabile |
| AA referenceSeat | \`Stella Azzurra\` |

Le righe con indirizzo italiano ricevono \`Italia\` in **T country**. Le righe
senza alcun indirizzo utilizzabile non vengono toccate: *ignoto* non è
*estero*. La colonna **R province** non viene modificata: conserva il valore
dell'archivio (\`ESTERO\`, \`EE\`, o la sigla che ha causato l'errore).

## Perché la passata precedente sbagliava

L'archivio scrive in \`province\` tanto la sigla italiana quanto il codice ISO
del paese. **CH** è la Svizzera per chi ha compilato il modulo e Chieti per la
tabella ISTAT: le cinque righe svizzere con \`province\` = CH sono così
diventate ABRUZZO / Casa Regina della Pace. La colonna \`country\` non veniva
scritta affatto, quindi quelle righe conservavano l'\`Italia\` di default
dell'archivio.

## Riepilogo

- righe con indirizzo estero: **${changes.foreign.length}**
- di cui con paese determinato: **${changes.foreign.length - noCountry.length}**
- \`region\` italiana sovrascritta con ESTERO: **${regionReplaced.length}**
- \`referenceSeat\` sostituita con Stella Azzurra: **${seatReplaced.length}**
- \`country\` corretta su righe italiane (valore sbagliato): **${changes.italian.length}**
- \`country\` compilata su righe italiane (era vuota): **${changes.italianFilled}**
- righe lasciate invariate (nessun indirizzo utilizzabile): **${changes.untouched}**

### Paesi

${table(['paese', 'righe'], [...byCountry].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([country, count]) => `| ${country} | ${count} |`))}

### Righe estere — ${righe(changes.foreign.length)}

${table(['id', 'nome', 'city', 'CAP', 'province', 'paese', 'prima (S/T/AA)', 'prova'],
    changes.foreign
      .slice()
      .sort((a, b) => (a.country || 'zz').localeCompare(b.country || 'zz') || a.name.localeCompare(b.name))
      .map((r) => `| ${cell(r.id)} | ${cell(r.name)} | ${cell(r.city)} | ${cell(r.postalCode)} | ${cell(r.province)} | ${cell(r.country) || '—'} | ${cell(r.before.region) || '—'} / ${cell(r.before.country) || '—'} / ${cell(r.before.referenceSeat) || '—'} | ${cell(r.evidence.join('; '))}${r.note ? `. ${cell(r.note)}` : ''} |`))}

### Sedi sostituite — ${righe(seatReplaced.length)}

La regola «indirizzo estero → Stella Azzurra» è stata applicata anche alle
righe che avevano già una sede in archivio. Se una di queste assegnazioni va
conservata, va ripristinata a mano.

${seatReplaced.length
    ? table(['id', 'nome', 'paese', 'sede precedente'],
      seatReplaced.map((r) => `| ${cell(r.id)} | ${cell(r.name)} | ${cell(r.country) || '—'} | ${cell(r.before.referenceSeat)} |`))
    : '_Nessuna._'}

### Paese non determinato — ${righe(noCountry.length)}

Indirizzo estero accertato, paese no: la colonna \`country\` è stata svuotata
(l'\`Italia\` che c'era prima era il default dell'archivio, non un dato).

${noCountry.length
    ? table(['id', 'nome', 'city', 'CAP', 'prova'],
      noCountry.map((r) => `| ${cell(r.id)} | ${cell(r.name)} | ${cell(r.city)} | ${cell(r.postalCode)} | ${cell(r.evidence.join('; '))}${r.note ? `. ${cell(r.note)}` : ''} |`))
    : '_Nessuna._'}

### country corretta su righe italiane — ${righe(changes.italian.length)}

Righe con indirizzo italiano il cui \`country\` diceva altro (spesso il paese di
nascita o la cittadinanza, o rumore).

${changes.italian.length
    ? table(['id', 'nome', 'city', 'regione', 'prima'],
      changes.italian.map((r) => `| ${cell(r.id)} | ${cell(r.name)} | ${cell(r.city)} | ${cell(r.region)} | ${cell(r.before)} |`))
    : '_Nessuna._'}

Altre **${changes.italianFilled}** righe italiane avevano \`country\` vuota o
scritta in altro modo (\`Italy\`, \`ITA\`, \`italia\`) e ora dicono \`Italia\`.
`;
}

/** True when the pass actually rewrote a cell (false on a re-run). */
export function hasEdits(changes) {
  return changes.italian.length > 0 || changes.italianFilled > 0 || changes.foreign.some(
    (r) => r.before.region !== REGION_ESTERO
      || r.before.country !== (r.country ?? '')
      || r.before.referenceSeat !== SEAT_ESTERO
  );
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const rows = parseCSV(readFileSync(CSV_FILE, 'utf8'));
  const changes = applyEstero(rows);
  const today = new Date().toISOString().slice(0, 10);
  const edited = hasEdits(changes);

  if (!dryRun) {
    writeFileSync(CSV_FILE, serializeCSV(rows));
    // On a re-run every "prima" equals the value already in the file, so the
    // report would lose the record of what the pass changed. Keep the old one.
    if (edited) writeFileSync(REPORT_FILE, buildReport(changes, today));
  }
  const withCountry = changes.foreign.filter((r) => r.country).length;
  console.log(`righe estere: ${changes.foreign.length} (paese determinato: ${withCountry})`);
  console.log(`country corretta su righe italiane: ${changes.italian.length} (+${changes.italianFilled} compilate)`);
  console.log(`righe invariate: ${changes.untouched}`);
  if (dryRun) console.log('(--dry-run: nessun file scritto)');
  else if (!edited) console.log('(nessuna modifica da applicare: report lasciato invariato)');
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
