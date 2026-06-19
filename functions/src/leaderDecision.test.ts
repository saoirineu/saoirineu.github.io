import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeLeaderResponse, interviewRequirementFor, isTerminalApproval } from './leaderDecision';

test('interviewRequirementFor maps each decision', () => {
  assert.equal(interviewRequirementFor('approved'), 'none');
  assert.equal(interviewRequirementFor('rejected'), 'none');
  assert.equal(interviewRequirementFor('approved-interview'), 'standard');
  assert.equal(interviewRequirementFor('approved-psychologist'), 'psychologist');
});

test('isTerminalApproval only for direct approval', () => {
  assert.equal(isTerminalApproval('approved'), true);
  assert.equal(isTerminalApproval('rejected'), false);
  assert.equal(isTerminalApproval('approved-interview'), false);
  assert.equal(isTerminalApproval('approved-psychologist'), false);
});

test('phase-1 approved is terminal with no interview', () => {
  const result = computeLeaderResponse({ decision: 'approved', hasComment: false });
  assert.ok(result.ok);
  assert.equal(result.plan.leaderApproval, 'approved');
  assert.deepEqual(result.plan.interview, { required: 'none' });
  assert.equal(result.plan.terminalApproval, true);
});

test('phase-1 rejected is terminal, not an approval', () => {
  const result = computeLeaderResponse({ decision: 'rejected', hasComment: false });
  assert.ok(result.ok);
  assert.equal(result.plan.terminalApproval, false);
  assert.deepEqual(result.plan.interview, { required: 'none' });
});

test('phase-1 interview decisions open an awaiting thread and are NOT terminal', () => {
  const standard = computeLeaderResponse({ decision: 'approved-interview', hasComment: false });
  assert.ok(standard.ok);
  assert.deepEqual(standard.plan.interview, { required: 'standard', status: 'awaiting' });
  assert.equal(standard.plan.terminalApproval, false);

  const psych = computeLeaderResponse({ decision: 'approved-psychologist', hasComment: false });
  assert.ok(psych.ok);
  assert.deepEqual(psych.plan.interview, { required: 'psychologist', status: 'awaiting' });
  assert.equal(psych.plan.terminalApproval, false);
});

test('phase-2 outcome requires a pending interview', () => {
  const none = computeLeaderResponse({ interviewOutcome: 'approved', currentInterviewRequired: 'none', hasComment: false });
  assert.equal(none.ok, false);
  assert.equal(none.ok === false && none.error, 'no-interview-pending');

  const missing = computeLeaderResponse({ interviewOutcome: 'approved', currentInterviewRequired: null, hasComment: false });
  assert.equal(missing.ok, false);
});

test('phase-2 approved is terminal, rejected is not', () => {
  const approved = computeLeaderResponse({ interviewOutcome: 'approved', currentInterviewRequired: 'standard', hasComment: false });
  assert.ok(approved.ok);
  assert.deepEqual(approved.plan.interview, { required: 'standard', status: 'approved', resolved: true });
  assert.equal(approved.plan.terminalApproval, true);

  const rejected = computeLeaderResponse({ interviewOutcome: 'rejected', currentInterviewRequired: 'psychologist', hasComment: false });
  assert.ok(rejected.ok);
  assert.deepEqual(rejected.plan.interview, { required: 'psychologist', status: 'rejected', resolved: true });
  assert.equal(rejected.plan.terminalApproval, false);
});

test('invalid decision / outcome / empty are rejected', () => {
  assert.equal(computeLeaderResponse({ decision: 'maybe', hasComment: false }).ok, false);
  assert.equal(computeLeaderResponse({ interviewOutcome: 'meh', currentInterviewRequired: 'standard', hasComment: false }).ok, false);
  const empty = computeLeaderResponse({ hasComment: false });
  assert.equal(empty.ok, false);
  assert.equal(empty.ok === false && empty.error, 'empty');
});

test('a comment alone is enough (no decision/outcome)', () => {
  const result = computeLeaderResponse({ hasComment: true });
  assert.ok(result.ok);
  assert.equal(result.plan.terminalApproval, false);
  assert.equal(result.plan.leaderApproval, undefined);
  assert.equal(result.plan.interview, undefined);
});
