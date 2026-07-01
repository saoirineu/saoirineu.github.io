import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as nodemailer from 'nodemailer';

import { computeLeaderResponse, LEADER_DECISIONS, type LeaderDecision } from './leaderDecision';

admin.initializeApp();

const smtpHost = defineSecret('SMTP_HOST');
const smtpPort = defineSecret('SMTP_PORT');
const smtpUser = defineSecret('SMTP_USER');
const smtpPass = defineSecret('SMTP_PASS');
const leaderTokenSecret = defineSecret('LEADER_TOKEN_SECRET');
const appBaseUrl = defineString('APP_BASE_URL', { default: 'https://saoirineu.github.io' });

// Always-on recipients of the "new ICEFLU registration pending" admin notice.
// Admins can add more via the settings/notifications doc (see loadNotificationRecipients).
const BASELINE_NOTIFY = ['renato@junto.space', 'international.secretariat@stellazzurra.org'];

// Administration mailbox that verifies the payment for event registrations.
const PAYMENT_ADMIN_EMAIL = 'amministrazione@stellazzurra.org';

type LeaderComment = {
  text: string;
  at: admin.firestore.Timestamp;
};

const LEADER_TOKEN_HEX_LENGTH = 32;

// Leader token is scoped to events/{eventId}/registrations/{registrationId}.
function leaderTokenPayload(registrationId: string, leaderEmail: string, eventId: string) {
  const email = leaderEmail.trim().toLowerCase();
  return `${eventId}:${registrationId}:${email}`;
}

function signLeaderToken(registrationId: string, leaderEmail: string, secret: string, eventId: string) {
  return crypto
    .createHmac('sha256', secret)
    .update(leaderTokenPayload(registrationId, leaderEmail, eventId))
    .digest('hex')
    .slice(0, LEADER_TOKEN_HEX_LENGTH);
}

function verifyLeaderToken(registrationId: string, leaderEmail: string, token: string, secret: string, eventId: string) {
  const expected = signLeaderToken(registrationId, leaderEmail, secret, eventId);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(token, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Payment token is scoped to the administration mailbox for a given registration.
function signPaymentToken(registrationId: string, secret: string, eventId: string) {
  return crypto
    .createHmac('sha256', secret)
    .update(`payment:${eventId}:${registrationId}:${PAYMENT_ADMIN_EMAIL}`)
    .digest('hex')
    .slice(0, LEADER_TOKEN_HEX_LENGTH);
}

function verifyPaymentToken(registrationId: string, token: string, secret: string, eventId: string) {
  const expected = signPaymentToken(registrationId, secret, eventId);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(token, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
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

function createTransporter() {
  return nodemailer.createTransport({
    host: smtpHost.value(),
    port: parseInt(smtpPort.value(), 10),
    secure: parseInt(smtpPort.value(), 10) === 465,
    auth: {
      user: smtpUser.value(),
      pass: smtpPass.value(),
    },
  });
}

// Recipients of the admin "registration pending" notice: the always-on baseline
// plus the users and extra emails admins configure in settings/notifications
// (managed from the /admin/users panel).
async function loadNotificationRecipients() {
  const db = admin.firestore();
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
    'Bem-vindo/a ao São Irineu!',
    '',
    'Clique no link abaixo para confirmar o seu endereço de e-mail e activar a sua conta:',
    link,
    '',
    'Se não criou esta conta, pode ignorar este e-mail.',
    '',
    '────────────────────────────────',
    'Welcome to São Irineu!',
    '',
    'Click the link below to confirm your email address and activate your account:',
    link,
    '',
    'If you did not create this account, you can ignore this email.',
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
    'Benvenuto/a su São Irineu!',
    '',
    'Clicca sul link qui sotto per confermare il tuo indirizzo email e attivare il tuo account:',
    link,
    '',
    'Se non hai creato questo account, puoi ignorare questa email.',
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
    `Review users here:`,
    args.reviewUrl,
  ].join('\n');
}

function profileDisplayName(data: FirebaseFirestore.DocumentData): string {
  const composed = `${data.firstName ?? ''} ${data.surname ?? ''}`.trim();
  const name = data.fullName ?? data.displayName ?? composed;
  return typeof name === 'string' ? name.trim() : '';
}

function buildUserApprovedEmailText(name: string): string {
  const hi = name ? ` ${name}` : '';
  return [
    'São Irineu',
    '',
    '────────────────────────────────',
    `Olá${hi},`,
    '',
    'A sua inscrição no ICEFLU foi aprovada. O seu perfil de associado está agora activo. Obrigado!',
    '',
    '────────────────────────────────',
    `Hello${hi},`,
    '',
    'Your ICEFLU membership has been approved. Your member profile is now active. Thank you!',
    '',
    '────────────────────────────────',
    `Hola${hi},`,
    '',
    'Su inscripción en ICEFLU ha sido aprobada. Su perfil de socio ya está activo. ¡Gracias!',
    '',
    '────────────────────────────────',
    `Ciao${hi},`,
    '',
    'La tua iscrizione a ICEFLU è stata approvata. Il tuo profilo socio è ora attivo. Grazie!',
  ].join('\n');
}

function buildUserNeedsInfoEmailText(name: string, note: string, profileUrl: string): string {
  const hi = name ? ` ${name}` : '';
  const noteBlock = (label: string) => (note ? ['', `${label}: ${note}`] : []);
  return [
    'São Irineu',
    '',
    '────────────────────────────────',
    `Olá${hi},`,
    '',
    'A sua inscrição no ICEFLU precisa de revisão antes de poder ser aprovada. Por favor, actualize o seu perfil e envie-o novamente para aprovação:',
    profileUrl,
    ...noteBlock('Nota da administração'),
    '',
    '────────────────────────────────',
    `Hello${hi},`,
    '',
    'Your ICEFLU membership needs revision before it can be approved. Please update your profile and submit it again for approval:',
    profileUrl,
    ...noteBlock('Note from the administration'),
    '',
    '────────────────────────────────',
    `Hola${hi},`,
    '',
    'Su inscripción en ICEFLU necesita revisión antes de poder ser aprobada. Actualice su perfil y vuelva a enviarlo para aprobación:',
    profileUrl,
    ...noteBlock('Nota de la administración'),
    '',
    '────────────────────────────────',
    `Ciao${hi},`,
    '',
    "La tua iscrizione a ICEFLU necessita di revisione prima di poter essere approvata. Aggiorna il tuo profilo e invialo di nuovo per l'approvazione:",
    profileUrl,
    ...noteBlock("Nota dell'amministrazione"),
  ].join('\n');
}

// Emails the user when an admin decides on their ICEFLU profile: an approval
// confirmation, or a revision request (with the admin's note) for needs-info.
export const onUserApprovalDecision = onDocumentWritten(
  {
    document: 'users/{uid}',
    secrets: [smtpHost, smtpPort, smtpUser, smtpPass],
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
    const transporter = createTransporter();

    if (afterStatus === 'approved') {
      await transporter.sendMail({
        from: smtpUser.value(),
        to: email,
        subject: 'Your ICEFLU membership has been approved — São Irineu',
        text: buildUserApprovedEmailText(name),
      });
      return;
    }

    const note = typeof after.adminNote === 'string' ? after.adminNote.trim() : '';
    const profileUrl = `${appBaseUrl.value().replace(/\/$/, '')}/profile`;
    await transporter.sendMail({
      from: smtpUser.value(),
      to: email,
      subject: 'Your ICEFLU membership needs revision — São Irineu',
      text: buildUserNeedsInfoEmailText(name, note, profileUrl),
    });
  }
);

// When BOTH the reference church (leaderApproval) and the administration
// (paymentApproval) have approved, mark the registration approved and email the
// applicant the final confirmation. Idempotent: once status flips to 'approved'
// the guard stops it from re-firing.
export const onRegistrationBothApproved = onDocumentWritten(
  {
    document: 'events/{eventId}/registrations/{id}',
    secrets: [smtpHost, smtpPort, smtpUser, smtpPass],
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
      const transporter = createTransporter();
      await transporter.sendMail({
        from: smtpUser.value(),
        to: email,
        subject: message.subject,
        text: message.body,
      });
    } catch (error) {
      console.error('Failed to send final approval email', error);
    }
  }
);

export const onUserApprovalPending = onDocumentWritten(
  {
    document: 'users/{uid}',
    secrets: [smtpHost, smtpPort, smtpUser, smtpPass],
  },
  async event => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;
    if (after.approvalStatus !== 'pending' || before?.approvalStatus === 'pending') return;

    const base = appBaseUrl.value().replace(/\/$/, '');
    const reviewUrl = `${base}/admin/users`;
    const transporter = createTransporter();
    const recipients = await loadNotificationRecipients();

    await transporter.sendMail({
      from: smtpUser.value(),
      to: recipients,
      subject: `ICEFLU portal user approval — ${after.email ?? event.params.uid}`,
      text: buildUserApprovalEmailBody({ uid: event.params.uid, data: after, reviewUrl }),
    });
  }
);

// Leader-review notification for events/{eventId}/registrations (Part 2, §7.5): emails the
// reference leader an eventId-scoped tokenized review link.
export const onEventRegistration = onDocumentCreated(
  {
    document: 'events/{eventId}/registrations/{id}',
    secrets: [smtpHost, smtpPort, smtpUser, smtpPass, leaderTokenSecret],
  },
  async event => {
    const data = event.data?.data();
    if (!data) return;

    const { eventId, id } = event.params;
    const name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
    const leaderEmail = typeof data.centerLeaderEmail === 'string' ? data.centerLeaderEmail.trim() : '';
    const leaderName = typeof data.centerLeader === 'string' ? data.centerLeader.trim() : '';
    if (!leaderEmail) return;

    const token = signLeaderToken(id, leaderEmail, leaderTokenSecret.value(), eventId);
    const reviewUrl = buildLeaderReviewUrl(id, token, eventId);
    const locale = normalizeLeaderEmailLocale(data.locale);
    const transporter = createTransporter();

    await transporter.sendMail({
      from: smtpUser.value(),
      to: leaderEmail,
      subject: `Registration approval request — ${name}`,
      text: buildLeaderEmailBody({ leaderName: leaderName || 'leader', reviewUrl, locale }),
    });
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
    resolvedAt: interview.resolvedAt instanceof admin.firestore.Timestamp ? interview.resolvedAt.toMillis() : null
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
    leaderApprovalRespondedAt: data.leaderApprovalRespondedAt instanceof admin.firestore.Timestamp
      ? data.leaderApprovalRespondedAt.toMillis()
      : null,
    interview: sanitizeInterview(data.interview),
    leaderComments: comments.map(comment => ({
      text: comment.text,
      at: comment.at instanceof admin.firestore.Timestamp ? comment.at.toMillis() : null
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
  const ref = admin.firestore().collection('events').doc(eventId).collection('registrations').doc(args.id);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Registration not found.');
  }

  const data = snapshot.data() ?? {};
  const leaderEmail = typeof data.centerLeaderEmail === 'string' ? data.centerLeaderEmail.trim() : '';
  if (!leaderEmail) {
    throw new HttpsError('failed-precondition', 'No leader email associated with this registration.');
  }

  if (!verifyLeaderToken(args.id, leaderEmail, args.token, leaderTokenSecret.value(), eventId)) {
    throw new HttpsError('permission-denied', 'Invalid token.');
  }

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
  const ref = admin.firestore().collection('events').doc(eventId).collection('registrations').doc(args.id);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Registration not found.');
  }
  if (!verifyPaymentToken(args.id, args.token, leaderTokenSecret.value(), eventId)) {
    throw new HttpsError('permission-denied', 'Invalid token.');
  }

  return { ref, data: snapshot.data() ?? {} };
}

async function resolvePaymentProofUrl(path: unknown): Promise<string | null> {
  if (typeof path !== 'string' || !path) return null;
  try {
    const [url] = await admin
      .storage()
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
    paymentApprovalRespondedAt: data.paymentApprovalRespondedAt instanceof admin.firestore.Timestamp
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
      paymentApprovalRespondedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const refreshed = await ref.get();
    return sanitizeRegistrationForPayment(ref.id, refreshed.data() ?? {});
  }
);

async function approveUserConsentForRegistration(userId: unknown, registrationId: string, approvedBy: string) {
  if (typeof userId !== 'string' || !userId) {
    return;
  }

  const consentsRef = admin.firestore().collection('users').doc(userId).collection('consents');
  const snapshot = await consentsRef.where('eventId', '==', registrationId).get();
  await Promise.all(
    snapshot.docs
      .filter(docSnap => docSnap.data().status !== 'approved')
      .map(docSnap =>
        docSnap.ref.update({
          status: 'approved',
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          approvedBy
        })
      )
  );
}

export const leaderRespond = onCall(
  { secrets: [leaderTokenSecret, smtpHost, smtpPort, smtpUser, smtpPass] },
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
      updates.leaderComments = admin.firestore.FieldValue.arrayUnion({
        text: trimmedComment.slice(0, 2000),
        at: admin.firestore.Timestamp.now()
      });
    }
    if (plan.leaderApproval) {
      updates.leaderApproval = plan.leaderApproval;
      updates.leaderApprovalRespondedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    if (plan.interview) {
      updates.interview = plan.interview.resolved
        ? {
            required: plan.interview.required,
            status: plan.interview.status,
            resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
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
          const transporter = createTransporter();
          await transporter.sendMail({
            from: smtpUser.value(),
            to: applicantEmail,
            subject: message.subject,
            text: message.body,
          });
        } catch (error) {
          console.error('Failed to send applicant outcome email', error);
        }
      }
    }

    // On a direct church approval, ask the administration to verify the payment.
    if (plan.leaderApproval === 'approved') {
      const applicantName = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || (payload.id as string);
      const paymentToken = signPaymentToken(ref.id, leaderTokenSecret.value(), payload.eventId as string);
      const paymentReviewUrl = buildPaymentReviewUrl(ref.id, paymentToken, payload.eventId as string);
      try {
        const transporter = createTransporter();
        await transporter.sendMail({
          from: smtpUser.value(),
          to: PAYMENT_ADMIN_EMAIL,
          subject: `Payment verification — ${applicantName}`,
          text: buildPaymentAdminEmail({ name: applicantName, reviewUrl: paymentReviewUrl }),
        });
      } catch (error) {
        console.error('Failed to send payment-admin email', error);
      }
    }

    const refreshed = await ref.get();
    return sanitizeRegistrationForLeader(ref.id, refreshed.data() ?? {});
  }
);

// Sends a multilingual email verification to the currently signed-in user.
// Called from the frontend instead of Firebase's built-in sendEmailVerification so the
// email body is in all four app languages (pt, en, es, it).
export const sendVerificationEmailCallable = onCall(
  { secrets: [smtpHost, smtpPort, smtpUser, smtpPass] },
  async request => {
    const email = request.auth?.token.email;
    if (!email) {
      throw new HttpsError('unauthenticated', 'Must be signed in with an email account.');
    }

    const base = appBaseUrl.value().replace(/\/$/, '');
    const link = await admin.auth().generateEmailVerificationLink(email, { url: `${base}/login` });

    const transporter = createTransporter();
    await transporter.sendMail({
      from: smtpUser.value(),
      to: email,
      subject: 'Confirm your email — São Irineu',
      text: buildVerificationEmailText(link),
    });
  }
);
