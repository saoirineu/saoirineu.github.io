// Mail queue against the Firestore emulator, with a fake relay and a controllable clock.
// Not part of `npm test` (it needs the emulator). Run from the repo root:
//
//   npm --prefix functions run build
//   npx firebase emulators:exec --only firestore --project sao-irineu-test \
//     "node --test functions/lib/mailQueueRuntime.emulator.js"

import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';

import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { createMailQueue } from './mailQueueRuntime';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Refusing to run against a real project: FIRESTORE_EMULATOR_HOST is not set.');
}

const app = initializeApp({ projectId: 'sao-irineu-test' }, 'mail-queue-emulator-test');
const db = getFirestore(app);

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const quiet = { log: () => undefined, warn: () => undefined, error: () => undefined };

let clock = Date.parse('2026-09-16T12:00:00Z');
let relayUp = true;
let sent: { to: string[]; subject: string }[] = [];
let verified = new Map<string, boolean | null>();

const queue = createMailQueue({
  db,
  now: () => clock,
  log: quiet,
  isEmailVerified: async uid => (verified.has(uid) ? verified.get(uid)! : false),
  send: async mail => {
    if (!relayUp) {
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'UND_ERR_CONNECT_TIMEOUT', message: 'Connect Timeout Error' } });
    }
    sent.push({ to: mail.to, subject: mail.subject });
  }
});

const mail = (subject = 'Hello') => ({ to: 'someone@example.com', subject, text: 'body' });

async function queued(id: string) {
  return (await db.collection('mailQueue').doc(id).get()).data() ?? {};
}

beforeEach(async () => {
  const existing = await db.collection('mailQueue').get();
  await Promise.all(existing.docs.map(doc => doc.ref.delete()));
  await db.doc('users/u1').set({ approvalStatus: 'approved' });
  clock = Date.parse('2026-09-16T12:00:00Z');
  relayUp = true;
  sent = [];
  verified = new Map();
});

after(async () => {
  await deleteApp(app);
});

test('a healthy relay sends at once and closes the email', async () => {
  assert.equal(await queue.deliverOrQueue(mail(), { kind: 'user-approved', id: 'ok' }), 'sent');
  const doc = await queued('ok');
  assert.equal(doc.status, 'sent');
  assert.equal(doc.attempts, 1);
  assert.equal(doc.nextAttemptAt, undefined);
  assert.deepEqual(sent, [{ to: ['someone@example.com'], subject: 'Hello' }]);
});

test('a refused email is queued, retried when due, and delivered', async () => {
  relayUp = false;
  assert.equal(await queue.deliverOrQueue(mail(), { kind: 'user-approved', id: 'retry' }), 'queued');
  let doc = await queued('retry');
  assert.equal(doc.status, 'pending');
  assert.equal(doc.lastError, 'fetch failed (UND_ERR_CONNECT_TIMEOUT: Connect Timeout Error)');
  assert.equal(doc.nextAttemptAt.toMillis(), clock + 2 * MINUTE);

  relayUp = true;
  clock += MINUTE;
  assert.deepEqual(await queue.retryDue(), { sent: 0, queued: 0, cancelled: 0, failed: 0, skipped: 0 });
  assert.equal(sent.length, 0);

  clock += 2 * MINUTE;
  assert.equal((await queue.retryDue()).sent, 1);
  doc = await queued('retry');
  assert.equal(doc.status, 'sent');
  assert.equal(doc.attempts, 2);
  assert.equal(sent.length, 1);
});

test('backoff grows with each failed attempt', async () => {
  relayUp = false;
  await queue.deliverOrQueue(mail(), { kind: 'user-approved', id: 'backoff' });
  const gaps: number[] = [];
  for (let i = 0; i < 3; i += 1) {
    const next = (await queued('backoff')).nextAttemptAt.toMillis();
    gaps.push((next - clock) / MINUTE);
    clock = next;
    await queue.retryDue();
  }
  assert.deepEqual(gaps, [2, 5, 10]);
  assert.equal((await queued('backoff')).attempts, 4);
});

test('an email that no longer matches the data is cancelled, not sent', async () => {
  relayUp = false;
  const guard = { type: 'docField' as const, path: 'users/u1', field: 'approvalStatus', oneOf: ['approved'] };
  await queue.deliverOrQueue(mail(), { kind: 'user-approved', id: 'stale', guard });

  await db.doc('users/u1').update({ approvalStatus: 'needs-info' });
  relayUp = true;
  clock += 10 * MINUTE;
  assert.equal((await queue.retryDue()).cancelled, 1);
  const doc = await queued('stale');
  assert.equal(doc.status, 'cancelled');
  assert.equal(doc.nextAttemptAt, undefined);
  assert.equal(sent.length, 0);
});

test('a confirmation email stops once the address is confirmed', async () => {
  relayUp = false;
  await queue.deliverOrQueue(mail('Confirm'), { kind: 'verification', id: 'verification-u1', guard: { type: 'emailUnverified', uid: 'u1' }, replace: true });
  assert.equal((await queued('verification-u1')).nextAttemptAt.toMillis(), clock + 10 * MINUTE);

  verified.set('u1', true);
  relayUp = true;
  clock += 10 * MINUTE;
  assert.equal((await queue.retryDue()).cancelled, 1);
  assert.equal(sent.length, 0);
});

test('a confirmation email for a deleted account is cancelled', async () => {
  verified.set('gone', null);
  assert.equal(await queue.deliverOrQueue(mail(), { kind: 'verification', id: 'verification-gone', guard: { type: 'emailUnverified', uid: 'gone' }, replace: true }), 'cancelled');
});

test('an email past its lifetime gives up', async () => {
  relayUp = false;
  await queue.deliverOrQueue(mail(), { kind: 'user-approved', id: 'old' });
  clock += 3 * 24 * HOUR;
  assert.equal((await queue.retryDue()).failed, 1);
  const doc = await queued('old');
  assert.equal(doc.status, 'failed');
  assert.equal(doc.closedReason, 'expired');
  assert.equal(doc.nextAttemptAt, undefined);
  // Closed emails are never picked up again.
  clock += HOUR;
  assert.deepEqual(await queue.retryDue(), { sent: 0, queued: 0, cancelled: 0, failed: 0, skipped: 0 });
});

test('a redelivered trigger does not send its email twice', async () => {
  assert.equal(await queue.deliverOrQueue(mail(), { kind: 'user-approved', id: 'event-1' }), 'sent');
  assert.equal(await queue.deliverOrQueue(mail(), { kind: 'user-approved', id: 'event-1' }), 'skipped');
  assert.equal(sent.length, 1);
});

test('a newer confirmation link replaces the one still waiting', async () => {
  relayUp = false;
  await queue.deliverOrQueue(mail('First link'), { kind: 'verification', id: 'verification-u2', guard: { type: 'emailUnverified', uid: 'u2' }, replace: true });
  relayUp = true;
  assert.equal(await queue.deliverOrQueue(mail('Second link'), { kind: 'verification', id: 'verification-u2', guard: { type: 'emailUnverified', uid: 'u2' }, replace: true }), 'sent');
  assert.deepEqual(sent.map(entry => entry.subject), ['Second link']);
  assert.equal((await queued('verification-u2')).attempts, 1);
});

test('two concurrent attempts on the same due email send it once', async () => {
  relayUp = false;
  await queue.deliverOrQueue(mail(), { kind: 'user-approved', id: 'race' });
  relayUp = true;
  clock += 5 * MINUTE;
  const ref = db.collection('mailQueue').doc('race');
  const outcomes = await Promise.all([queue.attempt(ref), queue.attempt(ref), queue.retryDue()]);
  assert.equal(sent.length, 1, JSON.stringify(outcomes));
  assert.equal((await queued('race')).status, 'sent');
});
