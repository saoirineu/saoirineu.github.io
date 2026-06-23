// Pure, dependency-free two-phase leader decision state machine (Part 2, §7.2).
// Extracted from the leaderRespond callable so the transitions are unit-testable
// without a Firestore/functions harness. The callable wraps this with timestamps/comments/consent.

export type LeaderDecision = 'approved' | 'approved-interview' | 'approved-psychologist' | 'rejected';
export type InterviewOutcome = 'approved' | 'rejected';
export type InterviewRequirement = 'none' | 'standard' | 'psychologist';

export const LEADER_DECISIONS: LeaderDecision[] = ['approved', 'approved-interview', 'approved-psychologist', 'rejected'];

export function interviewRequirementFor(decision: LeaderDecision): InterviewRequirement {
  if (decision === 'approved-interview') return 'standard';
  if (decision === 'approved-psychologist') return 'psychologist';
  return 'none';
}

// Phase-1 decisions that are terminal approvals (stamp the consent ledger immediately).
export function isTerminalApproval(decision: LeaderDecision): boolean {
  return decision === 'approved';
}

export type LeaderResponseError = 'invalid-decision' | 'invalid-outcome' | 'no-interview-pending' | 'empty';

export type PlannedInterview = {
  required: InterviewRequirement;
  status?: 'awaiting' | 'approved' | 'rejected';
  resolved?: boolean; // when true, the caller stamps resolvedAt/resolvedBy
};

export type LeaderResponsePlan = {
  leaderApproval?: LeaderDecision; // present ⇒ caller also stamps leaderApprovalRespondedAt
  interview?: PlannedInterview;
  terminalApproval: boolean;
};

export type LeaderResponseInput = {
  decision?: string | null;
  interviewOutcome?: string | null;
  currentInterviewRequired?: string | null; // existing registration's interview.required
  hasComment: boolean;
};

export function computeLeaderResponse(
  input: LeaderResponseInput
): { ok: true; plan: LeaderResponsePlan } | { ok: false; error: LeaderResponseError } {
  const plan: LeaderResponsePlan = { terminalApproval: false };
  let touched = input.hasComment;

  // Phase 1: the reference church's initial decision.
  if (input.decision != null && input.decision !== '') {
    if (!LEADER_DECISIONS.includes(input.decision as LeaderDecision)) {
      return { ok: false, error: 'invalid-decision' };
    }
    const decision = input.decision as LeaderDecision;
    const requirement = interviewRequirementFor(decision);
    plan.leaderApproval = decision;
    plan.interview = requirement === 'none' ? { required: 'none' } : { required: requirement, status: 'awaiting' };
    plan.terminalApproval = isTerminalApproval(decision);
    touched = true;
  }

  // Phase 2: the reference church confirms membership after the interview.
  if (input.interviewOutcome != null && input.interviewOutcome !== '') {
    if (input.interviewOutcome !== 'approved' && input.interviewOutcome !== 'rejected') {
      return { ok: false, error: 'invalid-outcome' };
    }
    if (!input.currentInterviewRequired || input.currentInterviewRequired === 'none') {
      return { ok: false, error: 'no-interview-pending' };
    }
    const outcome = input.interviewOutcome as InterviewOutcome;
    plan.interview = {
      required: input.currentInterviewRequired as InterviewRequirement,
      status: outcome,
      resolved: true
    };
    if (outcome === 'approved') plan.terminalApproval = true;
    touched = true;
  }

  if (!touched) return { ok: false, error: 'empty' };
  return { ok: true, plan };
}
