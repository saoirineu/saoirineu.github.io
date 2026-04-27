import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as nodemailer from 'nodemailer';

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

type LeaderDecision = 'approved' | 'rejected';

const LEADER_TOKEN_HEX_LENGTH = 32;

function signLeaderToken(registrationId: string, leaderEmail: string, secret: string) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${registrationId}:${leaderEmail.trim().toLowerCase()}`)
    .digest('hex')
    .slice(0, LEADER_TOKEN_HEX_LENGTH);
}

function verifyLeaderToken(registrationId: string, leaderEmail: string, token: string, secret: string) {
  const expected = signLeaderToken(registrationId, leaderEmail, secret);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(token, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function buildLeaderReviewUrl(registrationId: string, token: string) {
  const base = appBaseUrl.value().replace(/\/$/, '');
  return `${base}/european-gathering/leader-review/${registrationId}?t=${token}`;
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
    leaderComments: comments.map(comment => ({
      text: comment.text,
      at: comment.at instanceof admin.firestore.Timestamp ? comment.at.toMillis() : null
    }))
  };
}

async function loadRegistrationForLeader(args: { id: unknown; token: unknown }) {
  if (typeof args.id !== 'string' || !args.id) {
    throw new HttpsError('invalid-argument', 'Registration id is required.');
  }

  if (typeof args.token !== 'string' || !args.token) {
    throw new HttpsError('invalid-argument', 'Token is required.');
  }

  const ref = admin.firestore().collection('europeanGatheringRegistrations').doc(args.id);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Registration not found.');
  }

  const data = snapshot.data() ?? {};
  const leaderEmail = typeof data.centerLeaderEmail === 'string' ? data.centerLeaderEmail.trim() : '';
  if (!leaderEmail) {
    throw new HttpsError('failed-precondition', 'No leader email associated with this registration.');
  }

  if (!verifyLeaderToken(args.id, leaderEmail, args.token, leaderTokenSecret.value())) {
    throw new HttpsError('permission-denied', 'Invalid token.');
  }

  return { ref, data };
}

export const europeanGatheringLeaderView = onCall(
  { secrets: [leaderTokenSecret] },
  async request => {
    const { id, token } = (request.data ?? {}) as { id?: unknown; token?: unknown };
    const { ref, data } = await loadRegistrationForLeader({ id, token });
    return sanitizeRegistrationForLeader(ref.id, data);
  }
);

export const europeanGatheringLeaderRespond = onCall(
  { secrets: [leaderTokenSecret] },
  async request => {
    const payload = (request.data ?? {}) as {
      id?: unknown;
      token?: unknown;
      comment?: unknown;
      decision?: unknown;
    };

    const { ref } = await loadRegistrationForLeader({ id: payload.id, token: payload.token });

    const updates: Record<string, unknown> = {};
    const trimmedComment = typeof payload.comment === 'string' ? payload.comment.trim() : '';
    if (trimmedComment) {
      updates.leaderComments = admin.firestore.FieldValue.arrayUnion({
        text: trimmedComment.slice(0, 2000),
        at: admin.firestore.Timestamp.now()
      });
    }

    if (payload.decision === 'approved' || payload.decision === 'rejected') {
      updates.leaderApproval = payload.decision;
      updates.leaderApprovalRespondedAt = admin.firestore.FieldValue.serverTimestamp();
    } else if (payload.decision != null && payload.decision !== '') {
      throw new HttpsError('invalid-argument', 'decision must be "approved" or "rejected".');
    }

    if (Object.keys(updates).length === 0) {
      throw new HttpsError('invalid-argument', 'Provide a comment or a decision.');
    }

    await ref.update(updates);
    const refreshed = await ref.get();
    return sanitizeRegistrationForLeader(ref.id, refreshed.data() ?? {});
  }
);
