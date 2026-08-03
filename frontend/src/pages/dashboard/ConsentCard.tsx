import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  CONSENT_VALIDITY_MONTHS,
  consentValidUntil,
  fetchUserConsents,
  latestConsent,
  uploadSignedConsent
} from '../../lib/consents';
import type { SiteLocale } from '../../lib/siteLocale';
import { uploadAccept } from '../../lib/uploads';

/**
 * The blank consent form, the same PDF the event registration links to. Kept as
 * a static asset per language rather than read from event data, since a member
 * signs one consent for the association, not for a particular event.
 */
const CONSENT_FORM_URL: Record<SiteLocale, string> = {
  pt: '/encontro-europeu/consenso-informado-pt.pdf',
  en: '/encontro-europeu/consenso-informado-en.pdf',
  es: '/encontro-europeu/consenso-informado-es.pdf',
  it: '/encontro-europeu/consenso-informado-it.pdf'
};

const copyByLocale = {
  pt: {
    title: 'Consenso informato',
    intro: (months: number) =>
      `Baixe o consenso informato, assine e envie de volta. É necessário preencher e assinar o documento para participar dos eventos. O documento assinado tem validade de ${months} meses.`,
    download: 'Baixar o documento',
    choose: 'Escolher arquivo assinado',
    send: 'Enviar',
    sending: 'Enviando...',
    sent: 'Enviado. A administração irá revisar.',
    statusApproved: (date: string) => `Consenso aprovado, válido até ${date}.`,
    statusPending: 'Consenso enviado, aguardando revisão da administração.',
    statusRejected: 'O consenso enviado foi recusado. Envie um novo documento assinado.',
    statusMissing: 'Nenhum consenso assinado registrado.',
    statusExpired: 'O seu consenso expirou. Envie um novo documento assinado.'
  },
  en: {
    title: 'Informed consent',
    intro: (months: number) =>
      `Download the informed consent, sign it and send it back. You must complete and sign the document in order to take part in the events. A signed document is valid for ${months} months.`,
    download: 'Download the document',
    choose: 'Choose signed file',
    send: 'Send',
    sending: 'Sending...',
    sent: 'Sent. The administration will review it.',
    statusApproved: (date: string) => `Consent approved, valid until ${date}.`,
    statusPending: 'Consent sent, awaiting review by the administration.',
    statusRejected: 'The consent you sent was rejected. Please send a new signed document.',
    statusMissing: 'No signed consent on file.',
    statusExpired: 'Your consent has expired. Please send a new signed document.'
  },
  es: {
    title: 'Consenso informato',
    intro: (months: number) =>
      `Descargue el consentimiento informado, fírmelo y envíelo de vuelta. Es necesario completar y firmar el documento para participar en los eventos. El documento firmado tiene una validez de ${months} meses.`,
    download: 'Descargar el documento',
    choose: 'Elegir archivo firmado',
    send: 'Enviar',
    sending: 'Enviando...',
    sent: 'Enviado. La administración lo revisará.',
    statusApproved: (date: string) => `Consentimiento aprobado, válido hasta ${date}.`,
    statusPending: 'Consentimiento enviado, a la espera de revisión de la administración.',
    statusRejected: 'El consentimiento enviado fue rechazado. Envíe un nuevo documento firmado.',
    statusMissing: 'Ningún consentimiento firmado registrado.',
    statusExpired: 'Su consentimiento ha caducado. Envíe un nuevo documento firmado.'
  },
  it: {
    title: 'Consenso informato',
    intro: (months: number) =>
      `Scarica il consenso informato, firmalo e invialo. È necessario compilare e firmare il documento per partecipare agli eventi. Il documento firmato ha validità di ${months} mesi.`,
    download: 'Scarica il documento',
    choose: 'Scegli il file firmato',
    send: 'Invia',
    sending: 'Invio...',
    sent: "Inviato. L'amministrazione lo esaminerà.",
    statusApproved: (date: string) => `Consenso approvato, valido fino al ${date}.`,
    statusPending: "Consenso inviato, in attesa di revisione da parte dell'amministrazione.",
    statusRejected: 'Il consenso inviato è stato rifiutato. Invia un nuovo documento firmato.',
    statusMissing: 'Nessun consenso firmato registrato.',
    statusExpired: 'Il tuo consenso è scaduto. Invia un nuovo documento firmato.'
  }
} as const;

function statusPillClass(tone: 'ok' | 'wait' | 'todo') {
  const base = 'inline-block rounded-full px-3 py-1 text-xs font-medium ';
  if (tone === 'ok') return base + 'bg-emerald-100 text-emerald-800';
  if (tone === 'wait') return base + 'bg-amber-100 text-amber-800';
  return base + 'bg-slate-100 text-slate-600';
}

export function ConsentCard({ uid, locale }: { uid: string; locale: SiteLocale }) {
  const copy = copyByLocale[locale];
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [justSent, setJustSent] = useState(false);

  const consentsQuery = useQuery({
    queryKey: ['consents', uid],
    queryFn: () => fetchUserConsents(uid)
  });
  const consents = consentsQuery.data ?? [];

  const sendMutation = useMutation({
    mutationFn: (signed: File) => uploadSignedConsent(uid, signed),
    onSuccess: async () => {
      setFile(null);
      setErrorMsg('');
      setJustSent(true);
      await queryClient.invalidateQueries({ queryKey: ['consents', uid] });
    },
    onError: (error: unknown) => setErrorMsg(error instanceof Error ? error.message : String(error))
  });

  const validUntil = consentValidUntil(consents);
  const stillValid = validUntil ? validUntil.getTime() >= Date.now() : false;
  const latest = latestConsent(consents);

  const { text, tone } = stillValid
    ? { text: copy.statusApproved(validUntil!.toLocaleDateString(locale)), tone: 'ok' as const }
    : latest?.status === 'pending'
      ? { text: copy.statusPending, tone: 'wait' as const }
      : latest?.status === 'rejected'
        ? { text: copy.statusRejected, tone: 'todo' as const }
        : validUntil
          ? { text: copy.statusExpired, tone: 'todo' as const }
          : { text: copy.statusMissing, tone: 'todo' as const };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{copy.title}</h2>
      <p className="mt-1 text-sm text-slate-600">{copy.intro(CONSENT_VALIDITY_MONTHS)}</p>

      {consentsQuery.isLoading ? null : <p className={`mt-3 ${statusPillClass(tone)}`}>{text}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:bg-amber-50"
          href={CONSENT_FORM_URL[locale]}
          target="_blank"
          rel="noreferrer"
        >
          {copy.download}
        </a>

        <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          {file ? file.name : copy.choose}
          <input
            type="file"
            className="hidden"
            accept={uploadAccept}
            onChange={event => {
              setFile(event.target.files?.[0] ?? null);
              setErrorMsg('');
              setJustSent(false);
            }}
          />
        </label>

        <button
          type="button"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={!file || sendMutation.isPending}
          onClick={() => file && sendMutation.mutate(file)}
        >
          {sendMutation.isPending ? copy.sending : copy.send}
        </button>
      </div>

      {errorMsg ? <p className="mt-2 text-sm text-red-600">{errorMsg}</p> : null}
      {justSent && !errorMsg ? <p className="mt-2 text-sm text-emerald-700">{copy.sent}</p> : null}
    </div>
  );
}
