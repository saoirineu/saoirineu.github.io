#!/usr/bin/env node
/**
 * Firestore local backup
 *
 * Reads every document from the collections listed below and writes them as
 * JSON files under backup/<timestamp>/<collection>/<docId>.json
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json node scripts/backup.js
 *
 * Or if you use Application Default Credentials (gcloud auth application-default login):
 *   node scripts/backup.js
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUP_ROOT = join(__dirname, '..', 'backup');

const COLLECTIONS = [
  'users',
  'churches',
  'beverageBatches',
  'trabalhos',
  'europeanGatheringRegistrations',
  'europeanGatheringRooms'
];

const PROJECT_ID = 'sao-irineu';

function initFirebase() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    initializeApp({ credential: cert(credPath), projectId: PROJECT_ID });
  } else {
    initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  }
}

function serializeDoc(data) {
  // Convert Firestore-specific types to plain JSON-serializable values
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof value.toDate === 'function') {
      // Timestamp
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

async function backupCollection(db, collectionName, destDir) {
  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) {
    console.log(`  ${collectionName}: empty, skipping`);
    return 0;
  }

  await mkdir(destDir, { recursive: true });

  await Promise.all(
    snapshot.docs.map(async doc => {
      const data = serializeDoc(doc.data());
      const filePath = join(destDir, `${doc.id}.json`);
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    })
  );

  return snapshot.size;
}

async function main() {
  initFirebase();
  const db = getFirestore();

  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const backupDir = join(BACKUP_ROOT, timestamp);

  console.log(`Backing up to ${backupDir}`);

  for (const collection of COLLECTIONS) {
    process.stdout.write(`  ${collection}... `);
    const count = await backupCollection(db, collection, join(backupDir, collection));
    console.log(`${count} docs`);
  }

  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
