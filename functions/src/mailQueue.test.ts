import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  decideAttempt,
  describeSendError,
  docFieldGuardAllows,
  mailLifetimeMs,
  retryDelayMs
} from './mailQueue';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

test('retries start quickly and settle at an hour', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 20].map(n => retryDelayMs('user-approved', n) / MINUTE), [2, 5, 10, 15, 30, 60, 60, 60]);
});

test('a confirmation email gives the Firebase fallback time before retrying', () => {
  assert.deepEqual([1, 2, 3, 4, 9].map(n => retryDelayMs('verification', n) / MINUTE), [10, 20, 30, 60, 60]);
});

test('attempt counts below one are treated as the first failure', () => {
  assert.equal(retryDelayMs('user-approved', 0), 2 * MINUTE);
  assert.equal(retryDelayMs('user-approved', -3), 2 * MINUTE);
});

test('confirmation links live a day, review requests a week, the rest three days', () => {
  assert.equal(mailLifetimeMs('verification'), 24 * HOUR);
  assert.equal(mailLifetimeMs('leader-review'), 7 * 24 * HOUR);
  assert.equal(mailLifetimeMs('payment-review'), 7 * 24 * HOUR);
  assert.equal(mailLifetimeMs('user-approved'), 3 * 24 * HOUR);
  assert.equal(mailLifetimeMs('approval-pending'), 3 * 24 * HOUR);
});

test('only pending, due, unexpired emails are attempted', () => {
  const now = 1_000_000;
  assert.equal(decideAttempt({ now, status: 'pending', nextAttemptAt: now, expiresAt: now + HOUR }), 'attempt');
  assert.equal(decideAttempt({ now, status: 'pending', nextAttemptAt: null, expiresAt: null }), 'attempt');
  assert.equal(decideAttempt({ now, status: 'pending', nextAttemptAt: now + 1, expiresAt: now + HOUR }), 'not-due');
  assert.equal(decideAttempt({ now, status: 'pending', nextAttemptAt: now, expiresAt: now }), 'expire');
  for (const status of ['sent', 'cancelled', 'failed', undefined] as const) {
    assert.equal(decideAttempt({ now, status, nextAttemptAt: now, expiresAt: now + HOUR }), 'closed', String(status));
  }
});

test('expiry wins over a lease that is still running', () => {
  assert.equal(decideAttempt({ now: 10, status: 'pending', nextAttemptAt: 50, expiresAt: 5 }), 'expire');
});

test('a docField guard needs the document and one of the listed values', () => {
  const guard = { type: 'docField' as const, path: 'users/u1', field: 'approvalStatus', oneOf: ['approved'] };
  assert.equal(docFieldGuardAllows(guard, { exists: true, data: { approvalStatus: 'approved' } }), true);
  assert.equal(docFieldGuardAllows(guard, { exists: true, data: { approvalStatus: 'needs-info' } }), false);
  assert.equal(docFieldGuardAllows(guard, { exists: false }), false);
});

test('a docField guard can require a field that has not been decided yet', () => {
  const guard = { type: 'docField' as const, path: 'events/e/registrations/r', field: 'leaderApproval', oneOf: [null] };
  assert.equal(docFieldGuardAllows(guard, { exists: true, data: {} }), true);
  assert.equal(docFieldGuardAllows(guard, { exists: true, data: { leaderApproval: null } }), true);
  assert.equal(docFieldGuardAllows(guard, { exists: true, data: { leaderApproval: 'approved' } }), false);
  assert.equal(docFieldGuardAllows(guard, { exists: false }), false);
});

test('network failures surface the cause Node hides', () => {
  const error = Object.assign(new TypeError('fetch failed'), { cause: { code: 'UND_ERR_CONNECT_TIMEOUT', message: 'Connect Timeout Error' } });
  assert.equal(describeSendError(error), 'fetch failed (UND_ERR_CONNECT_TIMEOUT: Connect Timeout Error)');
});

test('the hosting challenge page is reduced to its title', () => {
  const error = new Error('Mail relay responded 403: <!DOCTYPE html>\n<html lang="en">\n<head>\n<title>Visitor anti-robot validation</title>');
  assert.equal(describeSendError(error), 'Mail relay responded 403: "Visitor anti-robot validation"');
});

test('plain errors keep their first line, and anything else is stringified', () => {
  assert.equal(describeSendError(new Error('Mail relay responded 429: {"error":"rate limited"}\nmore')), 'Mail relay responded 429: {"error":"rate limited"}');
  assert.equal(describeSendError('boom'), 'boom');
});
