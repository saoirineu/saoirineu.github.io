import type { VerificationDelivery } from '../../providers/auth-context';

// What the confirmation modal says after an attempt to mail the link, and how long the
// resend button waits. Firebase refuses confirmation links requested in quick succession
// (auth/too-many-requests), and a person who clicks "resend" twice in a minute makes
// both routes fail; the cooldown keeps the button from causing that.

export const RESEND_COOLDOWN_MS = 60 * 1000;
export const TOO_MANY_COOLDOWN_MS = 5 * 60 * 1000;

export function verificationCooldownMs(result: VerificationDelivery) {
  return result.state === 'failed' && result.tooMany ? TOO_MANY_COOLDOWN_MS : RESEND_COOLDOWN_MS;
}

export type VerificationAttempt = { source: 'signup' | 'resend'; result: VerificationDelivery };

export type VerificationView = {
  /** Main text: link sent, sending retried automatically, or nothing went out. */
  body: 'sent' | 'queued' | 'failed';
  /** Line under the resend button, if any. */
  notice: 'sent' | 'error' | 'too-many' | null;
  showDetail: boolean;
};

export function verificationView(attempt: VerificationAttempt | null): VerificationView {
  // Opened for an unconfirmed sign-in: nothing was attempted in this visit.
  if (!attempt) return { body: 'sent', notice: null, showDetail: false };

  const { source, result } = attempt;
  const failedNotice = result.state === 'failed' ? (result.tooMany ? 'too-many' : 'error') : null;

  return {
    body: result.state,
    notice: source === 'resend'
      ? (result.state === 'sent' ? 'sent' : failedNotice)
      : (failedNotice === 'too-many' ? 'too-many' : null),
    showDetail: result.state === 'failed' && !!result.detail
  };
}

export function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
