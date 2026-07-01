import { httpsCallable } from 'firebase/functions';

import { functions } from './firebase';

// Payment-review client + types. Mirrors leaderReview.ts but for the administration
// mailbox (amministrazione@stellazzurra.org) verifying the payment via a token link.

export type PaymentDecision = 'approved' | 'rejected';

export type PaymentView = {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
  church: string;
  attendanceMode: 'lodging' | 'meals' | 'spiritual' | null;
  contribution: {
    nights: number;
    lodging: number;
    spiritualWorks: number;
    extras: number;
    total: number;
  };
  paymentProofName: string | null;
  paymentProofUrl: string | null;
  leaderApproval: 'approved' | 'approved-interview' | 'approved-psychologist' | 'rejected' | null;
  paymentApproval: PaymentDecision | null;
  paymentApprovalRespondedAt: number | null;
  status: string;
};

const paymentViewCallable = httpsCallable<{ id: string; token: string; eventId?: string }, PaymentView>(
  functions,
  'paymentView'
);

const paymentRespondCallable = httpsCallable<
  { id: string; token: string; eventId?: string; decision: PaymentDecision },
  PaymentView
>(functions, 'paymentRespond');

export async function fetchPaymentView(args: { id: string; token: string; eventId?: string }) {
  const result = await paymentViewCallable(args);
  return result.data;
}

export async function submitPaymentResponse(args: {
  id: string;
  token: string;
  eventId?: string;
  decision: PaymentDecision;
}) {
  const result = await paymentRespondCallable(args);
  return result.data;
}
