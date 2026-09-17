import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';

import { computeLeaderResponse, LEADER_DECISIONS, type LeaderDecision } from './leaderDecision';
import { signReviewToken, verifyReviewToken, type TokenVerdict } from './reviewToken';
import { evaluateThrottle, type ThrottleState } from './mailThrottle';
import { isSelfNominatedLeader } from './leaderReference';
import { computeCapacityRows, eventCapacityBuckets } from './eventCapacity';
import { sameWorkExit, workExitTransaction, workExitTransactionId } from './workSacrament';
import type { MailGuard } from './mailQueue';
import { createMailQueue, type QueueOutcome } from './mailQueueRuntime';

initializeApp();

const mailRelayToken = defineSecret('MAIL_RELAY_TOKEN');
// Endpoint on the santodaime.it hosting account (see scripts/portal-mail/).
const MAIL_RELAY_URL = 'https://www.santodaime.it/portal-mail/relay.php';
const leaderTokenSecret = defineSecret('LEADER_TOKEN_SECRET');

/** Everything a mail-sending function needs declared on it. */
const MAIL_SECRETS = [mailRelayToken];
const appBaseUrl = defineString('APP_BASE_URL', { default: 'https://saoirineu.github.io' });

// Always-on recipients of the "new ICEFLU registration pending" admin notice.
// Admins can add more via the settings/notifications doc (see loadNotificationRecipients).
const BASELINE_NOTIFY = ['info@santodaime.it', 'stellazzurra@santodaime.it'];

// Administration mailbox that verifies the payment for event registrations.
const PAYMENT_ADMIN_EMAIL = 'amministrazione@stellazzurra.org';

type LeaderComment = {
  text: string;
  at: Timestamp;
};

// Leader token is scoped to events/{eventId}/registrations/{registrationId}.
function leaderTokenPayload(registrationId: string, leaderEmail: string, eventId: string) {
  const email = leaderEmail.trim().toLowerCase();
  return `${eventId}:${registrationId}:${email}`;
}

// Payment token is scoped to the administration mailbox for a given registration.
function paymentTokenPayload(registrationId: string, eventId: string) {
  return `payment:${eventId}:${registrationId}:${PAYMENT_ADMIN_EMAIL}`;
}

function signLeaderToken(registrationId: string, leaderEmail: string, secret: string, eventId: string) {
  return signReviewToken(leaderTokenPayload(registrationId, leaderEmail, eventId), secret, Date.now());
}

function signPaymentToken(registrationId: string, secret: string, eventId: string) {
  return signReviewToken(paymentTokenPayload(registrationId, eventId), secret, Date.now());
}

/** Turns a verdict into the error the review pages can explain to a person. */
function assertTokenAccepted(verdict: TokenVerdict) {
  if (verdict === 'valid') return;
  if (verdict === 'expired') {
    throw new HttpsError(
      'deadline-exceeded',
      'This review link has expired. Ask the portal administration for a fresh one.',
      { reason: 'token-expired' }
    );
  }
  throw new HttpsError('permission-denied', 'Invalid token.');
}

function buildLeaderReviewUrl(registrationId: string, token: string, eventId: string) {
  const base = appBaseUrl.value().replace(/\/$/, '');
  return `${base}/leader-review/${registrationId}?t=${token}&e=${encodeURIComponent(eventId)}`;
}

function buildPaymentReviewUrl(registrationId: string, token: string, eventId: string) {
  const base = appBaseUrl.value().replace(/\/$/, '');
  return `${base}/payment-review/${registrationId}?t=${token}&e=${encodeURIComponent(eventId)}`;
}

type LeaderEmailLocale = 'pt' | 'en' | 'es' | 'it';

function normalizeLeaderEmailLocale(value: unknown): LeaderEmailLocale {
  return value === 'pt' || value === 'en' || value === 'es' || value === 'it' ? value : 'it';
}

const leaderEmailByLocale: Record<
  LeaderEmailLocale,
  (args: { leaderName: string; reviewUrl: string }) => string
> = {
  it: ({ leaderName, reviewUrl }) =>
    [
      `Caro ${leaderName},`,
      ``,
      `hai ricevuto questa email perché qualcuno che fa riferimento alla vostra chiesa si vuole iscrivere all'Encontro Europeu, e tu devi approvare o meno tale iscrizione a questo link:`,
      reviewUrl,
      ``,
      `Grazie`,
    ].join('\n'),
  pt: ({ leaderName, reviewUrl }) =>
    [
      `Caro(a) ${leaderName},`,
      ``,
      `você recebeu este e-mail porque alguém que faz referência à sua igreja deseja se inscrever no Encontro Europeu, e cabe a você aprovar ou não essa inscrição neste link:`,
      reviewUrl,
      ``,
      `Obrigado`,
    ].join('\n'),
  en: ({ leaderName, reviewUrl }) =>
    [
      `Dear ${leaderName},`,
      ``,
      `you received this email because someone who refers to your church wishes to register for the Encontro Europeu, and it is up to you to approve or not this registration at this link:`,
      reviewUrl,
      ``,
      `Thank you`,
    ].join('\n'),
  es: ({ leaderName, reviewUrl }) =>
    [
      `Estimado(a) ${leaderName},`,
      ``,
      `has recibido este correo porque alguien que hace referencia a tu iglesia desea inscribirse en el Encontro Europeu, y te corresponde aprobar o no dicha inscripción en este enlace:`,
      reviewUrl,
      ``,
      `Gracias`,
    ].join('\n'),
};

function buildLeaderEmailBody(args: { leaderName: string; reviewUrl: string; locale: LeaderEmailLocale }) {
  return leaderEmailByLocale[args.locale]({ leaderName: args.leaderName, reviewUrl: args.reviewUrl });
}

// Applicant-facing email when the reference church makes its initial decision.
// 'interview' covers both approved-interview and approved-psychologist.
type ApplicantOutcome = 'approved' | 'interview' | 'rejected';

function leaderDecisionToApplicantOutcome(decision: string): ApplicantOutcome | null {
  if (decision === 'approved') return 'approved';
  if (decision === 'approved-interview' || decision === 'approved-psychologist') return 'interview';
  if (decision === 'rejected') return 'rejected';
  return null;
}

const applicantOutcomeEmail: Record<LeaderEmailLocale, Record<ApplicantOutcome, { subject: string; body: string }>> = {
  it: {
    approved: { subject: 'Iscrizione approvata — Encontro Europeu', body: 'La tua iscrizione è stata approvata.' },
    interview: {
      subject: 'Iscrizione in sospeso — Encontro Europeu',
      body: 'La tua iscrizione è in sospeso perché prima devi fare il colloquio conoscitivo preliminare. Entra in contatto col centro di riferimento per fare il colloquio.',
    },
    rejected: {
      subject: 'Iscrizione rifiutata — Encontro Europeu',
      body: 'La tua iscrizione è stata rifiutata; per maggiori chiarimenti cerca il tuo centro di riferimento.',
    },
  },
  pt: {
    approved: { subject: 'Inscrição aprovada — Encontro Europeu', body: 'A sua inscrição foi aprovada.' },
    interview: {
      subject: 'Inscrição em suspenso — Encontro Europeu',
      body: 'A sua inscrição está em suspenso porque primeiro você precisa fazer a entrevista de conhecimento preliminar. Entre em contato com o centro de referência para fazer a entrevista.',
    },
    rejected: {
      subject: 'Inscrição rejeitada — Encontro Europeu',
      body: 'A sua inscrição foi rejeitada; para mais esclarecimentos procure o seu centro de referência.',
    },
  },
  en: {
    approved: { subject: 'Registration approved — Encontro Europeu', body: 'Your registration has been approved.' },
    interview: {
      subject: 'Registration on hold — Encontro Europeu',
      body: 'Your registration is on hold because you first need to have the preliminary introductory interview. Get in touch with your reference center to arrange the interview.',
    },
    rejected: {
      subject: 'Registration rejected — Encontro Europeu',
      body: 'Your registration has been rejected; for further clarification please contact your reference center.',
    },
  },
  es: {
    approved: { subject: 'Inscripción aprobada — Encontro Europeu', body: 'Tu inscripción ha sido aprobada.' },
    interview: {
      subject: 'Inscripción en suspenso — Encontro Europeu',
      body: 'Tu inscripción está en suspenso porque primero debes hacer la entrevista de conocimiento preliminar. Ponte en contacto con tu centro de referencia para hacer la entrevista.',
    },
    rejected: {
      subject: 'Inscripción rechazada — Encontro Europeu',
      body: 'Tu inscripción ha sido rechazada; para más aclaraciones busca tu centro de referencia.',
    },
  },
};

// Email to the administration mailbox (payment verification), sent after the reference
// church approves. It carries the token-gated link to verify the payment and approve it.
function buildPaymentAdminEmail(args: { name: string; reviewUrl: string }) {
  return [
    `Iscrizione approvata dal dirigente per: ${args.name}.`,
    ``,
    `Ti inviamo il link per verificare che il pagamento sia in ordine e approvarlo:`,
    args.reviewUrl,
    ``,
    `Registration approved by the reference church for: ${args.name}.`,
    `Use the link above to verify the payment and approve it.`,
  ].join('\n');
}

// Final confirmation to the applicant once BOTH the reference church and the
// administration have approved.
const finalApprovalEmail: Record<LeaderEmailLocale, { subject: string; body: string }> = {
  it: {
    subject: 'Iscrizione confermata — Encontro Europeu',
    body: 'La tua iscrizione è stata approvata sia dal dirigente sia dall\'amministrazione ed è ora confermata. Puoi vederne lo stato nel portale.',
  },
  pt: {
    subject: 'Inscrição confirmada — Encontro Europeu',
    body: 'A sua inscrição foi aprovada tanto pelo dirigente quanto pela administração e está agora confirmada. Você pode ver o status no portal.',
  },
  en: {
    subject: 'Registration confirmed — Encontro Europeu',
    body: 'Your registration has been approved by both the reference church and the administration and is now confirmed. You can see its status in the portal.',
  },
  es: {
    subject: 'Inscripción confirmada — Encontro Europeu',
    body: 'Tu inscripción ha sido aprobada tanto por el dirigente como por la administración y ahora está confirmada. Puedes ver el estado en el portal.',
  },
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Spends one send from a named allowance, or reports that it is used up.
 *
 * The relay caps the whole domain at 120 messages an hour, so an unbounded
 * send path is not just spam — it locks every other portal email out for the
 * rest of the hour. Counters live in a collection no client rule grants access
 * to; only the admin SDK touches them.
 */
async function consumeMailAllowance(key: string, maxInWindow: number, windowMs: number): Promise<boolean> {
  const db = getFirestore();
  const ref = db.collection('mailThrottle').doc(key.replace(/\//g, '_'));

  try {
    return await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const data = snapshot.data();
      const state: ThrottleState | null =
        data && typeof data.windowStart === 'number' && typeof data.count === 'number'
          ? { windowStart: data.windowStart, count: data.count }
          : null;

      const decision = evaluateThrottle({ now: Date.now(), windowMs, maxInWindow, state });
      transaction.set(ref, {
        ...decision.next,
        updatedAt: FieldValue.serverTimestamp()
      });
      return decision.allowed;
    });
  } catch (error) {
    // Bookkeeping trouble must not silence real mail; the relay's own limiter
    // is still behind this.
    console.error(`Mail allowance check failed for ${key}`, error);
    return true;
  }
}

/**
 * Hands a message to the relay running on the santodaime.it hosting account,
 * which posts it to the local MTA. Talking SMTP straight from here does not
 * work: Serverplan rejects Google's egress at RCPT TO (`550 ... SPauthBL`) and
 * firewalls it outright from some regions. The relay shares the machine with
 * the mail server, so no cloud IP appears in the path and the message is
 * DKIM-signed as info@santodaime.it on the way out.
 */
async function sendPortalMail(message: { to: string | string[]; subject: string; text: string }) {
  const response = await fetch(MAIL_RELAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Relay-Token': mailRelayToken.value(),
      // Node's default agent string reads as a bot to the hosting's protection.
      'User-Agent': 'SaoIrineuPortal/1.0 (+https://saoirineu.github.io)',
    },
    body: JSON.stringify({ to: message.to, subject: message.subject, text: message.text }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Mail relay responded ${response.status}: ${detail.slice(0, 300)}`);
  }
}

const mailQueue = createMailQueue({
  db: getFirestore(),
  send: sendPortalMail,
  isEmailVerified: async uid => {
    try {
      return (await getAuth().getUser(uid)).emailVerified;
    } catch {
      return null; // the account no longer exists
    }
  },
});
const deliverOrQueue = mailQueue.deliverOrQueue;

/** Retries queued emails the relay refused. Nothing due costs one small query. */
export const retryQueuedMail = onSchedule(
  { schedule: 'every 5 minutes', secrets: MAIL_SECRETS, timeoutSeconds: 300 },
  async () => {
    await mailQueue.retryDue();
  }
);

// Recipients of the admin "registration pending" notice: the always-on baseline
// plus the users and extra emails admins configure in settings/notifications
// (managed from the /admin/users panel).
async function loadNotificationRecipients() {
  const db = getFirestore();
  const emails = new Set<string>(BASELINE_NOTIFY);

  const settings = (await db.doc('settings/notifications').get()).data() ?? {};

  const extraEmails = Array.isArray(settings.extraEmails) ? settings.extraEmails : [];
  extraEmails.forEach((email: unknown) => {
    if (typeof email === 'string' && email.trim()) emails.add(email.trim());
  });

  const recipientUserIds = (Array.isArray(settings.recipientUserIds) ? settings.recipientUserIds : [])
    .filter((id: unknown): id is string => typeof id === 'string' && !!id.trim());
  const userDocs = await Promise.all(
    recipientUserIds.map((id: string) => db.collection('users').doc(id).get())
  );
  userDocs.forEach(doc => {
    const email = doc.data()?.email;
    if (typeof email === 'string' && email.trim()) emails.add(email.trim());
  });

  return Array.from(emails);
}

function buildVerificationEmailText(link: string): string {
  return [
    'São Irineu',
    '',
    '────────────────────────────────',
    'Benvenuto/a su São Irineu!',
    '',
    'Clicca sul link qui sotto per confermare il tuo indirizzo email e attivare il tuo account:',
    link,
    '',
    'Se non hai creato questo account, puoi ignorare questa email.',
    '',
    '────────────────────────────────',
    'Bem-vindo/a ao São Irineu!',
    '',
    'Clique no link abaixo para confirmar o seu endereço de e-mail e activar a sua conta:',
    link,
    '',
    'Se não criou esta conta, pode ignorar este e-mail.',
    '',
    '────────────────────────────────',
    '¡Bienvenido/a a São Irineu!',
    '',
    'Haz clic en el enlace a continuación para confirmar tu dirección de correo electrónico y activar tu cuenta:',
    link,
    '',
    'Si no creaste esta cuenta, puedes ignorar este correo.',
    '',
    '────────────────────────────────',
    'Welcome to São Irineu!',
    '',
    'Click the link below to confirm your email address and activate your account:',
    link,
    '',
    'If you did not create this account, you can ignore this email.',
  ].join('\n');
}

function buildUserApprovalEmailBody(args: { uid: string; data: FirebaseFirestore.DocumentData; reviewUrl: string }) {
  const name = args.data.fullName ?? args.data.displayName ?? `${args.data.firstName ?? ''} ${args.data.surname ?? ''}`.trim() ?? '—';

  return [
    `A user profile is ready for administrative approval.`,
    ``,
    `Name: ${name || '—'}`,
    `Email: ${args.data.email ?? '—'}`,
    `UID: ${args.uid}`,
    `Identity document: ${args.data.identityDocumentPrimaryName ?? 'uploaded'}`,
    ``,
    `Review this registration here:`,
    args.reviewUrl,
  ].join('\n');
}

function profileDisplayName(data: FirebaseFirestore.DocumentData): string {
  const composed = `${data.firstName ?? ''} ${data.surname ?? ''}`.trim();
  const name = data.fullName ?? data.displayName ?? composed;
  return typeof name === 'string' ? name.trim() : '';
}

// Italian first: ICEFLU Italia is an Italian association and most members read
// it, so it should be the block they see without scrolling. Then pt, es, en,
// the same order every multilingual email in this file uses.
function buildUserApprovedEmailText(name: string, portalUrl: string): string {
  const hi = name ? ` ${name}` : '';
  return [
    'São Irineu',
    '',
    '────────────────────────────────',
    `Ciao${hi},`,
    '',
    'La tua iscrizione a ICEFLU è stata approvata. Il tuo profilo socio è ora attivo. Grazie!',
    '',
    'Accedi alla piattaforma São Irineu:',
    portalUrl,
    '',
    '────────────────────────────────',
    `Olá${hi},`,
    '',
    'A sua inscrição no ICEFLU foi aprovada. O seu perfil de associado está agora activo. Obrigado!',
    '',
    'Aceda à plataforma São Irineu:',
    portalUrl,
    '',
    '────────────────────────────────',
    `Hola${hi},`,
    '',
    'Su inscripción en ICEFLU ha sido aprobada. Su perfil de socio ya está activo. ¡Gracias!',
    '',
    'Acceda a la plataforma São Irineu:',
    portalUrl,
    '',
    '────────────────────────────────',
    `Hello${hi},`,
    '',
    'Your ICEFLU membership has been approved. Your member profile is now active. Thank you!',
    '',
    'Access the São Irineu platform:',
    portalUrl,
  ].join('\n');
}

function buildUserNeedsInfoEmailText(name: string, note: string, profileUrl: string): string {
  const hi = name ? ` ${name}` : '';
  const noteBlock = (label: string) => (note ? ['', `${label}: ${note}`] : []);
  return [
    'São Irineu',
    '',
    '────────────────────────────────',
    `Ciao${hi},`,
    '',
    "La tua iscrizione a ICEFLU necessita di revisione prima di poter essere approvata. Aggiorna il tuo profilo e invialo di nuovo per l'approvazione:",
    profileUrl,
    ...noteBlock("Nota dell'amministrazione"),
    '',
    '────────────────────────────────',
    `Olá${hi},`,
    '',
    'A sua inscrição no ICEFLU precisa de revisão antes de poder ser aprovada. Por favor, actualize o seu perfil e envie-o novamente para aprovação:',
    profileUrl,
    ...noteBlock('Nota da administração'),
    '',
    '────────────────────────────────',
    `Hola${hi},`,
    '',
    'Su inscripción en ICEFLU necesita revisión antes de poder ser aprobada. Actualice su perfil y vuelva a enviarlo para aprobación:',
    profileUrl,
    ...noteBlock('Nota de la administración'),
    '',
    '────────────────────────────────',
    `Hello${hi},`,
    '',
    'Your ICEFLU membership needs revision before it can be approved. Please update your profile and submit it again for approval:',
    profileUrl,
    ...noteBlock('Note from the administration'),
  ].join('\n');
}

// Emails the user when an admin decides on their ICEFLU profile: an approval
// confirmation, or a revision request (with the admin's note) for needs-info.
export const onUserApprovalDecision = onDocumentWritten(
  {
    document: 'users/{uid}',
    secrets: MAIL_SECRETS,
  },
  async event => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;

    const afterStatus = after.approvalStatus;
    if (afterStatus === before?.approvalStatus) return;
    if (afterStatus !== 'approved' && afterStatus !== 'needs-info') return;

    const email = typeof after.email === 'string' ? after.email.trim() : '';
    if (!email) return;

    const name = profileDisplayName(after);
    const portalUrl = appBaseUrl.value().replace(/\/$/, '');

    // Sent late, a decision email must still match the profile: an admin may have
    // changed their mind while the relay was refusing mail.
    const guard: MailGuard = { type: 'docField', path: `users/${event.params.uid}`, field: 'approvalStatus', oneOf: [afterStatus] };

    if (afterStatus === 'approved') {
      await deliverOrQueue(
        {
          to: email,
          subject: 'Your ICEFLU membership has been approved — São Irineu',
          text: buildUserApprovedEmailText(name, portalUrl),
        },
        { kind: 'user-approved', id: `user-decision-${event.id}`, guard, retryAtOnce: true }
      );
      return;
    }

    const note = typeof after.adminNote === 'string' ? after.adminNote.trim() : '';
    const profileUrl = `${portalUrl}/profile`;
    await deliverOrQueue(
      {
        to: email,
        subject: 'Your ICEFLU membership needs revision — São Irineu',
        text: buildUserNeedsInfoEmailText(name, note, profileUrl),
      },
      { kind: 'user-needs-info', id: `user-decision-${event.id}`, guard, retryAtOnce: true }
    );
  }
);

// When BOTH the reference church (leaderApproval) and the administration
// (paymentApproval) have approved, mark the registration approved and email the
// applicant the final confirmation. Idempotent: once status flips to 'approved'
// the guard stops it from re-firing.
export const onRegistrationBothApproved = onDocumentWritten(
  {
    document: 'events/{eventId}/registrations/{id}',
    secrets: MAIL_SECRETS,
  },
  async event => {
    const after = event.data?.after.data();
    if (!after) return;

    const bothApproved = after.leaderApproval === 'approved' && after.paymentApproval === 'approved';
    if (!bothApproved || after.status === 'approved') return;

    await event.data!.after.ref.update({ status: 'approved' });

    const email = typeof after.email === 'string' ? after.email.trim() : '';
    if (!email) return;

    const locale = normalizeLeaderEmailLocale(after.locale);
    const message = finalApprovalEmail[locale];
    try {
      await deliverOrQueue(
        { to: email, subject: message.subject, text: message.body },
        {
          kind: 'registration-approved',
          id: `registration-approved-${event.id}`,
          retryAtOnce: true,
          guard: { type: 'docField', path: `events/${event.params.eventId}/registrations/${event.params.id}`, field: 'status', oneOf: ['approved'] },
        }
      );
    } catch (error) {
      console.error('Failed to queue final approval email', error);
    }
  }
);

export const onUserApprovalPending = onDocumentWritten(
  {
    document: 'users/{uid}',
    secrets: MAIL_SECRETS,
  },
  async event => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;
    if (after.approvalStatus !== 'pending' || before?.approvalStatus === 'pending') return;

    const base = appBaseUrl.value().replace(/\/$/, '');
    // The registration queue, not /admin/users: it opens on the applications
    // waiting for a decision, which is exactly what this notice is about.
    const reviewUrl = `${base}/admin/registrations`;

    // approvalStatus is self-writable between needs-profile and pending, so
    // toggling it is a send primitive. Resubmission is legitimate; a loop is not.
    if (!(await consumeMailAllowance(`approval:${event.params.uid}`, 5, DAY_MS))) {
      console.warn(`Approval notice suppressed for ${event.params.uid}: daily allowance spent`);
      return;
    }

    const recipients = await loadNotificationRecipients();

    await deliverOrQueue(
      {
        to: recipients,
        subject: `ICEFLU portal user approval — ${after.email ?? event.params.uid}`,
        text: buildUserApprovalEmailBody({ uid: event.params.uid, data: after, reviewUrl }),
      },
      {
        kind: 'approval-pending',
        id: `approval-pending-${event.id}`,
        retryAtOnce: true,
        // Pointless once someone has already reviewed the submission.
        guard: { type: 'docField', path: `users/${event.params.uid}`, field: 'approvalStatus', oneOf: ['pending'] },
      }
    );
  }
);

// Leader-review notification for events/{eventId}/registrations (Part 2, §7.5): emails the
// reference leader an eventId-scoped tokenized review link.
/**
 * Keeps events/{eventId}/capacity in step with the registrations that exist.
 *
 * Capacity used to be incremented by the browser inside the registration
 * transaction, which forced the rules to let clients write the counters — and a
 * rule cannot verify a count, so any member could mark the event full or wipe the
 * reservations. The admin SDK bypasses rules, so the counters can now be written
 * here and nowhere else.
 *
 * Recomputed from scratch rather than adjusted by a delta: a recount cannot drift,
 * and it repairs whatever the old client-side path (or the exploit) left behind.
 */
export const onRegistrationCapacityChange = onDocumentWritten(
  { document: 'events/{eventId}/registrations/{id}' },
  async event => {
    const { eventId } = event.params;
    const db = getFirestore();

    const before = event.data?.before.data();
    const after = event.data?.after.data();
    // Nothing that affects a count changed, so skip the read.
    if (
      before &&
      after &&
      before.status === after.status &&
      before.capacityBucket === after.capacityBucket
    ) {
      return;
    }

    const eventSnapshot = await db.doc(`events/${eventId}`).get();
    if (!eventSnapshot.exists) return;

    const buckets = eventCapacityBuckets(eventSnapshot.data());
    if (!buckets.length) return;

    const registrations = await db.collection(`events/${eventId}/registrations`).get();
    const rows = computeCapacityRows(
      buckets,
      registrations.docs.map(doc => {
        const data = doc.data();
        return { capacityBucket: data.capacityBucket, status: data.status };
      })
    );

    const batch = db.batch();
    for (const row of rows) {
      batch.set(db.doc(`events/${eventId}/capacity/${row.id}`), {
        capacity: row.capacity,
        reserved: row.reserved,
        available: row.available,
        updatedAt: FieldValue.serverTimestamp()
      });
    }
    await batch.commit();
  }
);

/**
 * Books the Daime a recorded work used as an exit movement in the Sacrament ledger.
 *
 * Church managers may record works but not write sacramentTransactions, which stay
 * custodian-only; the rules check at write time that the batch belongs to a stock
 * linked to the work's church. The movement lives at a deterministic id, so edits
 * and retries rewrite it rather than booking the Daime twice, and deleting the
 * work (or removing its Daime) removes it.
 */
export const onWorkSacramentChange = onDocumentWritten(
  { document: 'trabalhos/{workId}' },
  async event => {
    const { workId } = event.params;
    const before = workExitTransaction(workId, event.data?.before.data());
    const after = workExitTransaction(workId, event.data?.after.data());
    if (sameWorkExit(before, after)) return;

    const db = getFirestore();
    const ref = db.doc(`sacramentTransactions/${workExitTransactionId(workId)}`);

    if (!after) {
      await ref.delete();
      return;
    }

    await db.runTransaction(async transaction => {
      const existing = await transaction.get(ref);
      const now = FieldValue.serverTimestamp();
      transaction.set(ref, existing.exists ? { ...after, updatedAt: now } : { ...after, createdAt: now, updatedAt: now });
    });
  }
);

export const onEventRegistration = onDocumentCreated(
  {
    document: 'events/{eventId}/registrations/{id}',
    secrets: [...MAIL_SECRETS, leaderTokenSecret],
  },
  async event => {
    const data = event.data?.data();
    if (!data) return;

    const { eventId, id } = event.params;
    const name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
    const leaderEmail = typeof data.centerLeaderEmail === 'string' ? data.centerLeaderEmail.trim() : '';
    const leaderName = typeof data.centerLeader === 'string' ? data.centerLeader.trim() : '';
    if (!leaderEmail) return;

    const userId = typeof data.userId === 'string' ? data.userId : 'unknown';

    // The applicant types centerLeaderEmail, so it can point at their own inbox.
    // Flag it for the event admins and send nothing: a self-addressed approval
    // link would make leaderApproval meaningless.
    const accountEmail = userId !== 'unknown'
      ? (await getFirestore().doc(`users/${userId}`).get()).data()?.email
      : undefined;

    // They may also delete and recreate the registration freely, so cap how
    // often one person can make the portal mail anyone about one event.
    if (!(await consumeMailAllowance(`leader:${eventId}:${userId}`, 5, DAY_MS))) {
      console.warn(`Leader notice suppressed for ${userId} on ${eventId}: daily allowance spent`);
      return;
    }

    if (isSelfNominatedLeader({ leaderEmail, applicantEmails: [data.email, accountEmail] })) {
      console.warn(`Self-nominated reference leader on ${eventId}/${id}; no review link sent`);
      await event.data!.ref.update({
        leaderReviewBlocked: 'self-nominated',
        leaderReviewBlockedAt: FieldValue.serverTimestamp()
      });

      // Tell a human, rather than leaving the registration silently unreviewed.
      // Whoever handles it decides whether this is fraud or someone who is
      // genuinely their own centre's leader.
      try {
        await deliverOrQueue(
          {
            to: await loadNotificationRecipients(),
            subject: `Registration needs a reference church — ${name}`,
            text: [
              `${name} registered for ${eventId} giving their own address as the reference church leader (${leaderEmail}).`,
              ``,
              `No approval link was sent, because it would have gone to the applicant.`,
              `Please confirm who the reference church leader is and re-issue the link.`,
              ``,
              `Registration: ${id}`,
            ].join('\n'),
          },
          {
            kind: 'leader-self-nominated',
            id: `leader-self-nominated-${event.id}`,
            retryAtOnce: true,
            guard: { type: 'docField', path: `events/${eventId}/registrations/${id}`, field: 'leaderReviewBlocked', oneOf: ['self-nominated'] },
          }
        );
      } catch (error) {
        console.error('Failed to queue the self-nomination notice', error);
      }
      return;
    }

    const token = signLeaderToken(id, leaderEmail, leaderTokenSecret.value(), eventId);
    const reviewUrl = buildLeaderReviewUrl(id, token, eventId);
    const locale = normalizeLeaderEmailLocale(data.locale);

    await deliverOrQueue(
      {
        to: leaderEmail,
        subject: `Registration approval request — ${name}`,
        text: buildLeaderEmailBody({ leaderName: leaderName || 'leader', reviewUrl, locale }),
      },
      {
        kind: 'leader-review',
        id: `leader-review-${event.id}`,
        retryAtOnce: true,
        // Stop once the leader has answered (or the registration is gone).
        guard: { type: 'docField', path: `events/${eventId}/registrations/${id}`, field: 'leaderApproval', oneOf: [null] },
      }
    );
  }
);

function sanitizeInterview(value: unknown) {
  const interview = (value ?? null) as { required?: unknown; status?: unknown; resolvedAt?: unknown } | null;
  if (!interview || !interview.required || interview.required === 'none') {
    return null;
  }

  return {
    required: (interview.required === 'psychologist' ? 'psychologist' : 'standard') as 'standard' | 'psychologist',
    status: (interview.status === 'approved' || interview.status === 'rejected' ? interview.status : 'awaiting') as
      | 'awaiting'
      | 'approved'
      | 'rejected',
    resolvedAt: interview.resolvedAt instanceof Timestamp ? interview.resolvedAt.toMillis() : null
  };
}

function sanitizeRegistrationForLeader(id: string, data: FirebaseFirestore.DocumentData) {
  const contribution = data.contribution ?? {};
  const comments = Array.isArray(data.leaderComments) ? (data.leaderComments as LeaderComment[]) : [];

  return {
    id,
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    country: data.country ?? '',
    church: data.church ?? '',
    centerLeader: data.centerLeader ?? '',
    isInitiated: !!data.isInitiated,
    isIcefluMember: !!data.isIcefluMember,
    isNovice: !!data.isNovice,
    attendanceMode: data.attendanceMode ?? null,
    checkIn: data.checkIn ?? null,
    checkOut: data.checkOut ?? null,
    selectedWorks: Array.isArray(data.selectedWorks) ? data.selectedWorks : [],
    contribution: {
      nights: contribution.nights ?? 0,
      lodging: contribution.lodging ?? 0,
      spiritualWorks: contribution.spiritualWorks ?? 0,
      extras: contribution.extras ?? 0,
      total: contribution.total ?? 0
    },
    leaderApproval: (data.leaderApproval ?? null) as LeaderDecision | null,
    leaderApprovalRespondedAt: data.leaderApprovalRespondedAt instanceof Timestamp
      ? data.leaderApprovalRespondedAt.toMillis()
      : null,
    interview: sanitizeInterview(data.interview),
    leaderComments: comments.map(comment => ({
      text: comment.text,
      at: comment.at instanceof Timestamp ? comment.at.toMillis() : null
    }))
  };
}

async function loadRegistrationForLeader(args: { id: unknown; token: unknown; eventId?: unknown }) {
  if (typeof args.id !== 'string' || !args.id) {
    throw new HttpsError('invalid-argument', 'Registration id is required.');
  }

  if (typeof args.token !== 'string' || !args.token) {
    throw new HttpsError('invalid-argument', 'Token is required.');
  }

  if (typeof args.eventId !== 'string' || !args.eventId) {
    throw new HttpsError('invalid-argument', 'Event id is required.');
  }

  const eventId = args.eventId;
  const ref = getFirestore().collection('events').doc(eventId).collection('registrations').doc(args.id);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Registration not found.');
  }

  const data = snapshot.data() ?? {};
  const leaderEmail = typeof data.centerLeaderEmail === 'string' ? data.centerLeaderEmail.trim() : '';
  if (!leaderEmail) {
    throw new HttpsError('failed-precondition', 'No leader email associated with this registration.');
  }

  assertTokenAccepted(
    verifyReviewToken({
      token: args.token,
      payload: leaderTokenPayload(args.id, leaderEmail, eventId),
      secret: leaderTokenSecret.value(),
      nowMs: Date.now()
    })
  );

  return { ref, data };
}

export const leaderView = onCall(
  { secrets: [leaderTokenSecret] },
  async request => {
    const { id, token, eventId } = (request.data ?? {}) as { id?: unknown; token?: unknown; eventId?: unknown };
    const { ref, data } = await loadRegistrationForLeader({ id, token, eventId });
    return sanitizeRegistrationForLeader(ref.id, data);
  }
);

// ---- Payment (administration) review -----------------------------------------

async function loadRegistrationForPayment(args: { id: unknown; token: unknown; eventId?: unknown }) {
  if (typeof args.id !== 'string' || !args.id) {
    throw new HttpsError('invalid-argument', 'Registration id is required.');
  }
  if (typeof args.token !== 'string' || !args.token) {
    throw new HttpsError('invalid-argument', 'Token is required.');
  }
  if (typeof args.eventId !== 'string' || !args.eventId) {
    throw new HttpsError('invalid-argument', 'Event id is required.');
  }

  const eventId = args.eventId;
  const ref = getFirestore().collection('events').doc(eventId).collection('registrations').doc(args.id);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Registration not found.');
  }
  assertTokenAccepted(
    verifyReviewToken({
      token: args.token,
      payload: paymentTokenPayload(args.id, eventId),
      secret: leaderTokenSecret.value(),
      nowMs: Date.now()
    })
  );

  return { ref, data: snapshot.data() ?? {} };
}

async function resolvePaymentProofUrl(path: unknown): Promise<string | null> {
  if (typeof path !== 'string' || !path) return null;
  try {
    const [url] = await getStorage()
      .bucket()
      .file(path)
      .getSignedUrl({ action: 'read', expires: Date.now() + 60 * 60 * 1000 });
    return url;
  } catch (error) {
    console.error('Failed to sign payment proof URL', error);
    return null;
  }
}

async function sanitizeRegistrationForPayment(id: string, data: FirebaseFirestore.DocumentData) {
  const contribution = data.contribution ?? {};
  return {
    id,
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    country: data.country ?? '',
    church: data.church ?? '',
    attendanceMode: data.attendanceMode ?? null,
    contribution: {
      nights: contribution.nights ?? 0,
      lodging: contribution.lodging ?? 0,
      spiritualWorks: contribution.spiritualWorks ?? 0,
      extras: contribution.extras ?? 0,
      total: contribution.total ?? 0
    },
    paymentProofName: data.paymentProofName ?? null,
    paymentProofUrl: await resolvePaymentProofUrl(data.paymentProofPath),
    leaderApproval: (data.leaderApproval ?? null) as LeaderDecision | null,
    paymentApproval: (data.paymentApproval === 'approved' || data.paymentApproval === 'rejected'
      ? data.paymentApproval
      : null) as 'approved' | 'rejected' | null,
    paymentApprovalRespondedAt: data.paymentApprovalRespondedAt instanceof Timestamp
      ? data.paymentApprovalRespondedAt.toMillis()
      : null,
    status: (data.status ?? 'pending') as string
  };
}

export const paymentView = onCall(
  { secrets: [leaderTokenSecret] },
  async request => {
    const { id, token, eventId } = (request.data ?? {}) as { id?: unknown; token?: unknown; eventId?: unknown };
    const { ref, data } = await loadRegistrationForPayment({ id, token, eventId });
    return sanitizeRegistrationForPayment(ref.id, data);
  }
);

export const paymentRespond = onCall(
  { secrets: [leaderTokenSecret] },
  async request => {
    const payload = (request.data ?? {}) as { id?: unknown; token?: unknown; eventId?: unknown; decision?: unknown };
    const { ref } = await loadRegistrationForPayment({ id: payload.id, token: payload.token, eventId: payload.eventId });

    const decision = payload.decision;
    if (decision !== 'approved' && decision !== 'rejected') {
      throw new HttpsError('invalid-argument', 'decision must be "approved" or "rejected".');
    }

    await ref.update({
      paymentApproval: decision,
      paymentApprovalRespondedAt: FieldValue.serverTimestamp()
    });

    const refreshed = await ref.get();
    return sanitizeRegistrationForPayment(ref.id, refreshed.data() ?? {});
  }
);

async function approveUserConsentForRegistration(userId: unknown, registrationId: string, approvedBy: string) {
  if (typeof userId !== 'string' || !userId) {
    return;
  }

  const consentsRef = getFirestore().collection('users').doc(userId).collection('consents');
  const snapshot = await consentsRef.where('eventId', '==', registrationId).get();
  await Promise.all(
    snapshot.docs
      .filter(docSnap => docSnap.data().status !== 'approved')
      .map(docSnap =>
        docSnap.ref.update({
          status: 'approved',
          approvedAt: FieldValue.serverTimestamp(),
          approvedBy
        })
      )
  );
}

export const leaderRespond = onCall(
  { secrets: [leaderTokenSecret, ...MAIL_SECRETS] },
  async request => {
    const payload = (request.data ?? {}) as {
      id?: unknown;
      token?: unknown;
      eventId?: unknown;
      comment?: unknown;
      decision?: unknown;
      interviewOutcome?: unknown;
    };

    const { ref, data } = await loadRegistrationForLeader({ id: payload.id, token: payload.token, eventId: payload.eventId });
    const leaderEmail = typeof data.centerLeaderEmail === 'string' ? data.centerLeaderEmail.trim() : '';

    const trimmedComment = typeof payload.comment === 'string' ? payload.comment.trim() : '';
    const currentInterview = (data.interview ?? {}) as { required?: unknown };

    const result = computeLeaderResponse({
      decision: typeof payload.decision === 'string' ? payload.decision : null,
      interviewOutcome: typeof payload.interviewOutcome === 'string' ? payload.interviewOutcome : null,
      currentInterviewRequired: typeof currentInterview.required === 'string' ? currentInterview.required : null,
      hasComment: !!trimmedComment
    });

    if (!result.ok) {
      if (result.error === 'invalid-decision') {
        throw new HttpsError('invalid-argument', `decision must be one of: ${LEADER_DECISIONS.join(', ')}.`);
      }
      if (result.error === 'invalid-outcome') {
        throw new HttpsError('invalid-argument', 'interviewOutcome must be "approved" or "rejected".');
      }
      if (result.error === 'no-interview-pending') {
        throw new HttpsError('failed-precondition', 'No interview is pending for this registration.');
      }
      throw new HttpsError('invalid-argument', 'Provide a comment, a decision, or an interview outcome.');
    }

    const { plan } = result;
    const updates: Record<string, unknown> = {};
    if (trimmedComment) {
      updates.leaderComments = FieldValue.arrayUnion({
        text: trimmedComment.slice(0, 2000),
        at: Timestamp.now()
      });
    }
    if (plan.leaderApproval) {
      updates.leaderApproval = plan.leaderApproval;
      updates.leaderApprovalRespondedAt = FieldValue.serverTimestamp();
    }
    if (plan.interview) {
      updates.interview = plan.interview.resolved
        ? {
            required: plan.interview.required,
            status: plan.interview.status,
            resolvedAt: FieldValue.serverTimestamp(),
            resolvedBy: leaderEmail
          }
        : plan.interview.status
          ? { required: plan.interview.required, status: plan.interview.status }
          : { required: plan.interview.required };
    }

    await ref.update(updates);

    // A terminal approval (direct, or post-interview) makes the signed consent valid (item A).
    if (plan.terminalApproval) {
      await approveUserConsentForRegistration(data.userId, ref.id, leaderEmail);
    }

    // Notify the applicant of the reference church's initial decision (Phase 1).
    if (plan.leaderApproval) {
      const outcome = leaderDecisionToApplicantOutcome(plan.leaderApproval);
      const applicantEmail = typeof data.email === 'string' ? data.email.trim() : '';
      if (outcome && applicantEmail) {
        const locale = normalizeLeaderEmailLocale(data.locale);
        const message = applicantOutcomeEmail[locale][outcome];
        try {
          await deliverOrQueue(
            { to: applicantEmail, subject: message.subject, text: message.body },
            {
              kind: 'applicant-outcome',
              guard: { type: 'docField', path: ref.path, field: 'leaderApproval', oneOf: [plan.leaderApproval] },
            }
          );
        } catch (error) {
          console.error('Failed to queue applicant outcome email', error);
        }
      }
    }

    // On a direct church approval, ask the administration to verify the payment.
    if (plan.leaderApproval === 'approved') {
      const applicantName = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || (payload.id as string);
      const paymentToken = signPaymentToken(ref.id, leaderTokenSecret.value(), payload.eventId as string);
      const paymentReviewUrl = buildPaymentReviewUrl(ref.id, paymentToken, payload.eventId as string);
      try {
        await deliverOrQueue(
          {
            to: PAYMENT_ADMIN_EMAIL,
            subject: `Payment verification — ${applicantName}`,
            text: buildPaymentAdminEmail({ name: applicantName, reviewUrl: paymentReviewUrl }),
          },
          {
            kind: 'payment-review',
            // Stop once the administration has verified the payment.
            guard: { type: 'docField', path: ref.path, field: 'paymentApproval', oneOf: [null] },
          }
        );
      } catch (error) {
        console.error('Failed to queue payment-admin email', error);
      }
    }

    const refreshed = await ref.get();
    return sanitizeRegistrationForLeader(ref.id, refreshed.data() ?? {});
  }
);

// Sends a multilingual email verification to the currently signed-in user.
// Called from the frontend instead of Firebase's built-in sendEmailVerification so the
// email body is in all four app languages (it, pt, es, en).
/** The caller's roles, read from the same fields the Firestore rules look at. */
async function callerSystemRoles(uid: string | undefined): Promise<string[]> {
  if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in.');

  const caller = (await getFirestore().doc(`users/${uid}`).get()).data() ?? {};
  const roles = Array.isArray(caller.systemRoles) ? caller.systemRoles.filter(role => typeof role === 'string') : [];
  if (typeof caller.systemRole === 'string') roles.push(caller.systemRole);
  return roles;
}

async function assertCallerIsSuperadmin(uid: string | undefined) {
  const roles = await callerSystemRoles(uid);
  if (!roles.includes('superadmin')) {
    throw new HttpsError('permission-denied', 'Only a superadmin can delete a user.');
  }
}

/** Mirrors hasRequiredRole(role, 'useradmin') on the frontend. */
async function assertCallerCanManageUsers(uid: string | undefined) {
  const roles = await callerSystemRoles(uid);
  if (!roles.includes('superadmin') && !roles.includes('useradmin')) {
    throw new HttpsError('permission-denied', 'Only a user administrator can list signups.');
  }
}

/**
 * Wipes a user: profile document and its subcollections, everything they
 * uploaded, and the Firebase Auth account — so the address is free to sign up
 * from scratch. Irreversible, and deliberately unavailable to the client SDK
 * (users/{uid} is `allow delete: if false`); only this function can do it.
 */
export const deleteUserAccountCallable = onCall(async request => {
  const callerUid = request.auth?.uid;
  await assertCallerIsSuperadmin(callerUid);

  const uid = typeof request.data?.uid === 'string' ? request.data.uid.trim() : '';
  if (!uid) throw new HttpsError('invalid-argument', 'A uid is required.');
  if (uid === callerUid) throw new HttpsError('failed-precondition', 'You cannot delete your own account.');

  // Subcollections (consents, approvedSnapshots) go with the document.
  await getFirestore().recursiveDelete(getFirestore().doc(`users/${uid}`));

  // Best effort: a storage failure must not strand the account half-deleted,
  // with the profile gone but the login still able to sign in.
  let deletedFiles = 0;
  try {
    const [files] = await getStorage().bucket().getFiles({ prefix: `users/${uid}/` });
    await Promise.all(files.map(file => file.delete().catch(() => undefined)));
    deletedFiles = files.length;
  } catch (error) {
    console.error(`Failed to delete storage files for ${uid}`, error);
  }

  // A missing auth account is fine: the profile may outlive a deleted login.
  try {
    await getAuth().deleteUser(uid);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'auth/user-not-found') throw error;
  }

  return { deletedFiles };
});

/** Firebase's metadata timestamps are UTC strings; the UI wants something sortable. */
function isoTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

/**
 * Signups that never confirmed their address. They have no users/{uid} document
 * — the profile is only written once the email is verified — so the admin list,
 * which reads Firestore, cannot see them. Firebase Auth is the only source.
 */
export const listUnverifiedSignupsCallable = onCall(async request => {
  await assertCallerCanManageUsers(request.auth?.uid);

  const accounts: {
    uid: string;
    email: string;
    displayName: string | null;
    createdAt: string | null;
    lastSignInAt: string | null;
    providers: string[];
  }[] = [];

  let pageToken: string | undefined;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    page.users.forEach(record => {
      if (!record.email || record.emailVerified) return;
      accounts.push({
        uid: record.uid,
        email: record.email,
        displayName: record.displayName ?? null,
        createdAt: isoTimestamp(record.metadata.creationTime),
        lastSignInAt: isoTimestamp(record.metadata.lastSignInTime),
        providers: record.providerData.map(provider => provider.providerId),
      });
    });
    pageToken = page.pageToken;
  } while (pageToken);

  // Newest signup first: the ones worth chasing are the ones that just happened.
  accounts.sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''));
  return { accounts };
});

export const sendVerificationEmailCallable = onCall(
  { secrets: MAIL_SECRETS },
  async request => {
    const email = request.auth?.token.email;
    if (!email) {
      throw new HttpsError('unauthenticated', 'Must be signed in with an email account.');
    }

    const uid = request.auth?.uid ?? email;
    if (!(await consumeMailAllowance(`verify:${uid}`, 6, HOUR_MS))) {
      throw new HttpsError(
        'resource-exhausted',
        'Too many confirmation emails requested. Please wait a while before trying again.',
        { reason: 'rate-limited' }
      );
    }

    const base = appBaseUrl.value().replace(/\/$/, '');

    let link: string;
    try {
      link = await getAuth().generateEmailVerificationLink(email, { url: `${base}/login` });
    } catch (error) {
      console.error('Failed to generate the verification link', error);
      // Firebase refuses links requested in quick succession; that is a "wait a
      // moment", not a fault, and the login page says so.
      if (String((error as Error)?.message ?? '').includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
        throw new HttpsError('resource-exhausted', 'Confirmation links were requested too quickly. Please wait a few minutes.', {
          reason: 'link-throttled',
        });
      }
      throw new HttpsError('internal', 'Could not generate the confirmation link.', {
        reason: 'link-failed',
      });
    }

    // One queued confirmation per account: a newer link replaces an older one still
    // waiting for the relay. Retries stop as soon as the address is confirmed, which
    // usually happens through the Firebase email the login page sends as a fallback.
    let outcome: QueueOutcome;
    try {
      outcome = await deliverOrQueue(
        { to: email, subject: 'Confirm your email — São Irineu', text: buildVerificationEmailText(link) },
        // A second try on the spot while the person waits; after that, the schedule.
        { kind: 'verification', id: `verification-${uid}`, guard: { type: 'emailUnverified', uid }, replace: true, retryAtOnce: true }
      );
    } catch (error) {
      console.error('Failed to queue the verification email', error);
      throw new HttpsError('unavailable', `Could not deliver the confirmation email to ${email}.`, {
        reason: 'queue-failed',
      });
    }

    // 'queued': not delivered yet, retried automatically. The login page then also
    // asks Firebase to send its own confirmation email.
    const status = outcome === 'sent' ? 'sent' : outcome === 'cancelled' ? 'already-verified' : 'queued';
    return { sent: status === 'sent', status, email };
  }
);
