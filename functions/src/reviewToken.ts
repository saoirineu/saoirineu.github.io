// Pure, dependency-free signing and verification for the emailed review links
// (leader review, payment review). Kept separate from index.ts so the expiry
// rules are unit-testable without a Firestore/functions harness.
//
// A token is `<issuedAt base36>.<hmac>`. Carrying the issue time in the token
// is what lets a link expire: the previous format was a bare HMAC over stable
// inputs, so a forwarded or archived review email stayed a working approval
// credential forever, and the only revocation was rotating the shared secret —
// which invalidates every outstanding link at once.
import * as crypto from 'crypto';

const HEX_LENGTH = 32;
const HEX_PATTERN = /^[0-9a-f]+$/;

/** How long an emailed review link stays usable. */
export const TOKEN_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

/**
 * Links already in leaders' inboxes were signed in the old format and carry no
 * issue time, so they cannot be aged. They keep working until this date, by
 * which point any outstanding review email is stale anyway; after it they are
 * refused and a fresh link has to be issued (`make leader-link`). Delete the
 * legacy branch below once this date has passed.
 */
export const LEGACY_TOKEN_SUNSET_MS = Date.parse('2026-11-01T00:00:00Z');

/** A token issued further in the future than this is a forgery or a broken clock. */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function mac(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, HEX_LENGTH);
}

/**
 * Constant-time compare of two hex digests. The explicit hex check matters:
 * Buffer.from(<non-hex>, 'hex') yields an empty buffer, so without it two
 * equally-malformed strings would compare equal.
 */
function hexEquals(expected: string, presented: string): boolean {
  if (!HEX_PATTERN.test(presented) || presented.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(presented, 'hex'));
}

export function signReviewToken(payload: string, secret: string, issuedAtMs: number): string {
  const issued = Math.floor(issuedAtMs / 1000).toString(36);
  return `${issued}.${mac(`${payload}:${issued}`, secret)}`;
}

export type TokenVerdict = 'valid' | 'expired' | 'invalid';

export function verifyReviewToken(args: {
  token: unknown;
  payload: string;
  secret: string;
  nowMs: number;
  maxAgeMs?: number;
  legacySunsetMs?: number;
}): TokenVerdict {
  const { payload, secret, nowMs } = args;
  const maxAgeMs = args.maxAgeMs ?? TOKEN_MAX_AGE_MS;
  const legacySunsetMs = args.legacySunsetMs ?? LEGACY_TOKEN_SUNSET_MS;

  if (typeof args.token !== 'string' || args.token === '') return 'invalid';
  const token = args.token;

  const separator = token.indexOf('.');
  if (separator === -1) {
    // Legacy format: a bare HMAC with no issue time to check.
    if (nowMs >= legacySunsetMs) return 'expired';
    return hexEquals(mac(payload, secret), token) ? 'valid' : 'invalid';
  }

  const issued = token.slice(0, separator);
  const presented = token.slice(separator + 1);
  if (!hexEquals(mac(`${payload}:${issued}`, secret), presented)) return 'invalid';

  // Only trust the issue time after the signature checks out.
  const issuedAtSeconds = Number.parseInt(issued, 36);
  if (!Number.isFinite(issuedAtSeconds)) return 'invalid';
  const issuedAtMs = issuedAtSeconds * 1000;

  if (issuedAtMs - nowMs > MAX_CLOCK_SKEW_MS) return 'invalid';
  if (nowMs - issuedAtMs > maxAgeMs) return 'expired';
  return 'valid';
}
