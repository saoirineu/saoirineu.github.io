#!/usr/bin/env node
/**
 * Firestore migration: rename collections and field names to English
 *
 * Reads each document from the old collection, writes a transformed copy to
 * the new collection, then (optionally) deletes the old document.
 *
 * Flags:
 *   --dry-run   Print what would happen without writing anything (default)
 *   --live      Actually write to Firestore
 *   --delete-old  Also delete the old documents after writing (only with --live)
 *
 * Usage:
 *   node scripts/migrate.js --dry-run
 *   node scripts/migrate.js --live
 *   node scripts/migrate.js --live --delete-old
 *
 * Credentials: set GOOGLE_APPLICATION_CREDENTIALS or use
 *   gcloud auth application-default login
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--live');
const DELETE_OLD = args.includes('--delete-old');

if (DRY_RUN) {
  console.log('DRY RUN — no writes will be made. Pass --live to apply.\n');
} else {
  console.log('LIVE MODE — writing to Firestore.\n');
  if (DELETE_OLD) {
    console.log('DELETE OLD — old documents will be deleted after migration.\n');
  }
}

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

const PROJECT_ID = 'sao-irineu';

function initFirebase() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    initializeApp({ credential: cert(credPath), projectId: PROJECT_ID });
  } else {
    initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  }
}

// ---------------------------------------------------------------------------
// Field transformers
// Each returns a plain object with the new field names.
// Fields not listed are passed through unchanged.
// ---------------------------------------------------------------------------

/**
 * usuarios → users
 * Rename Portuguese field names; keep values identical.
 */
function transformUser(data) {
  const {
    // phase 1 renames
    cidade,
    estado,
    pais,
    igrejaAtualId,
    igrejaAtualNome,
    igrejaOrigemNome,
    fardamentoData,
    fardamentoLocal,
    fardamentoIgrejaId,
    fardamentoIgrejaNome,
    fardadorNome,
    padrinhoMadrinha,
    padrinhoIgrejasIds,
    padrinhoIgrejasNomes,
    papeisDoutrina,
    observacoes,
    // phase 2 renames (semi-English names from phase 1 → fully English)
    fardado,
    fardamentoDate,
    fardamentoVenue,
    fardamentoChurchId,
    fardamentoChurchName,
    fardadorName,
    fardadoComQuem,
    isPadrinho,
    padrinhoChurchIds,
    padrinhoChurchNames,
    // pass-through fields
    ...rest
  } = data;

  return {
    ...rest,
    // phase 1
    ...(cidade !== undefined && { city: cidade }),
    ...(estado !== undefined && { state: estado }),
    ...(pais !== undefined && { country: pais }),
    ...(igrejaAtualId !== undefined && { currentChurchId: igrejaAtualId }),
    ...(igrejaAtualNome !== undefined && { currentChurchName: igrejaAtualNome }),
    ...(igrejaOrigemNome !== undefined && { originChurchName: igrejaOrigemNome }),
    // phase 1→2 intermediate names (in case some docs only had phase 1 applied)
    ...(fardamentoData !== undefined && { initiationDate: fardamentoData }),
    ...(fardamentoLocal !== undefined && { initiationVenue: fardamentoLocal }),
    ...(fardamentoIgrejaId !== undefined && { initiationChurchId: fardamentoIgrejaId }),
    ...(fardamentoIgrejaNome !== undefined && { initiationChurchName: fardamentoIgrejaNome }),
    ...(fardadorNome !== undefined && { initiatorName: fardadorNome }),
    ...(padrinhoMadrinha !== undefined && { isSponsor: padrinhoMadrinha }),
    ...(padrinhoIgrejasIds !== undefined && { sponsorChurchIds: padrinhoIgrejasIds }),
    ...(padrinhoIgrejasNomes !== undefined && { sponsorChurchNames: padrinhoIgrejasNomes }),
    ...(papeisDoutrina !== undefined && { doctrineRoles: papeisDoutrina }),
    ...(observacoes !== undefined && { observations: observacoes }),
    // phase 2 (semi-English intermediate names → fully English)
    ...(fardado !== undefined && { isInitiated: fardado }),
    ...(fardamentoDate !== undefined && { initiationDate: fardamentoDate }),
    ...(fardamentoVenue !== undefined && { initiationVenue: fardamentoVenue }),
    ...(fardamentoChurchId !== undefined && { initiationChurchId: fardamentoChurchId }),
    ...(fardamentoChurchName !== undefined && { initiationChurchName: fardamentoChurchName }),
    ...(fardadorName !== undefined && { initiatorName: fardadorName }),
    ...(fardadoComQuem !== undefined && { initiatedWith: fardadoComQuem }),
    ...(isPadrinho !== undefined && { isSponsor: isPadrinho }),
    ...(padrinhoChurchIds !== undefined && { sponsorChurchIds: padrinhoChurchIds }),
    ...(padrinhoChurchNames !== undefined && { sponsorChurchNames: padrinhoChurchNames }),
  };
}

/**
 * igrejas → churches
 */
function transformChurch(data) {
  const {
    nome,
    cidade,
    estado,
    pais,
    linhagem,
    observacoes,
    ...rest
  } = data;

  return {
    ...rest,
    ...(nome !== undefined && { name: nome }),
    ...(cidade !== undefined && { city: cidade }),
    ...(estado !== undefined && { state: estado }),
    ...(pais !== undefined && { country: pais }),
    ...(linhagem !== undefined && { lineage: linhagem }),
    ...(observacoes !== undefined && { observations: observacoes }),
  };
}

/**
 * trabalhos — collection name kept, field names renamed (phase 1 + phase 2)
 * Phase 1: titulo→title, anotacoes→notes, localId→venueId, etc.
 * Phase 2: data→date, horarioInicio→startTime, duracaoEsperadaMin→expectedDurationMin,
 *           duracaoEfetivaMin→actualDurationMin,
 *           attendees.fardados→initiated, attendees.homens→men, attendees.mulheres→women
 */
function transformTrabalho(data) {
  const {
    // phase 1 renames
    titulo,
    anotacoes,
    hinarios,
    localId,
    localNome,
    localTexto,
    igrejasResponsaveisIds,
    igrejasResponsaveisNomes,
    igrejasResponsaveisTexto,
    participantes,
    bebida,
    // phase 2 renames (top-level)
    data: sessionDate,
    horarioInicio,
    duracaoEsperadaMin,
    duracaoEfetivaMin,
    // attendees is handled below (may come from participantes or directly)
    attendees: attendeesDirect,
    ...rest
  } = data;

  // attendees sub-object — may be called `participantes` (old) or `attendees` (phase-1 migrated)
  const rawAttendees = participantes ?? attendeesDirect;
  let attendees;
  if (rawAttendees !== undefined) {
    const {
      criancas, outros, outrosDescricao,   // phase-1 Portuguese names
      fardados, homens, mulheres,           // phase-2 Portuguese names
      ...attendeesRest
    } = rawAttendees ?? {};
    attendees = {
      ...attendeesRest,
      ...(criancas !== undefined && { children: criancas }),
      ...(outros !== undefined && { others: outros }),
      ...(outrosDescricao !== undefined && { othersDescription: outrosDescricao }),
      ...(fardados !== undefined && { initiated: fardados }),
      ...(homens !== undefined && { men: homens }),
      ...(mulheres !== undefined && { women: mulheres }),
    };
  }

  // beverage sub-object
  let beverage;
  if (bebida !== undefined) {
    const { loteRef, loteId, loteDescricao, loteTexto, quantidadeLitros, ...beverageRest } = bebida ?? {};
    beverage = {
      ...beverageRest,
      ...(loteRef !== undefined && { batchRef: loteRef }),
      ...(loteId !== undefined && { batchId: loteId }),
      ...(loteDescricao !== undefined && { batchDescription: loteDescricao }),
      ...(loteTexto !== undefined && { batchText: loteTexto }),
      ...(quantidadeLitros !== undefined && { liters: quantidadeLitros }),
    };
  }

  return {
    ...rest,
    // phase 1
    ...(titulo !== undefined && { title: titulo }),
    ...(anotacoes !== undefined && { notes: anotacoes }),
    ...(hinarios !== undefined && { hymnals: hinarios }),
    ...(localId !== undefined && { venueId: localId }),
    ...(localNome !== undefined && { venueName: localNome }),
    ...(localTexto !== undefined && { venueText: localTexto }),
    ...(igrejasResponsaveisIds !== undefined && { responsibleChurchIds: igrejasResponsaveisIds }),
    ...(igrejasResponsaveisNomes !== undefined && { responsibleChurchNames: igrejasResponsaveisNomes }),
    ...(igrejasResponsaveisTexto !== undefined && { responsibleChurchText: igrejasResponsaveisTexto }),
    // phase 2
    ...(sessionDate !== undefined && { date: sessionDate }),
    ...(horarioInicio !== undefined && { startTime: horarioInicio }),
    ...(duracaoEsperadaMin !== undefined && { expectedDurationMin: duracaoEsperadaMin }),
    ...(duracaoEfetivaMin !== undefined && { actualDurationMin: duracaoEfetivaMin }),
    ...(attendees !== undefined && { attendees }),
    ...(beverage !== undefined && { beverage }),
  };
}

/**
 * bebidaLotes → beverageBatches
 * Fields are already mostly English; only descricao needs renaming.
 */
function transformBeverageBatch(data) {
  const { descricao, ...rest } = data;
  return {
    ...rest,
    ...(descricao !== undefined && { description: descricao }),
  };
}

/**
 * encontroEuropeuInscricoes → europeanGatheringRegistrations
 * All fields are already English — collection rename only, except
 * identityDocumentPath which embeds the old storage path.
 */
function transformRegistration(data) {
  const { identityDocumentPath, paymentProofPath, isFardado, ...rest } = data;
  const rewrite = s => s?.replace('encontroEuropeuInscricoes/', 'europeanGatheringRegistrations/');
  return {
    ...rest,
    ...(identityDocumentPath !== undefined && { identityDocumentPath: rewrite(identityDocumentPath) }),
    ...(paymentProofPath !== undefined && { paymentProofPath: rewrite(paymentProofPath) }),
    ...(isFardado !== undefined && { isInitiated: isFardado }),
  };
}

/**
 * encontroEuropeuQuartos → europeanGatheringRooms
 * All fields are already English — collection rename only.
 */
function transformRoom(data) {
  return { ...data };
}

// ---------------------------------------------------------------------------
// Migration plan
// ---------------------------------------------------------------------------

const MIGRATIONS = [
  {
    from: 'usuarios',
    to: 'users',
    transform: transformUser
  },
  {
    from: 'igrejas',
    to: 'churches',
    transform: transformChurch
  },
  {
    from: 'trabalhos',
    to: 'trabalhos',   // collection name kept; field names change
    transform: transformTrabalho
  },
  {
    from: 'bebidaLotes',
    to: 'beverageBatches',
    transform: transformBeverageBatch
  },
  {
    from: 'encontroEuropeuInscricoes',
    to: 'europeanGatheringRegistrations',
    transform: transformRegistration
  },
  {
    from: 'encontroEuropeuQuartos',
    to: 'europeanGatheringRooms',
    transform: transformRoom
  }
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function migrateCollection(db, { from, to, transform }) {
  const sameCollection = from === to;
  const label = sameCollection ? from : `${from} → ${to}`;
  console.log(`\n[${label}]`);

  const sourceSnapshot = await db.collection(from).get();
  if (sourceSnapshot.empty) {
    console.log('  empty, skipping');
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const sourceDoc of sourceSnapshot.docs) {
    const destRef = db.collection(to).doc(sourceDoc.id);

    try {
      // Skip if destination already exists (safe re-run)
      if (!sameCollection && !DRY_RUN) {
        const destSnap = await destRef.get();
        if (destSnap.exists) {
          console.log(`  SKIP ${sourceDoc.id} (already exists in ${to})`);
          skipped++;
          continue;
        }
      }

      const transformed = transform(sourceDoc.data());

      if (DRY_RUN) {
        console.log(`  WOULD write ${to}/${sourceDoc.id}`);
        console.log('    ' + JSON.stringify(transformed, null, 2).replace(/\n/g, '\n    '));
        migrated++;
        continue;
      }

      // Write to destination
      await destRef.set(transformed);
      migrated++;

      // Delete old doc (only when migrating to a different collection)
      if (DELETE_OLD && !sameCollection) {
        await sourceDoc.ref.delete();
        console.log(`  OK ${sourceDoc.id} (migrated + deleted old)`);
      } else {
        console.log(`  OK ${sourceDoc.id}`);
      }
    } catch (err) {
      console.error(`  FAIL ${sourceDoc.id}: ${err.message}`);
      failed++;
    }
  }

  console.log(`  → ${migrated} migrated, ${skipped} skipped, ${failed} failed`);
}

async function main() {
  initFirebase();
  const db = getFirestore();

  for (const migration of MIGRATIONS) {
    await migrateCollection(db, migration);
  }

  console.log('\nDone.');
  if (DRY_RUN) {
    console.log('Run with --live to apply changes.');
  } else if (!DELETE_OLD) {
    console.log('Old collections still exist. Run with --live --delete-old to remove them once verified.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
