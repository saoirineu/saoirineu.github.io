#!/usr/bin/env node
/**
 * Uploads public association documents (privacy notice, statute) to Firebase
 * Storage under docs/, and prints the URL to put in the portal.
 *
 * They live in Storage rather than in the repo so a new version can be
 * published without a code deploy, and so the PDFs stay out of git.
 * storage.rules makes docs/ world-readable and client-unwritable.
 *
 * Usage:
 *   node scripts/upload-documents.mjs <file.pdf> [more.pdf ...]
 *   node scripts/upload-documents.mjs --as iceflu-privacy-it.pdf <file.pdf>
 *
 * Credentials as in backup.js: GOOGLE_APPLICATION_CREDENTIALS, or ADC via
 * `gcloud auth application-default login`.
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { basename } from 'node:path';
import { readFileSync } from 'node:fs';

const BUCKET = 'sao-irineu.firebasestorage.app';

const args = process.argv.slice(2);
let renameTo = null;
const files = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--as') {
    renameTo = args[i + 1];
    i += 1;
  } else {
    files.push(args[i]);
  }
}

if (!files.length) {
  console.error('Usage: node scripts/upload-documents.mjs [--as name.pdf] <file.pdf> ...');
  process.exit(1);
}
if (renameTo && files.length > 1) {
  console.error('--as renames a single file; pass one file with it.');
  process.exit(1);
}

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
initializeApp({
  credential: credentialsPath ? cert(JSON.parse(readFileSync(credentialsPath, 'utf8'))) : applicationDefault(),
  storageBucket: BUCKET
});

const bucket = getStorage().bucket();

for (const file of files) {
  const name = renameTo ?? basename(file);
  const destination = `docs/${name}`;
  await bucket.upload(file, {
    destination,
    metadata: {
      contentType: name.endsWith('.pdf') ? 'application/pdf' : undefined,
      // Documents change rarely, but a new version must reach members without
      // waiting a day, so keep the cache short.
      cacheControl: 'public, max-age=3600'
    }
  });
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(destination)}?alt=media`;
  console.log(`${name}\n  ${url}`);
}

process.exit(0);
