import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { fetchPaymentView, submitPaymentResponse, type PaymentDecision, type PaymentView } from '../lib/paymentReview';
import { siteLocaleOptions, type SiteLocale } from '../lib/siteLocale';
import { useSiteLocale } from '../providers/useSiteLocale';

type PaymentCopy = {
  title: string;
  language: string;
  loading: string;
  errMissing: string;
  errLoad: string;
  errNotFound: string;
  errSubmit: string;
  intro: string;
  applicant: string;
  church: string;
  mode: string;
  modeLodging: string;
  modeMeals: string;
  modeSpiritual: string;
  total: string;
  paymentProof: string;
  paymentProofNone: string;
  openProof: string;
  decision: string;
  decApproved: string;
  decRejected: string;
  decPending: string;
  leaderPending: string;
  approve: string;
  approving: string;
  reject: string;
  rejecting: string;
  recorded: string;
  fullyApproved: string;
};

const localeTag: Record<SiteLocale, string> = { pt: 'pt-PT', en: 'en-GB', es: 'es-ES', it: 'it-IT' };

const copyByLocale: Record<SiteLocale, PaymentCopy> = {
  pt: {
    title: 'Verificação do pagamento', language: 'Idioma', loading: 'Carregando inscrição...',
    errMissing: 'Falta o id da inscrição ou o token de acesso.', errLoad: 'Falha ao carregar a inscrição.',
    errNotFound: 'Inscrição não encontrada.', errSubmit: 'Falha ao enviar a resposta.',
    intro: 'Verifique se o pagamento está em ordem e aprove-o ou rejeite-o.',
    applicant: 'Inscrito', church: 'Igreja ou centro', mode: 'Modalidade',
    modeLodging: 'Hospedagem e alimentação', modeMeals: 'Somente alimentação', modeSpiritual: 'Somente trabalhos',
    total: 'Total', paymentProof: 'Comprovante de pagamento', paymentProofNone: 'Nenhum comprovante enviado.',
    openProof: 'Abrir comprovante', decision: 'Decisão do pagamento', decApproved: 'Pagamento aprovado',
    decRejected: 'Pagamento rejeitado', decPending: 'Pendente', leaderPending: 'Aguardando a aprovação do dirigente.',
    approve: 'Aprovar pagamento', approving: 'Aprovando…', reject: 'Rejeitar pagamento', rejecting: 'Rejeitando…',
    recorded: 'Resposta registrada.', fullyApproved: 'A inscrição foi totalmente aprovada.'
  },
  en: {
    title: 'Payment verification', language: 'Language', loading: 'Loading registration...',
    errMissing: 'Missing registration id or access token.', errLoad: 'Failed to load registration.',
    errNotFound: 'Registration not found.', errSubmit: 'Failed to submit response.',
    intro: 'Verify that the payment is in order and approve or reject it.',
    applicant: 'Applicant', church: 'Church or center', mode: 'Mode',
    modeLodging: 'Lodging and meals', modeMeals: 'Meals only', modeSpiritual: 'Spiritual works only',
    total: 'Total', paymentProof: 'Payment proof', paymentProofNone: 'No proof uploaded.',
    openProof: 'Open proof', decision: 'Payment decision', decApproved: 'Payment approved',
    decRejected: 'Payment rejected', decPending: 'Pending', leaderPending: 'Awaiting the reference church approval.',
    approve: 'Approve payment', approving: 'Approving…', reject: 'Reject payment', rejecting: 'Rejecting…',
    recorded: 'Response recorded.', fullyApproved: 'The registration is now fully approved.'
  },
  es: {
    title: 'Verificación del pago', language: 'Idioma', loading: 'Cargando inscripción...',
    errMissing: 'Falta el id de la inscripción o el token de acceso.', errLoad: 'Error al cargar la inscripción.',
    errNotFound: 'Inscripción no encontrada.', errSubmit: 'Error al enviar la respuesta.',
    intro: 'Verifica que el pago esté en orden y apruébalo o recházalo.',
    applicant: 'Inscrito', church: 'Iglesia o centro', mode: 'Modalidad',
    modeLodging: 'Alojamiento y comidas', modeMeals: 'Solo comidas', modeSpiritual: 'Solo trabajos',
    total: 'Total', paymentProof: 'Comprobante de pago', paymentProofNone: 'No se subió comprobante.',
    openProof: 'Abrir comprobante', decision: 'Decisión del pago', decApproved: 'Pago aprobado',
    decRejected: 'Pago rechazado', decPending: 'Pendiente', leaderPending: 'A la espera de la aprobación del dirigente.',
    approve: 'Aprobar pago', approving: 'Aprobando…', reject: 'Rechazar pago', rejecting: 'Rechazando…',
    recorded: 'Respuesta registrada.', fullyApproved: 'La inscripción ya está totalmente aprobada.'
  },
  it: {
    title: 'Verifica del pagamento', language: 'Lingua', loading: 'Caricamento iscrizione...',
    errMissing: "Manca l'id dell'iscrizione o il token di accesso.", errLoad: "Errore nel caricamento dell'iscrizione.",
    errNotFound: 'Iscrizione non trovata.', errSubmit: "Errore nell'invio della risposta.",
    intro: 'Verifica che il pagamento sia in ordine e approvalo o rifiutalo.',
    applicant: 'Iscritto', church: 'Chiesa o centro', mode: 'Modalità',
    modeLodging: 'Alloggio e vitto', modeMeals: 'Solo vitto', modeSpiritual: 'Solo lavori',
    total: 'Totale', paymentProof: 'Contabile del pagamento', paymentProofNone: 'Nessuna contabile caricata.',
    openProof: 'Apri contabile', decision: 'Decisione sul pagamento', decApproved: 'Pagamento approvato',
    decRejected: 'Pagamento rifiutato', decPending: 'In sospeso', leaderPending: 'In attesa dell\'approvazione del dirigente.',
    approve: 'Approva pagamento', approving: 'Approvazione…', reject: 'Rifiuta pagamento', rejecting: 'Rifiuto…',
    recorded: 'Risposta registrata.', fullyApproved: 'L\'iscrizione è ora completamente approvata.'
  }
};

function formatCurrency(value: number, tag: string) {
  return new Intl.NumberFormat(tag, { style: 'currency', currency: 'EUR' }).format(value);
}

function paymentBadgeClasses(decision: PaymentDecision | null) {
  if (decision === 'approved') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (decision === 'rejected') return 'bg-rose-50 text-rose-800 border-rose-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

export default function PaymentReviewPage() {
  const { locale, setLocale } = useSiteLocale();
  const copy = copyByLocale[locale];
  const tag = localeTag[locale];

  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const id = params.id ?? '';
  const token = searchParams.get('t') ?? '';
  const eventId = searchParams.get('e') ?? undefined;

  const [data, setData] = useState<PaymentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState<PaymentDecision | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!id || !token) {
      setLoading(false);
      setLoadError(copy.errMissing);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchPaymentView({ id, token, eventId })
      .then(view => { if (!cancelled) setData(view); })
      .catch(error => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : copy.errLoad);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id, token, eventId, copy.errMissing, copy.errLoad]);

  const fullName = useMemo(() => (data ? `${data.firstName} ${data.lastName}`.trim() : ''), [data]);

  async function handleSubmit(decision: PaymentDecision) {
    setSubmitError('');
    setFeedback('');
    setSubmitting(decision);
    try {
      const next = await submitPaymentResponse({ id, token, eventId, decision });
      setData(next);
      setFeedback(copy.recorded);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : copy.errSubmit);
    } finally {
      setSubmitting(null);
    }
  }

  const languageSelect = (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      <span className="sr-only">{copy.language}</span>
      <select
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm"
        value={locale}
        onChange={event => setLocale(event.target.value as SiteLocale)}
      >
        {siteLocaleOptions.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );

  if (loading) {
    return <div className="mx-auto max-w-2xl p-6 text-sm text-slate-600">{copy.loading}</div>;
  }

  if (loadError || !data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <div className="flex justify-end">{languageSelect}</div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{loadError || copy.errNotFound}</div>
      </div>
    );
  }

  const attendanceLabel = data.attendanceMode === 'lodging'
    ? copy.modeLodging
    : data.attendanceMode === 'meals'
      ? copy.modeMeals
      : data.attendanceMode === 'spiritual'
        ? copy.modeSpiritual
        : '—';

  const decisionLabel = data.paymentApproval === 'approved'
    ? copy.decApproved
    : data.paymentApproval === 'rejected'
      ? copy.decRejected
      : copy.decPending;

  const leaderApproved = data.leaderApproval === 'approved';

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.title}</p>
          <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
          <p className="text-sm text-slate-600">{copy.intro}</p>
        </div>
        {languageSelect}
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">{copy.church}</dt>
            <dd className="text-sm text-slate-800">{data.church || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">{copy.mode}</dt>
            <dd className="text-sm text-slate-800">{attendanceLabel}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">{copy.total}</dt>
            <dd className="text-sm font-semibold text-slate-900">{formatCurrency(data.contribution.total, tag)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">{copy.paymentProof}</dt>
            <dd className="text-sm text-slate-800">
              {data.paymentProofUrl ? (
                <a className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800" href={data.paymentProofUrl} target="_blank" rel="noreferrer">
                  {copy.openProof}{data.paymentProofName ? ` (${data.paymentProofName})` : ''}
                </a>
              ) : (
                copy.paymentProofNone
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.decision}</h2>
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${paymentBadgeClasses(data.paymentApproval)}`}>
            {decisionLabel}
          </span>
        </div>

        {!leaderApproved ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{copy.leaderPending}</p>
        ) : null}

        {data.status === 'approved' ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{copy.fullyApproved}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
            disabled={submitting !== null}
            onClick={() => handleSubmit('approved')}
          >
            {submitting === 'approved' ? copy.approving : copy.approve}
          </button>
          <button
            type="button"
            className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-60"
            disabled={submitting !== null}
            onClick={() => handleSubmit('rejected')}
          >
            {submitting === 'rejected' ? copy.rejecting : copy.reject}
          </button>
        </div>

        {feedback ? <p className="text-sm text-emerald-700">{feedback}</p> : null}
        {submitError ? <p className="text-sm text-rose-700">{submitError}</p> : null}
      </section>
    </div>
  );
}
