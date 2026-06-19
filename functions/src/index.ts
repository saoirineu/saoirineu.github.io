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

const NOTIFY_TO = 'renato@junto.space'; // TODO: change to international.secretariat@stellazzurra.org before production

type LeaderComment = {
  text: string;
  at: admin.firestore.Timestamp;
};

const LEADER_TOKEN_HEX_LENGTH = 32;

// eventId is empty for legacy europeanGatheringRegistrations (keeps existing leader links valid)
// and the event id for events/{eventId}/registrations.
function leaderTokenPayload(registrationId: string, leaderEmail: string, eventId: string) {
  const email = leaderEmail.trim().toLowerCase();
  return eventId ? `${eventId}:${registrationId}:${email}` : `${registrationId}:${email}`;
}

function signLeaderToken(registrationId: string, leaderEmail: string, secret: string, eventId = '') {
  return crypto
    .createHmac('sha256', secret)
    .update(leaderTokenPayload(registrationId, leaderEmail, eventId))
    .digest('hex')
    .slice(0, LEADER_TOKEN_HEX_LENGTH);
}

function verifyLeaderToken(registrationId: string, leaderEmail: string, token: string, secret: string, eventId = '') {
  const expected = signLeaderToken(registrationId, leaderEmail, secret, eventId);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(token, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function buildLeaderReviewUrl(registrationId: string, token: string, eventId = '') {
  const base = appBaseUrl.value().replace(/\/$/, '');
  return eventId
    ? `${base}/leader-review/${registrationId}?t=${token}&e=${encodeURIComponent(eventId)}`
    : `${base}/european-gathering/leader-review/${registrationId}?t=${token}`;
}

function buildLeaderEmailBody(args: { name: string; reviewUrl: string }) {
  return [
    `Mr./Mrs. ${args.name},`,
    ``,
    `we kindly ask whether their registration for the 2026 European Gathering can be approved.`,
    ``,
    `You can review the participation details, leave comments, and approve or reject the request here:`,
    args.reviewUrl,
    ``,
    `Thank you for your collaboration.`,
  ].join('\n');
}

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

async function loadUserAdminEmails() {
  const db = admin.firestore();
  const snapshots = await Promise.all([
    db.collection('users').where('systemRoles', 'array-contains', 'useradmin').get(),
    db.collection('users').where('systemRoles', 'array-contains', 'superadmin').get(),
    db.collection('users').where('systemRole', '==', 'useradmin').get(),
    db.collection('users').where('systemRole', '==', 'superadmin').get(),
  ]);
  const emails = new Set<string>();

  snapshots.forEach(snapshot => {
    snapshot.docs.forEach(doc => {
      const email = doc.data().email;
      if (typeof email === 'string' && email.trim()) {
        emails.add(email.trim());
      }
    });
  });

  if (emails.size === 0) {
    emails.add(NOTIFY_TO);
  }

  return Array.from(emails);
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
    const recipients = await loadUserAdminEmails();

    await transporter.sendMail({
      from: smtpUser.value(),
      to: recipients,
      subject: `ICEFLU portal user approval — ${after.email ?? event.params.uid}`,
      text: buildUserApprovalEmailBody({ uid: event.params.uid, data: after, reviewUrl }),
    });
  }
);

export const onEuropeanGatheringRegistration = onDocumentCreated(
  {
    document: 'europeanGatheringRegistrations/{id}',
    secrets: [smtpHost, smtpPort, smtpUser, smtpPass, leaderTokenSecret],
  },
  async event => {
    const data = event.data?.data();
    if (!data) return;

    const id = event.params.id;
    const name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
    const contribution = data.contribution?.total != null
      ? `€ ${data.contribution.total}`
      : '—';

    const lines = [
      `Nome: ${name}`,
      `Paese: ${data.country ?? '—'}`,
      `Centro: ${data.church ?? '—'}`,
      `Dirigente: ${data.centerLeader ?? '—'}`,
      `Email dirigente: ${data.centerLeaderEmail ?? '—'}`,
      `Email: ${data.email ?? '—'}`,
      `Telefono: ${data.phone ?? '—'}`,
      ``,
      `Fardado: ${data.isInitiated ? 'Sì' : 'No'}`,
      `Membro ICEFLU: ${data.isIcefluMember ? 'Sì' : 'No'}`,
      `Prima partecipazione: ${data.isNovice ? 'Sì' : 'No'}`,
      ``,
      `Modalità: ${data.attendanceMode ?? '—'}`,
      `Check-in: ${data.checkIn ?? '—'}`,
      `Check-out: ${data.checkOut ?? '—'}`,
      `Camera: ${data.roomNumber ?? '—'}`,
      ``,
      `Contributo totale: ${contribution}`,
      ``,
      `ID iscrizione: ${id}`,
    ];

    const transporter = createTransporter();

    await transporter.sendMail({
      from: smtpUser.value(),
      to: NOTIFY_TO,
      subject: `Nuova iscrizione Encontro Europeu 2026 — ${name}`,
      text: lines.join('\n'),
    });

    const leaderEmail = typeof data.centerLeaderEmail === 'string' ? data.centerLeaderEmail.trim() : '';
    const leaderName = typeof data.centerLeader === 'string' ? data.centerLeader.trim() : '';

    if (leaderEmail) {
      const token = signLeaderToken(id, leaderEmail, leaderTokenSecret.value());
      const reviewUrl = buildLeaderReviewUrl(id, token);

      await transporter.sendMail({
        from: smtpUser.value(),
        to: leaderEmail,
        subject: `Registration approval request — ${name}`,
        text: buildLeaderEmailBody({ name: leaderName || 'leader', reviewUrl }),
      });
    }
  }
);

// Generic events leader-review notification (Part 2, §7.5). Mirrors the EG trigger but for
// events/{eventId}/registrations and an eventId-scoped tokenized leader link.
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
    const transporter = createTransporter();

    await transporter.sendMail({
      from: smtpUser.value(),
      to: leaderEmail,
      subject: `Registration approval request — ${name}`,
      text: buildLeaderEmailBody({ name: leaderName || 'leader', reviewUrl }),
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

  const eventId = typeof args.eventId === 'string' ? args.eventId : '';
  const ref = eventId
    ? admin.firestore().collection('events').doc(eventId).collection('registrations').doc(args.id)
    : admin.firestore().collection('europeanGatheringRegistrations').doc(args.id);
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

export const europeanGatheringLeaderView = onCall(
  { secrets: [leaderTokenSecret] },
  async request => {
    const { id, token, eventId } = (request.data ?? {}) as { id?: unknown; token?: unknown; eventId?: unknown };
    const { ref, data } = await loadRegistrationForLeader({ id, token, eventId });
    return sanitizeRegistrationForLeader(ref.id, data);
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

export const europeanGatheringLeaderRespond = onCall(
  { secrets: [leaderTokenSecret] },
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

    const refreshed = await ref.get();
    return sanitizeRegistrationForLeader(ref.id, refreshed.data() ?? {});
  }
);
