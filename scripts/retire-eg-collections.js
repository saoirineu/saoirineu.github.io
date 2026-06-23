#!/usr/bin/env node
/**
 * One-off: archive + delete the retired European Gathering collections.
 *
 * Exports every document from `europeanGatheringRegistrations` and
 * `europeanGatheringRooms` to backup/<timestamp>-eg-retirement/<collection>/<docId>.json,
 * then (only with --confirm-delete) deletes those documents from Firestore.
 *
 * Firestore Storage files under europeanGatheringRegistrations/<id>/* are NOT touched
 * (they live in Cloud Storage, not the database); delete them separately if desired.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json node scripts/retire-eg-collections.js
 *   node scripts/retire-eg-collections.js                 # export only (safe; reports what would be deleted)
 *   node scripts/retire-eg-collections.js --confirm-delete  # export, then delete
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { mkdir, writeFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUP_ROOT = join(__dirname, '..', 'backup');

const COLLECTIONS = ['europeanGatheringRegistrations', 'europeanGatheringRooms'];
const PROJECT_ID = 'sao-irineu';
const CONFIRM_DELETE = process.argv.includes('--confirm-delete');

function initFirebase() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    initializeApp({ credential: cert(credPath), projectId: PROJECT_ID });
  } else {
    initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  }
}

function serializeDoc(data) {
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof value.toDate === 'function') {
      result[key] = { __type: 'Timestamp', value: value.toDate().toISOString() };
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      result[key] = serializeDoc(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        item && typeof item === 'object' && typeof item.toDate === 'function'
          ? { __type: 'Timestamp', value: item.toDate().toISOString() }
          : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function exportCollection(db, collectionName, destDir) {
  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) return { docCount: 0, docs: [] };

  await mkdir(destDir, { recursive: true });
  await Promise.all(
    snapshot.docs.map(doc =>
      writeFile(join(destDir, `${doc.id}.json`), JSON.stringify(serializeDoc(doc.data()), null, 2), 'utf8')
    )
  );

  // Verify on disk before reporting success.
  const written = (await readdir(destDir)).filter(f => f.endsWith('.json'));
  if (written.length !== snapshot.size) {
    throw new Error(`${collectionName}: wrote ${written.length} files but read ${snapshot.size} docs — aborting before any delete.`);
  }

  return { docCount: snapshot.size, docs: snapshot.docs };
}

async function deleteDocs(db, docs) {
  let remaining = docs;
  while (remaining.length) {
    const chunk = remaining.slice(0, 450);
    remaining = remaining.slice(450);
    const batch = db.batch();
    chunk.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function main() {
  initFirebase();
  const db = getFirestore();

  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const backupDir = join(BACKUP_ROOT, `${timestamp}-eg-retirement`);
  console.log(`Exporting retired EG collections to ${backupDir}`);

  const exported = [];
  for (const collection of COLLECTIONS) {
    process.stdout.write(`  ${collection}... `);
    const result = await exportCollection(db, collection, join(backupDir, collection));
    console.log(`${result.docCount} docs exported`);
    exported.push({ collection, ...result });
  }

  const total = exported.reduce((sum, e) => sum + e.docCount, 0);
  console.log(`\nExported ${total} docs total.`);

  if (!CONFIRM_DELETE) {
    console.log('\nExport only (no --confirm-delete). Would delete the docs above.');
    console.log('Re-run with --confirm-delete to remove them from Firestore.');
    return;
  }

  console.log('\n--confirm-delete set — deleting from Firestore...');
  for (const { collection, docs } of exported) {
    if (!docs.length) continue;
    process.stdout.write(`  deleting ${collection}... `);
    await deleteDocs(db, docs);
    console.log(`${docs.length} docs deleted`);
  }
  console.log('\nDone. Storage files under europeanGatheringRegistrations/<id>/* are untouched.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
