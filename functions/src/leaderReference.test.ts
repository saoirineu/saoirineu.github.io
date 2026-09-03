import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isSelfNominatedLeader, normalizeEmailForComparison } from './leaderReference';

test('normalization lowercases, trims and drops plus-tags', () => {
  assert.equal(normalizeEmailForComparison('  Me@Example.COM '), 'me@example.com');
  assert.equal(normalizeEmailForComparison('me+leader@example.com'), 'me@example.com');
  assert.equal(normalizeEmailForComparison('me+a+b@example.com'), 'me@example.com');
});

test('normalization leaves odd input alone rather than inventing an address', () => {
  assert.equal(normalizeEmailForComparison(''), '');
  assert.equal(normalizeEmailForComparison(null), '');
  assert.equal(normalizeEmailForComparison(undefined), '');
  assert.equal(normalizeEmailForComparison(42), '');
  assert.equal(normalizeEmailForComparison('not-an-email'), 'not-an-email');
  assert.equal(normalizeEmailForComparison('@example.com'), '@example.com');
  assert.equal(normalizeEmailForComparison('+tag@example.com'), '+tag@example.com');
});

test('a plus-tagged variant of the applicant address is caught', () => {
  assert.equal(
    isSelfNominatedLeader({
      leaderEmail: 'alice+leader@example.com',
      applicantEmails: ['alice@example.com']
    }),
    true
  );
});

test('case and whitespace do not evade the check', () => {
  assert.equal(
    isSelfNominatedLeader({ leaderEmail: ' ALICE@example.com ', applicantEmails: ['alice@example.com'] }),
    true
  );
});

test('either the account address or the typed address counts as the applicant', () => {
  assert.equal(
    isSelfNominatedLeader({
      leaderEmail: 'alice@example.com',
      applicantEmails: [undefined, 'alice@example.com']
    }),
    true
  );
});

test('a genuine third-party leader is not flagged', () => {
  assert.equal(
    isSelfNominatedLeader({
      leaderEmail: 'dirigente@stellazzurra.org',
      applicantEmails: ['alice@example.com', 'alice.other@example.com']
    }),
    false
  );
});

test('a missing leader address is not a self-nomination', () => {
  assert.equal(isSelfNominatedLeader({ leaderEmail: '', applicantEmails: ['alice@example.com'] }), false);
  assert.equal(isSelfNominatedLeader({ leaderEmail: null, applicantEmails: ['alice@example.com'] }), false);
});

test('empty applicant addresses never match', () => {
  assert.equal(
    isSelfNominatedLeader({ leaderEmail: 'leader@example.com', applicantEmails: ['', null, undefined] }),
    false
  );
});

test('different people at the same domain are not conflated', () => {
  assert.equal(
    isSelfNominatedLeader({
      leaderEmail: 'bob@example.com',
      applicantEmails: ['alice@example.com']
    }),
    false
  );
});
