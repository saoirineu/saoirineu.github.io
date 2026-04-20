import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

const smtpHost = defineSecret('SMTP_HOST');
const smtpPort = defineSecret('SMTP_PORT');
const smtpUser = defineSecret('SMTP_USER');
const smtpPass = defineSecret('SMTP_PASS');

const NOTIFY_TO = 'international.secretariat@stellazzurra.org';

export const onEuropeanGatheringRegistration = onDocumentCreated(
  {
    document: 'europeanGatheringRegistrations/{id}',
    secrets: [smtpHost, smtpPort, smtpUser, smtpPass],
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

    const transporter = nodemailer.createTransport({
      host: smtpHost.value(),
      port: parseInt(smtpPort.value(), 10),
      secure: parseInt(smtpPort.value(), 10) === 465,
      auth: {
        user: smtpUser.value(),
        pass: smtpPass.value(),
      },
    });

    await transporter.sendMail({
      from: smtpUser.value(),
      to: NOTIFY_TO,
      subject: `Nuova iscrizione Encontro Europeu 2026 — ${name}`,
      text: lines.join('\n'),
    });
  }
);
