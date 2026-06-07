#!/usr/bin/env node
/**
 * Seed the Firestore `members` collection from data/members/members.normalized.json
 * (produced by build-members.mjs).
 *
 * Each member is upserted by its id (Codice Fiscale, or an email-/name-derived
 * hash for rows without one). createdAt is set only on first insert; updatedAt
 * is refreshed every run. Re-running is safe and idempotent.
 *
 * Flags:
 *   --dry-run   Print what would happen without writing (default)
 *   --live      Actually write to Firestore
 *   --limit=N   Only process the first N members (handy for a smoke test)
 *
 * Usage:
 *   node scripts/members/seed-members.mjs            # dry run
 *   node scripts/members/seed-members.mjs --live
 *
 * Credentials: set GOOGLE_APPLICATION_CREDENTIALS or run
 *   gcloud auth application-default login
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = join(__dirname, '..', '..', 'data', 'members', 'members.normalized.json');
const PROJECT_ID = 'sao-irineu';
const COLLECTION = 'members';
const BATCH_SIZE = 400;

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--live');
const PRUNE = args.includes('--prune');
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

function initFirebase() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  initializeApp({
    credential: credPath ? cert(credPath) : applicationDefault(),
    projectId: PROJECT_ID
  });
}

async function main() {
  const all = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const members = Number.isFinite(LIMIT) ? all.slice(0, LIMIT) : all;

  console.log(DRY_RUN ? 'DRY RUN — no writes will be made. Pass --live to apply.\n' : 'LIVE MODE — writing to Firestore.\n');
  console.log(`Source: ${JSON_PATH}`);
  console.log(`Members to upsert: ${members.length}${Number.isFinite(LIMIT) ? ` (limited from ${all.length})` : ''}\n`);

  if (DRY_RUN) {
    const flagged = members.filter(m => m.needsReview).length;
    console.log(`Would write ${members.length} docs to "${COLLECTION}" (${flagged} flagged needsReview).`);
    if (PRUNE) console.log('Would prune any existing doc whose id is not in the JSON.');
    console.log('Sample documents:');
    for (const member of members.slice(0, 3)) {
      console.log(`  ${COLLECTION}/${member.id} — ${member.fullName ?? '(no name)'} — sources: ${member.sources.map(s => s.file).join('+')}`);
    }
    console.log('\nRun with --live to apply.');
    return;
  }

  initFirebase();
  const db = getFirestore();

  let written = 0;
  let created = 0;
  for (let start = 0; start < members.length; start += BATCH_SIZE) {
    const slice = members.slice(start, start + BATCH_SIZE);
    const refs = slice.map(member => db.collection(COLLECTION).doc(member.id));
    const snaps = await db.getAll(...refs);

    const batch = db.batch();
    slice.forEach((member, i) => {
      const { id, ...data } = member;
      const exists = snaps[i].exists;
      if (!exists) created += 1;
      batch.set(
        refs[i],
        {
          ...data,
          ...(exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: false }
      );
    });
    await batch.commit();
    written += slice.length;
    console.log(`  committed ${written}/${members.length}`);
  }

  console.log(`\nDone. ${written} written (${created} new, ${written - created} updated).`);

  // Prune docs that are no longer produced by the build (e.g. CF-less twins that
  // were folded into their CF record). Only when seeding the full dataset.
  if (PRUNE && Number.isFinite(LIMIT) === false) {
    const keep = new Set(all.map(m => m.id));
    const existing = await db.collection(COLLECTION).select().get();
    const stale = existing.docs.filter(doc => !keep.has(doc.id));
    console.log(`\nPrune: ${stale.length} stale docs to delete.`);
    for (let start = 0; start < stale.length; start += BATCH_SIZE) {
      const batch = db.batch();
      for (const doc of stale.slice(start, start + BATCH_SIZE)) batch.delete(doc.ref);
      await batch.commit();
    }
    if (stale.length) console.log(`Prune: deleted ${stale.length} docs.`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
