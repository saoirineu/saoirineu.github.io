// Outbound mail queue: the decisions, kept pure so they are testable without Firestore.
//
// Every portal email is written to mailQueue/{id} and attempted at once. The relay on
// the santodaime.it hosting sits behind a bot protection that intermittently refuses
// requests from Google Cloud (a 403 challenge page, or a connection that never opens),
// so a single attempt used to lose the email. A queued email is retried on a schedule
// until it is delivered, stops being relevant (its guard fails), or expires.

export type MailKind =
  | 'verification'
  | 'user-approved'
  | 'user-needs-info'
  | 'approval-pending'
  | 'registration-approved'
  | 'leader-review'
  | 'leader-self-nominated'
  | 'applicant-outcome'
  | 'payment-review';

/**
 * Condition re-checked before every attempt, so a late email never contradicts the
 * current state (an "approved" email after the admin changed their mind, a confirmation
 * link for an address that is already confirmed).
 */
export type MailGuard =
  | { type: 'docField'; path: string; field: string; oneOf: (string | null)[] }
  | { type: 'emailUnverified'; uid: string };

export type MailStatus = 'pending' | 'sent' | 'cancelled' | 'failed';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** While one attempt runs, nobody else may claim the email. Longer than a relay timeout. */
export const ATTEMPT_LEASE_MS = 2 * MINUTE_MS;

/**
 * Minutes to wait after the n-th failed attempt (1-based). Short at first, because the
 * relay's refusals are intermittent and the next request often gets through; then
 * hourly, for as long as the email stays alive.
 *
 * A confirmation email waits longer before its first retry: the login page falls back
 * to Firebase's own confirmation email straight away, and most people have used that
 * link by then, which cancels the retry instead of sending a second message.
 */
const RETRY_MINUTES: Record<'default' | 'verification', number[]> = {
  default: [2, 5, 10, 15, 30, 60],
  verification: [10, 20, 30, 60]
};

export function retryDelayMs(kind: MailKind, failedAttempts: number): number {
  const schedule = RETRY_MINUTES[kind === 'verification' ? 'verification' : 'default'];
  const index = Math.min(Math.max(failedAttempts, 1), schedule.length) - 1;
  return schedule[index] * MINUTE_MS;
}

/** Pause before the second attempt made while the caller waits. */
export const IMMEDIATE_RETRY_DELAY_MS = 2 * 1000;

/**
 * Delay before the next scheduled retry. Attempts made on the spot (the first one, and
 * the quick second try while someone waits) do not advance the schedule: after both
 * fail, a confirmation email still waits 10 minutes, not 20.
 */
export function nextRetryDelayMs(kind: MailKind, args: { attempts: number; immediateAttempts: number }): number {
  return retryDelayMs(kind, args.attempts - args.immediateAttempts + 1);
}

/**
 * How long an email is worth retrying. A confirmation link is only useful while the
 * person is still waiting for it; review links carry their own 60-day token, but a
 * week-old review request is better re-issued by a person than sent late.
 */
export function mailLifetimeMs(kind: MailKind): number {
  switch (kind) {
    case 'verification':
      return 24 * HOUR_MS;
    case 'leader-review':
    case 'payment-review':
      return 7 * 24 * HOUR_MS;
    default:
      return 3 * 24 * HOUR_MS;
  }
}

export type AttemptDecision = 'attempt' | 'not-due' | 'closed' | 'expire';

/** Whether a queued email should be attempted now. */
export function decideAttempt(args: {
  now: number;
  status: MailStatus | undefined;
  nextAttemptAt: number | null;
  expiresAt: number | null;
}): AttemptDecision {
  if (args.status !== 'pending') return 'closed';
  if (args.expiresAt !== null && args.now >= args.expiresAt) return 'expire';
  if (args.nextAttemptAt !== null && args.nextAttemptAt > args.now) return 'not-due';
  return 'attempt';
}

/** A docField guard against the document it names; a missing document or field reads as null. */
export function docFieldGuardAllows(
  guard: Extract<MailGuard, { type: 'docField' }>,
  document: { exists: boolean; data?: Record<string, unknown> }
): boolean {
  if (!document.exists) return false;
  const value = document.data?.[guard.field];
  const normalized = typeof value === 'string' ? value : value === undefined || value === null ? null : String(value);
  return guard.oneOf.includes(normalized);
}

/**
 * A short, log-friendly reason for a failed send. Node's fetch reports every network
 * problem as "fetch failed" and hides the useful part in `cause`; the hosting's
 * challenge page is a whole HTML document where only the title matters.
 */
export function describeSendError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const cause = (error as Error & { cause?: unknown }).cause as { code?: unknown; message?: unknown } | undefined;
  const causeText = cause
    ? [cause.code, cause.message].filter(part => typeof part === 'string' && part).join(': ')
    : '';

  const title = error.message.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
  const base = title ? `${error.message.split(':')[0]}: "${title}"` : error.message.split('\n')[0];

  return (causeText ? `${base} (${causeText})` : base).slice(0, 300);
}
