import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  CONSENT_VALIDITY_MONTHS,
  consentFormUrl,
  consentFormVariant,
  consentValidUntil,
  fetchUserConsents,
  latestConsent,
  majorityDate,
  uploadSignedConsent
} from '../../lib/consents';
import { formatDate } from '../../lib/dateFormat';
import type { SiteLocale } from '../../lib/siteLocale';
import { uploadAccept } from '../../lib/uploads';

const copyByLocale = {
  pt: {
    title: 'Consenso informato',
    intro: (months: number) =>
      `Baixe o consenso informato, assine e envie de volta. É necessário preencher e assinar o documento para participar dos eventos. O documento assinado tem validade de ${months} meses.`,
    download: 'Baixar o documento',
    downloadAdult: 'Baixar a versão para maiores de idade',
    downloadMinor: 'Baixar a versão para menores de idade',
    minorNote:
      'Como você ainda não tem 18 anos, use a versão para menores: ela é assinada por quem exerce a responsabilidade parental e por você. Deixa de valer quando você completar 18 anos.',
    unknownBirthDate:
      'Seu perfil não tem data de nascimento. Use a versão para maiores de idade se tiver 18 anos ou mais; caso contrário, a versão para menores.',
    choose: 'Escolher arquivo assinado',
    send: 'Enviar',
    sending: 'Enviando...',
    sent: 'Enviado. A administração irá revisar.',
    statusApproved: (date: string) => `Consenso aprovado, válido até ${date}.`,
    statusPending: 'Consenso enviado, aguardando revisão da administração.',
    statusRejected: 'O consenso enviado foi recusado. Envie um novo documento assinado.',
    statusMissing: 'Nenhum consenso assinado registrado.',
    statusExpired: 'O seu consenso expirou. Envie um novo documento assinado.',
    statusCameOfAge: 'Você completou 18 anos e o consenso assinado como menor não vale mais. Envie a versão para maiores de idade.'
  },
  en: {
    title: 'Informed consent',
    intro: (months: number) =>
      `Download the informed consent, sign it and send it back. You must complete and sign the document in order to take part in the events. A signed document is valid for ${months} months.`,
    download: 'Download the document',
    downloadAdult: 'Download the adult form',
    downloadMinor: 'Download the form for minors',
    minorNote:
      'As you are under 18, use the form for minors: it is signed by those with parental responsibility and by you. It stops being valid when you turn 18.',
    unknownBirthDate:
      'Your profile has no birth date. Use the adult form if you are 18 or older; otherwise, the form for minors.',
    choose: 'Choose signed file',
    send: 'Send',
    sending: 'Sending...',
    sent: 'Sent. The administration will review it.',
    statusApproved: (date: string) => `Consent approved, valid until ${date}.`,
    statusPending: 'Consent sent, awaiting review by the administration.',
    statusRejected: 'The consent you sent was rejected. Please send a new signed document.',
    statusMissing: 'No signed consent on file.',
    statusExpired: 'Your consent has expired. Please send a new signed document.',
    statusCameOfAge: 'You have turned 18, so the consent signed as a minor is no longer valid. Please send the adult form.'
  },
  es: {
    title: 'Consenso informato',
    intro: (months: number) =>
      `Descargue el consentimiento informado, fírmelo y envíelo de vuelta. Es necesario completar y firmar el documento para participar en los eventos. El documento firmado tiene una validez de ${months} meses.`,
    download: 'Descargar el documento',
    downloadAdult: 'Descargar la versión para mayores de edad',
    downloadMinor: 'Descargar la versión para menores de edad',
    minorNote:
      'Como aún no tiene 18 años, use la versión para menores: la firman quienes ejercen la responsabilidad parental y usted. Deja de ser válida cuando cumpla 18 años.',
    unknownBirthDate:
      'Su perfil no tiene fecha de nacimiento. Use la versión para mayores de edad si tiene 18 años o más; si no, la versión para menores.',
    choose: 'Elegir archivo firmado',
    send: 'Enviar',
    sending: 'Enviando...',
    sent: 'Enviado. La administración lo revisará.',
    statusApproved: (date: string) => `Consentimiento aprobado, válido hasta ${date}.`,
    statusPending: 'Consentimiento enviado, a la espera de revisión de la administración.',
    statusRejected: 'El consentimiento enviado fue rechazado. Envíe un nuevo documento firmado.',
    statusMissing: 'Ningún consentimiento firmado registrado.',
    statusExpired: 'Su consentimiento ha caducado. Envíe un nuevo documento firmado.',
    statusCameOfAge: 'Ha cumplido 18 años y el consentimiento firmado como menor ya no es válido. Envíe la versión para mayores de edad.'
  },
  it: {
    title: 'Consenso informato',
    intro: (months: number) =>
      `Scarica il consenso informato, firmalo e invialo. È necessario compilare e firmare il documento per partecipare agli eventi. Il documento firmato ha validità di ${months} mesi.`,
    download: 'Scarica il documento',
    downloadAdult: 'Scarica la versione per maggiorenni',
    downloadMinor: 'Scarica la versione per minorenni',
    minorNote:
      'Poiché non hai ancora 18 anni, usa la versione per minorenni: la firmano gli esercenti la responsabilità genitoriale e tu. Smette di valere al compimento dei 18 anni.',
    unknownBirthDate:
      'Nel tuo profilo manca la data di nascita. Usa la versione per maggiorenni se hai almeno 18 anni, altrimenti quella per minorenni.',
    choose: 'Scegli il file firmato',
    send: 'Invia',
    sending: 'Invio...',
    sent: "Inviato. L'amministrazione lo esaminerà.",
    statusApproved: (date: string) => `Consenso approvato, valido fino al ${date}.`,
    statusPending: "Consenso inviato, in attesa di revisione da parte dell'amministrazione.",
    statusRejected: 'Il consenso inviato è stato rifiutato. Invia un nuovo documento firmato.',
    statusMissing: 'Nessun consenso firmato registrato.',
    statusExpired: 'Il tuo consenso è scaduto. Invia un nuovo documento firmato.',
    statusCameOfAge: 'Hai compiuto 18 anni: il consenso firmato da minorenne non è più valido. Invia la versione per maggiorenni.'
  }
} as const;

function statusPillClass(tone: 'ok' | 'wait' | 'todo') {
  const base = 'inline-block rounded-full px-3 py-1 text-xs font-medium ';
  if (tone === 'ok') return base + 'bg-emerald-100 text-emerald-800';
  if (tone === 'wait') return base + 'bg-amber-100 text-amber-800';
  return base + 'bg-slate-100 text-slate-600';
}

const downloadLinkClass =
  'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:bg-amber-50';

/** The member's birth date picks the adult or minor form, and ends a minor's consent at 18. */
export function ConsentCard({ uid, locale, birthDate }: { uid: string; locale: SiteLocale; birthDate?: string }) {
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

  const variant = consentFormVariant(birthDate);
  const validUntil = consentValidUntil(consents, birthDate);
  const stillValid = validUntil ? validUntil.getTime() >= Date.now() : false;
  const endedAtMajority = !!validUntil && validUntil.getTime() === majorityDate(birthDate)?.getTime();
  const latest = latestConsent(consents);

  const { text, tone } = stillValid
    ? { text: copy.statusApproved(formatDate(validUntil!, locale)), tone: 'ok' as const }
    : latest?.status === 'pending'
      ? { text: copy.statusPending, tone: 'wait' as const }
      : latest?.status === 'rejected'
        ? { text: copy.statusRejected, tone: 'todo' as const }
        : validUntil
          ? { text: endedAtMajority ? copy.statusCameOfAge : copy.statusExpired, tone: 'todo' as const }
          : { text: copy.statusMissing, tone: 'todo' as const };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{copy.title}</h2>
      <p className="mt-1 text-sm text-slate-600">{copy.intro(CONSENT_VALIDITY_MONTHS)}</p>
      {variant === 'minor' ? <p className="mt-1 text-sm text-slate-600">{copy.minorNote}</p> : null}
      {variant === null ? <p className="mt-1 text-sm text-amber-800">{copy.unknownBirthDate}</p> : null}

      {consentsQuery.isLoading ? null : <p className={`mt-3 ${statusPillClass(tone)}`}>{text}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {variant ? (
          <a className={downloadLinkClass} href={consentFormUrl(variant, locale)} target="_blank" rel="noreferrer">
            {copy.download}
          </a>
        ) : (
          <>
            <a className={downloadLinkClass} href={consentFormUrl('adult', locale)} target="_blank" rel="noreferrer">
              {copy.downloadAdult}
            </a>
            <a className={downloadLinkClass} href={consentFormUrl('minor', locale)} target="_blank" rel="noreferrer">
              {copy.downloadMinor}
            </a>
          </>
        )}

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
