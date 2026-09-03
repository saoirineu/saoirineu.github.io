#!/usr/bin/env node
/**
 * Generate a leader-review URL for a given event registration
 * (events/{eventId}/registrations/{registrationId}).
 *
 * Reads LEADER_TOKEN_SECRET from docs/credentials/leader-token.env (override
 * with --secret-file), computes the same token the Cloud Function does, and
 * prints the resulting URL. Defaults to the local dev base.
 *
 * The token carries its issue time and expires after 60 days.
 *
 * Usage:
 *   node scripts/leader-link.js --id <registrationId> --email <leaderEmail> --event <eventId>
 *   node scripts/leader-link.js --id abc123 --email leader@example.com --event encontro-europeu-2026 --base https://saoirineu.github.io
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

if (!args.id || !args.email || !args.event) {
  console.error('Usage: node scripts/leader-link.js --id <registrationId> --email <leaderEmail> --event <eventId> [--base <baseUrl>] [--secret-file <path>]');
  process.exit(2);
}

const base = (args.base ?? 'http://localhost:5174').replace(/\/$/, '');
const secretFile = args['secret-file'] ?? path.join(__dirname, '..', 'docs', 'credentials', 'leader-token.env');
const secret = loadSecret(secretFile);

// Must match signReviewToken in functions/src/reviewToken.ts: the issue time is
// part of the signed material, and the link stops working once it ages out.
const issued = Math.floor(Date.now() / 1000).toString(36);
const payload = `${args.event}:${args.id}:${args.email.trim().toLowerCase()}`;
const digest = crypto
  .createHmac('sha256', secret)
  .update(`${payload}:${issued}`)
  .digest('hex')
  .slice(0, 32);
const token = `${issued}.${digest}`;

console.log(`${base}/leader-review/${args.id}?t=${token}&e=${encodeURIComponent(args.event)}`);
console.error('This link expires 60 days from now.');
