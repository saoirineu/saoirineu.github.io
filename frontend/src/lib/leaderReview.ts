import { httpsCallable } from 'firebase/functions';

import { functions } from './firebase';

// Leader-review client + shared types. Used by the generic events flow
// (LeaderReviewPage, eventRegistrations); previously lived in europeanGathering.ts.

export type LeaderApprovalDecision = 'approved' | 'approved-interview' | 'approved-psychologist' | 'rejected';

export type InterviewRequirement = 'standard' | 'psychologist';
export type InterviewStatus = 'awaiting' | 'approved' | 'rejected';
export type InterviewOutcome = 'approved' | 'rejected';

export type RegistrationInterview = {
  required: InterviewRequirement;
  status: InterviewStatus;
  resolvedAt?: Date | null;
  resolvedBy?: string;
};

export type LeaderComment = {
  text: string;
  at: Date | null;
};

export type LeaderView = {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
  church: string;
  centerLeader: string;
  isInitiated: boolean;
  isIcefluMember: boolean;
  isNovice: boolean;
  attendanceMode: 'lodging' | 'meals' | 'spiritual' | null;
  checkIn: string | null;
  checkOut: string | null;
  selectedWorks: string[];
  contribution: {
    nights: number;
    lodging: number;
    spiritualWorks: number;
    extras: number;
    total: number;
  };
  leaderApproval: LeaderApprovalDecision | null;
  leaderApprovalRespondedAt: number | null;
  interview: {
    required: InterviewRequirement;
    status: InterviewStatus;
    resolvedAt: number | null;
  } | null;
  leaderComments: Array<{ text: string; at: number | null }>;
};

const leaderViewCallable = httpsCallable<{ id: string; token: string; eventId?: string }, LeaderView>(
  functions,
  'leaderView'
);

const leaderRespondCallable = httpsCallable<
  { id: string; token: string; eventId?: string; comment?: string; decision?: LeaderApprovalDecision; interviewOutcome?: InterviewOutcome },
  LeaderView
>(functions, 'leaderRespond');

export async function fetchLeaderView(args: { id: string; token: string; eventId?: string }) {
  const result = await leaderViewCallable(args);
  return result.data;
}

export async function submitLeaderResponse(args: {
  id: string;
  token: string;
  eventId?: string;
  comment?: string;
  decision?: LeaderApprovalDecision;
  interviewOutcome?: InterviewOutcome;
}) {
  const result = await leaderRespondCallable(args);
  return result.data;
}
