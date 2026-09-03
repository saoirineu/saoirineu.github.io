import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LEGACY_TOKEN_SUNSET_MS,
  TOKEN_MAX_AGE_MS,
  signReviewToken,
  verifyReviewToken
} from './reviewToken';

const SECRET = 'test-secret-value';
const PAYLOAD = 'evt-1:reg-1:leader@example.com';
const NOW = Date.parse('2026-09-03T12:00:00Z');

const verify = (token: unknown, overrides: Partial<Parameters<typeof verifyReviewToken>[0]> = {}) =>
  verifyReviewToken({ token, payload: PAYLOAD, secret: SECRET, nowMs: NOW, ...overrides });

test('a freshly signed token verifies', () => {
  assert.equal(verify(signReviewToken(PAYLOAD, SECRET, NOW)), 'valid');
});

test('a token is scoped to its payload', () => {
  const token = signReviewToken(PAYLOAD, SECRET, NOW);
  assert.equal(verify(token, { payload: 'evt-1:reg-2:leader@example.com' }), 'invalid');
  assert.equal(verify(token, { payload: 'evt-2:reg-1:leader@example.com' }), 'invalid');
  assert.equal(verify(token, { payload: 'evt-1:reg-1:someone@example.com' }), 'invalid');
});

test('a token is scoped to its secret', () => {
  const token = signReviewToken(PAYLOAD, SECRET, NOW);
  assert.equal(verify(token, { secret: 'other-secret' }), 'invalid');
});

test('a token expires once it is older than the maximum age', () => {
  const token = signReviewToken(PAYLOAD, SECRET, NOW);
  assert.equal(verify(token, { nowMs: NOW + TOKEN_MAX_AGE_MS - 1000 }), 'valid');
  assert.equal(verify(token, { nowMs: NOW + TOKEN_MAX_AGE_MS + 1000 }), 'expired');
});

test('the issue time cannot be edited to extend the life of a token', () => {
  const token = signReviewToken(PAYLOAD, SECRET, NOW);
  const [, digest] = token.split('.');
  const future = Math.floor((NOW + TOKEN_MAX_AGE_MS * 2) / 1000).toString(36);
  // The issue time is inside the signed material, so rewriting it breaks the MAC.
  assert.equal(verify(`${future}.${digest}`), 'invalid');
});

test('a token issued beyond the clock-skew allowance is refused', () => {
  const token = signReviewToken(PAYLOAD, SECRET, NOW + 60 * 60 * 1000);
  assert.equal(verify(token), 'invalid');
});

test('a token issued slightly ahead is tolerated', () => {
  const token = signReviewToken(PAYLOAD, SECRET, NOW + 60 * 1000);
  assert.equal(verify(token), 'valid');
});

test('malformed tokens are refused rather than throwing', () => {
  for (const bad of ['', 'not-a-token', '.', 'zz.zz', 'abc.', '.abc', null, undefined, 42, {}]) {
    assert.equal(verify(bad), 'invalid', `expected invalid for ${JSON.stringify(bad)}`);
  }
});

test('two equally malformed hex digests do not compare equal', () => {
  const token = signReviewToken(PAYLOAD, SECRET, NOW);
  const [issued] = token.split('.');
  // Same length as a real digest, but not hex — must not slip through the
  // empty-buffer path in a naive constant-time compare.
  assert.equal(verify(`${issued}.${'z'.repeat(32)}`), 'invalid');
});

test('legacy bare-HMAC tokens are honoured until the sunset, then refused', () => {
  const crypto = require('crypto') as typeof import('crypto');
  const legacy = crypto.createHmac('sha256', SECRET).update(PAYLOAD).digest('hex').slice(0, 32);

  assert.equal(verify(legacy, { nowMs: LEGACY_TOKEN_SUNSET_MS - 1000 }), 'valid');
  assert.equal(verify(legacy, { nowMs: LEGACY_TOKEN_SUNSET_MS }), 'expired');
  assert.equal(verify(legacy, { nowMs: LEGACY_TOKEN_SUNSET_MS + 1000 }), 'expired');
});

test('a wrong legacy token is invalid, not merely expired', () => {
  assert.equal(verify('a'.repeat(32), { nowMs: LEGACY_TOKEN_SUNSET_MS - 1000 }), 'invalid');
});

test('the sunset is in the future relative to the change that introduced it', () => {
  // Guards against shipping a sunset that has already passed, which would
  // silently invalidate every outstanding review link on deploy.
  assert.ok(LEGACY_TOKEN_SUNSET_MS > Date.parse('2026-09-03T00:00:00Z'));
});
