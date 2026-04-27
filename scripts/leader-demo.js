#!/usr/bin/env node
/**
 * Seed (or remove) a demo European Gathering registration so the example
 * leader-review URL works locally.
 *
 * Auth: same as backup.js — GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth
 * application-default login`.
 *
 * Usage:
 *   node scripts/leader-demo.js --seed [--id exampleRegistrationId123] [--email leader@example.com]
 *   node scripts/leader-demo.js --unseed [--id exampleRegistrationId123]
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'sao-irineu';
const DEFAULT_ID = 'exampleRegistrationId123';
const DEFAULT_EMAIL = 'leader@example.com';
const DEFAULT_BASE = 'http://localhost:5174';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (!match) continue;
    const [, key, inline] = match;
    if (inline !== undefined) {
      out[key] = inline;
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      out[key] = argv[++i];
    } else {
      out[key] = true;
    }
  }
  return out;
}

function loadSecret(envPath) {
  const text = fs.readFileSync(envPath, 'utf8');
  const match = text.match(/^LEADER_TOKEN_SECRET=(.*)$/m);
  if (!match) throw new Error(`LEADER_TOKEN_SECRET not found in ${envPath}`);
  return match[1].trim();
}

function initFirebase() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    initializeApp({ credential: cert(credPath), projectId: PROJECT_ID });
  } else {
    initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  }
}

const args = parseArgs(process.argv);
const id = args.id ?? DEFAULT_ID;
const email = (args.email ?? DEFAULT_EMAIL).trim();
const base = (args.base ?? DEFAULT_BASE).replace(/\/$/, '');
const secretFile = args['secret-file'] ?? path.join(__dirname, '..', 'docs', 'credentials', 'leader-token.env');

if (!args.seed && !args.unseed) {
  console.error('Pass --seed or --unseed');
  process.exit(2);
}

initFirebase();
const db = getFirestore();
const ref = db.collection('europeanGatheringRegistrations').doc(id);

if (args.unseed) {
  await ref.delete();
  console.log(`Deleted europeanGatheringRegistrations/${id}`);
  process.exit(0);
}

const fixture = {
  locale: 'it',
  firstName: 'Demo',
  lastName: 'Participant',
  country: 'Italy',
  church: 'Demo Center',
  centerLeader: 'Demo Leader',
  centerLeaderEmail: email,
  isInitiated: false,
  isIcefluMember: false,
  isNovice: true,
  attendanceMode: 'lodging',
  checkIn: '2026-09-10',
  checkOut: '2026-09-16',
  selectedWorks: ['fri-11-19', 'sat-12-19'],
  needsExtraLinen: false,
  contribution: { nights: 6, lodging: 420, spiritualWorks: 180, extras: 0, total: 600 },
  status: 'pending',
  submittedAt: FieldValue.serverTimestamp(),
  userId: 'leader-demo-fixture'
};

await ref.set(fixture);
console.log(`Wrote europeanGatheringRegistrations/${id}`);

const secret = loadSecret(secretFile);
const token = crypto
  .createHmac('sha256', secret)
  .update(`${id}:${email.toLowerCase()}`)
  .digest('hex')
  .slice(0, 32);

console.log(`${base}/european-gathering/leader-review/${id}?t=${token}`);
