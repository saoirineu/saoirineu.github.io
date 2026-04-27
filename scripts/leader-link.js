#!/usr/bin/env node
/**
 * Generate a leader-review URL for a given European Gathering registration.
 *
 * Reads LEADER_TOKEN_SECRET from docs/credentials/leader-token.env (override
 * with --secret-file), computes the same HMAC the Cloud Function does, and
 * prints the resulting URL. Defaults to the local dev base.
 *
 * Usage:
 *   node scripts/leader-link.js --id <registrationId> --email <leaderEmail>
 *   node scripts/leader-link.js --id abc123 --email leader@example.com --base https://saoirineu.github.io
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (!match) continue;
    const [, key, inline] = match;
    out[key] = inline !== undefined ? inline : argv[++i];
  }
  return out;
}

function loadSecret(envPath) {
  const text = fs.readFileSync(envPath, 'utf8');
  const match = text.match(/^LEADER_TOKEN_SECRET=(.*)$/m);
  if (!match) throw new Error(`LEADER_TOKEN_SECRET not found in ${envPath}`);
  return match[1].trim();
}

const args = parseArgs(process.argv);

if (!args.id || !args.email) {
  console.error('Usage: node scripts/leader-link.js --id <registrationId> --email <leaderEmail> [--base <baseUrl>] [--secret-file <path>]');
  process.exit(2);
}

const base = (args.base ?? 'http://localhost:5174').replace(/\/$/, '');
const secretFile = args['secret-file'] ?? path.join(__dirname, '..', 'docs', 'credentials', 'leader-token.env');
const secret = loadSecret(secretFile);

const token = crypto
  .createHmac('sha256', secret)
  .update(`${args.id}:${args.email.trim().toLowerCase()}`)
  .digest('hex')
  .slice(0, 32);

console.log(`${base}/european-gathering/leader-review/${args.id}?t=${token}`);
