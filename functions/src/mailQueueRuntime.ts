// The outbound mail queue against Firestore. Dependencies are injected so the claim,
// retry, guard and expiry behaviour can be exercised on the emulator with a fake relay
// (see mailQueueRuntime.emulator.ts); index.ts wires in the real ones.

import { FieldValue, Timestamp, type DocumentReference, type Firestore } from 'firebase-admin/firestore';

import {
  ATTEMPT_LEASE_MS,
  IMMEDIATE_RETRY_DELAY_MS,
  decideAttempt,
  describeSendError,
  docFieldGuardAllows,
  mailLifetimeMs,
  nextRetryDelayMs,
  type MailGuard,
  type MailKind
} from './mailQueue';

export type PortalMail = { to: string | string[]; subject: string; text: string };
export type QueueOutcome = 'sent' | 'queued' | 'cancelled' | 'failed' | 'skipped';

export type MailQueueDeps = {
  db: Firestore;
  /** Hands one email to the relay; throws when the relay does not accept it. */
  send: (mail: { to: string[]; subject: string; text: string }) => Promise<void>;
  /** Whether the account's address is confirmed; null when the account is gone. */
  isEmailVerified: (uid: string) => Promise<boolean | null>;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  log?: Pick<Console, 'log' | 'warn' | 'error'>;
};

export function createMailQueue(deps: MailQueueDeps) {
  const now = deps.now ?? (() => Date.now());
  const sleep = deps.sleep ?? (ms => new Promise<void>(resolve => setTimeout(resolve, ms)));
  const log = deps.log ?? console;
  const collection = () => deps.db.collection('mailQueue');

  const millis = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : null);

  async function guardAllows(guard: MailGuard | null | undefined): Promise<boolean> {
    if (!guard) return true;
    if (guard.type === 'emailUnverified') {
      return (await deps.isEmailVerified(guard.uid)) === false;
    }
    const snapshot = await deps.db.doc(guard.path).get();
    return docFieldGuardAllows(guard, { exists: snapshot.exists, data: snapshot.data() });
  }

  /**
   * Attempts one queued email if it is due. The claim happens in a transaction that
   * pushes nextAttemptAt out by a lease, so the immediate attempt and the scheduled
   * retry never send the same email at the same time; if an attempt dies midway, the
   * lease runs out and the next retry picks the email up again.
   */
  async function attempt(
    ref: DocumentReference,
    options: { immediate?: boolean; ignoreSchedule?: boolean } = {}
  ): Promise<QueueOutcome> {
    const startedAt = now();
    const claim = await deps.db.runTransaction(async transaction => {
      const data = (await transaction.get(ref)).data();
      if (!data) return null;

      const decision = decideAttempt({
        now: startedAt,
        status: data.status,
        // The quick second try runs right after our own failed attempt set the schedule.
        nextAttemptAt: options.ignoreSchedule ? null : millis(data.nextAttemptAt),
        expiresAt: millis(data.expiresAt)
      });
      if (decision === 'expire') {
        transaction.update(ref, {
          status: 'failed',
          closedReason: 'expired',
          nextAttemptAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp()
        });
        return { decision, data };
      }
      if (decision !== 'attempt') return { decision, data };

      const attemptsBefore = typeof data.attempts === 'number' ? data.attempts : 0;
      const attempts = attemptsBefore + 1;
      // Emails queued before this field existed had exactly one immediate attempt.
      const immediateBefore = typeof data.immediateAttempts === 'number' ? data.immediateAttempts : Math.min(attemptsBefore, 1);
      const immediateAttempts = immediateBefore + (options.immediate ? 1 : 0);
      transaction.update(ref, {
        attempts,
        immediateAttempts,
        nextAttemptAt: Timestamp.fromMillis(startedAt + ATTEMPT_LEASE_MS),
        updatedAt: FieldValue.serverTimestamp()
      });
      return { decision, data, attempts, immediateAttempts };
    });

    if (!claim) return 'skipped';
    const { decision, data } = claim;
    const kind = data.kind as MailKind;

    if (decision === 'expire') {
      // Searchable marker: an email nobody received. Recipients stay in the queue document.
      log.error(`MAIL_GAVE_UP ${ref.id} (${kind}) after ${data.attempts ?? 0} attempts: ${data.lastError ?? 'unknown error'}`);
      return 'failed';
    }
    if (decision !== 'attempt') {
      return data.status === 'sent' || data.status === 'cancelled' || data.status === 'failed' ? data.status : 'skipped';
    }

    const attempts = claim.attempts ?? 1;

    if (!(await guardAllows(data.guard))) {
      await ref.update({
        status: 'cancelled',
        closedReason: 'no-longer-relevant',
        nextAttemptAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp()
      });
      log.log(`MAIL_CANCELLED ${ref.id} (${kind}): no longer relevant`);
      return 'cancelled';
    }

    try {
      await deps.send({ to: data.to, subject: data.subject, text: data.text });
    } catch (error) {
      const reason = describeSendError(error);
      const nextAttemptAt = startedAt + nextRetryDelayMs(kind, { attempts, immediateAttempts: claim.immediateAttempts ?? 1 });
      await ref.update({
        nextAttemptAt: Timestamp.fromMillis(nextAttemptAt),
        lastError: reason,
        lastErrorAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      log.warn(`MAIL_RETRY_SCHEDULED ${ref.id} (${kind}) attempt ${attempts} failed: ${reason}; next attempt ${new Date(nextAttemptAt).toISOString()}`);
      return 'queued';
    }

    await ref.update({
      status: 'sent',
      sentAt: FieldValue.serverTimestamp(),
      nextAttemptAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    });
    if (attempts > 1) {
      log.log(`MAIL_DELIVERED_AFTER_RETRY ${ref.id} (${kind}) on attempt ${attempts}`);
    }
    return 'sent';
  }

  /**
   * The only way portal code sends mail: queue the email, then try it at once. When the
   * relay refuses, retryDue keeps trying until the email is delivered, its guard says it
   * no longer applies, or it expires.
   *
   * `id` makes queueing idempotent: triggers pass one derived from the event, so a
   * redelivered event finds its email already queued instead of sending it twice.
   * `replace` overwrites a previous email with the same id (a newer confirmation link).
   * `retryAtOnce` makes a second attempt two seconds after a refusal, before leaving the
   * email to the schedule: the hosting's refusals are often per request.
   */
  async function deliverOrQueue(
    mail: PortalMail,
    options: { kind: MailKind; id?: string; guard?: MailGuard; replace?: boolean; retryAtOnce?: boolean }
  ): Promise<QueueOutcome> {
    const ref = options.id ? collection().doc(options.id.replace(/\//g, '_')) : collection().doc();
    const createdAt = now();
    const document = {
      kind: options.kind,
      to: Array.isArray(mail.to) ? mail.to : [mail.to],
      subject: mail.subject,
      text: mail.text,
      guard: options.guard ?? null,
      status: 'pending',
      attempts: 0,
      immediateAttempts: 0,
      nextAttemptAt: Timestamp.fromMillis(createdAt),
      expiresAt: Timestamp.fromMillis(createdAt + mailLifetimeMs(options.kind)),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    if (options.replace) {
      await ref.set(document);
    } else {
      try {
        await ref.create(document);
      } catch (error) {
        // gRPC ALREADY_EXISTS: this event was delivered before and its email is queued.
        if ((error as { code?: unknown }).code === 6) return 'skipped';
        throw error;
      }
    }

    const outcome = await attempt(ref, { immediate: true });
    if (outcome !== 'queued' || !options.retryAtOnce) return outcome;

    await sleep(IMMEDIATE_RETRY_DELAY_MS);
    return attempt(ref, { immediate: true, ignoreSchedule: true });
  }

  /** Attempts every email whose next attempt is due. One at a time: the relay caps the domain at 120 an hour. */
  async function retryDue(limit = 25): Promise<Record<QueueOutcome, number>> {
    const due = await collection()
      .where('nextAttemptAt', '<=', Timestamp.fromMillis(now()))
      .orderBy('nextAttemptAt')
      .limit(limit)
      .get();

    const counts: Record<QueueOutcome, number> = { sent: 0, queued: 0, cancelled: 0, failed: 0, skipped: 0 };
    for (const doc of due.docs) {
      try {
        counts[await attempt(doc.ref)] += 1;
      } catch (error) {
        log.error(`Queued mail ${doc.id} could not be processed`, error);
      }
    }
    return counts;
  }

  return { deliverOrQueue, attempt, retryDue };
}
