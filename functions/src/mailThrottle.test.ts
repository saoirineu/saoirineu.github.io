import assert from 'node:assert/strict';
import { test } from 'node:test';

import { evaluateThrottle, type ThrottleState } from './mailThrottle';

const WINDOW = 60 * 60 * 1000;
const MAX = 3;
const NOW = Date.parse('2026-09-03T12:00:00Z');

const run = (state: ThrottleState | null, now = NOW) =>
  evaluateThrottle({ now, windowMs: WINDOW, maxInWindow: MAX, state });

test('the first send opens a window', () => {
  const decision = run(null);
  assert.equal(decision.allowed, true);
  assert.deepEqual(decision.next, { windowStart: NOW, count: 1 });
  assert.equal(decision.remaining, MAX - 1);
});

test('sends are allowed up to the cap, then refused', () => {
  let state: ThrottleState | null = null;
  for (let i = 1; i <= MAX; i++) {
    const decision = run(state);
    assert.equal(decision.allowed, true, `send ${i} should be allowed`);
    state = decision.next;
  }
  const blocked = run(state);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  // A refused send must not extend the window or inflate the count.
  assert.deepEqual(blocked.next, state);
});

test('the window resets once it has elapsed', () => {
  const exhausted: ThrottleState = { windowStart: NOW, count: MAX };
  assert.equal(run(exhausted, NOW + WINDOW - 1).allowed, false);

  const fresh = run(exhausted, NOW + WINDOW + 1);
  assert.equal(fresh.allowed, true);
  assert.deepEqual(fresh.next, { windowStart: NOW + WINDOW + 1, count: 1 });
});

test('a window stamped in the future is treated as stale, not as a block', () => {
  // Otherwise a bad clock — or a document written with a future stamp — would
  // wedge the portal's mail shut until that time passed.
  const future: ThrottleState = { windowStart: NOW + WINDOW * 10, count: MAX };
  const decision = run(future);
  assert.equal(decision.allowed, true);
  assert.deepEqual(decision.next, { windowStart: NOW, count: 1 });
});

test('malformed state is treated as no state', () => {
  for (const bad of [
    { windowStart: Number.NaN, count: 1 },
    { windowStart: NOW, count: Number.NaN },
    {} as unknown as ThrottleState
  ]) {
    assert.equal(run(bad as ThrottleState).allowed, true);
  }
});

test('a negative count cannot buy extra sends', () => {
  const decision = run({ windowStart: NOW, count: -5 });
  assert.equal(decision.allowed, true);
  assert.deepEqual(decision.next, { windowStart: NOW, count: 1 });
});
