import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import {
  fetchLeaderView,
  submitLeaderResponse,
  type LeaderView,
  type InterviewOutcome,
  type LeaderApprovalDecision
} from '../lib/leaderReview';
import { siteLocaleOptions, type SiteLocale } from '../lib/siteLocale';
import { useSiteLocale } from '../providers/useSiteLocale';

type LeaderCopy = {
  leaderReview: string;
  language: string;
  loading: string;
  errMissing: string;
  errLoad: string;
  errNotFound: string;
  errSubmit: string;
  participation: string;
  mode: string;
  stay: string;
  selectedWorks: string;
  contribution: string;
  status: string;
  modeLodging: string;
  modeMeals: string;
  modeSpiritual: string;
  initiated: string;
  icefluMember: string;
  firstTime: string;
  returning: string;
  instructions: string;
  yourDecision: string;
  decApproved: string;
  decApprovedInterview: string;
  decApprovedPsychologist: string;
  decRejected: string;
  decPending: string;
  lastDecision: string;
  interviewWord: string;
  interviewPsychologist: string;
  awaitingConfirmation: string;
  confirmedApproved: string;
  confirmedRejected: string;
  resolved: string;
  recordOutcome: string;
  confirmApproval: string;
  confirming: string;
  rejectAfterInterview: string;
  rejecting: string;
  approve: string;
  approving: string;
  approveInterview: string;
  approvePsychologist: string;
  reject: string;
  saving: string;
  commentsTitle: string;
  noComments: string;
  addCommentLabel: string;
  addComment: string;
  respRecorded: string;
  outcomeRecorded: string;
  commentRecorded: string;
};

const localeTag: Record<SiteLocale, string> = { pt: 'pt-PT', en: 'en-GB', es: 'es-ES', it: 'it-IT' };

const copyByLocale: Record<SiteLocale, LeaderCopy> = {
  pt: {
    leaderReview: 'Revisão do dirigente', language: 'Idioma', loading: 'Carregando inscrição...',
    errMissing: 'Falta o id da inscrição ou o token de acesso.', errLoad: 'Falha ao carregar a inscrição.',
    errNotFound: 'Inscrição não encontrada.', errSubmit: 'Falha ao enviar a resposta.',
    participation: 'Participação', mode: 'Modalidade', stay: 'Permanência', selectedWorks: 'Trabalhos selecionados',
    contribution: 'Contribuição', status: 'Situação', modeLodging: 'Hospedagem e alimentação',
    modeMeals: 'Somente alimentação', modeSpiritual: 'Somente trabalhos', initiated: 'Fardado',
    icefluMember: 'Membro ICEFLU', firstTime: 'Primeira vez', returning: 'Retornando',
    instructions:
      'A pessoa indicada acima pediu para participar do Encontro Europeu e declarou fazer referência à sua igreja/centro.\n' +
      'Se você conhece esta pessoa e assume a responsabilidade de fazê-la participar do evento, pode clicar em "Aprovar".\n' +
      'Se acha mais oportuno não a fazer participar, pode clicar em "Rejeitar".\n' +
      'Se for a primeira vez que ela participa de um trabalho espiritual ou você não a conhece, pode indicar-lhe que faça uma entrevista de conhecimento com alguém de referência da sua igreja para depois decidir se a faz participar ou não. Nesse caso, clique em "Necessária entrevista de conhecimento" e indique nos comentários como fazer essa entrevista.',
    yourDecision: 'Sua decisão',
    decApproved: 'Aprovado', decApprovedInterview: 'Aprovado — entrevista necessária na primeira vez',
    decApprovedPsychologist: 'Aprovado — entrevista com psicólogo necessária', decRejected: 'Rejeitado', decPending: 'Pendente',
    lastDecision: 'Última decisão registrada em {date}.', interviewWord: 'Entrevista',
    interviewPsychologist: 'Entrevista com psicólogo', awaitingConfirmation: 'aguardando confirmação',
    confirmedApproved: 'confirmado: aprovado', confirmedRejected: 'confirmado: rejeitado', resolved: 'Resolvido em {date}.',
    recordOutcome: 'Registre o resultado da adesão após a entrevista:', confirmApproval: 'Confirmar aprovação',
    confirming: 'Confirmando…', rejectAfterInterview: 'Rejeitar após entrevista', rejecting: 'Rejeitando…',
    approve: 'Aprovar', approving: 'Aprovando…', approveInterview: 'Necessária entrevista de conhecimento',
    approvePsychologist: 'Necessária entrevista com psicólogo.', reject: 'Rejeitar', saving: 'Salvando…',
    commentsTitle: 'Comentários / observações', noComments: 'Nenhum comentário ainda.',
    addCommentLabel: 'Adicionar um comentário', addComment: 'Adicionar comentário',
    respRecorded: 'Resposta registrada: {x}.', outcomeRecorded: 'Resultado pós-entrevista registrado: {x}.',
    commentRecorded: 'Comentário registrado.'
  },
  en: {
    leaderReview: 'Leader review', language: 'Language', loading: 'Loading registration...',
    errMissing: 'Missing registration id or access token.', errLoad: 'Failed to load registration.',
    errNotFound: 'Registration not found.', errSubmit: 'Failed to submit response.',
    participation: 'Participation', mode: 'Mode', stay: 'Stay', selectedWorks: 'Selected works',
    contribution: 'Contribution', status: 'Status', modeLodging: 'Lodging and meals', modeMeals: 'Meals only',
    modeSpiritual: 'Spiritual works only', initiated: 'Initiated', icefluMember: 'ICEFLU member', firstTime: 'First time',
    returning: 'Returning',
    instructions:
      'The person indicated above has asked to take part in the Encontro Europeu and has declared that they refer to your church/center.\n' +
      'If you know this person and take responsibility for having them attend the event, you can click "Approve".\n' +
      'If you think it is more appropriate not to have them attend, you can click "Reject".\n' +
      'If it is their first time taking part in a spiritual work, or you do not know them, you can ask them to have an introductory interview with a reference person from your church before deciding whether to have them attend. In that case, click "Introductory interview required" and indicate in the comments how to arrange this interview.',
    yourDecision: 'Your decision', decApproved: 'Approved',
    decApprovedInterview: 'Approved — interview required for first-timers', decApprovedPsychologist: 'Approved — psychologist interview required',
    decRejected: 'Rejected', decPending: 'Pending', lastDecision: 'Last decision recorded {date}.',
    interviewWord: 'Interview', interviewPsychologist: 'Interview with a psychologist',
    awaitingConfirmation: 'awaiting confirmation', confirmedApproved: 'confirmed: approved',
    confirmedRejected: 'confirmed: rejected', resolved: 'Resolved {date}.',
    recordOutcome: 'Record the membership outcome after the interview:', confirmApproval: 'Confirm approval',
    confirming: 'Confirming…', rejectAfterInterview: 'Reject after interview', rejecting: 'Rejecting…',
    approve: 'Approve', approving: 'Approving…', approveInterview: 'Introductory interview required',
    approvePsychologist: 'Interview with a psychologist required.', reject: 'Reject', saving: 'Saving…',
    commentsTitle: 'Comments / observations', noComments: 'No comments yet.', addCommentLabel: 'Add a comment',
    addComment: 'Add comment', respRecorded: 'Response recorded: {x}.',
    outcomeRecorded: 'Post-interview outcome recorded: {x}.', commentRecorded: 'Comment recorded.'
  },
  es: {
    leaderReview: 'Revisión del dirigente', language: 'Idioma', loading: 'Cargando inscripción...',
    errMissing: 'Falta el id de la inscripción o el token de acceso.', errLoad: 'Error al cargar la inscripción.',
    errNotFound: 'Inscripción no encontrada.', errSubmit: 'Error al enviar la respuesta.',
    participation: 'Participación', mode: 'Modalidad', stay: 'Estancia', selectedWorks: 'Trabajos seleccionados',
    contribution: 'Contribución', status: 'Situación', modeLodging: 'Alojamiento y comidas', modeMeals: 'Solo comidas',
    modeSpiritual: 'Solo trabajos', initiated: 'Fardado', icefluMember: 'Miembro ICEFLU', firstTime: 'Primera vez',
    returning: 'Recurrente',
    instructions:
      'La persona indicada arriba ha pedido participar en el Encontro Europeu y ha declarado que hace referencia a tu iglesia/centro.\n' +
      'Si conoces a esta persona y asumes la responsabilidad de hacerla participar en el evento, puedes hacer clic en "Aprobar".\n' +
      'Si crees que es más oportuno no hacerla participar, puedes hacer clic en "Rechazar".\n' +
      'Si es la primera vez que participa en un trabajo espiritual o no la conoces, puedes indicarle que haga una entrevista de conocimiento con alguien de referencia de tu iglesia para luego decidir si la haces participar o no. En ese caso, haz clic en "Entrevista de conocimiento requerida" e indica en los comentarios cómo hacer esta entrevista.',
    yourDecision: 'Tu decisión', decApproved: 'Aprobado',
    decApprovedInterview: 'Aprobado — entrevista requerida la primera vez',
    decApprovedPsychologist: 'Aprobado — entrevista con psicólogo requerida', decRejected: 'Rechazado',
    decPending: 'Pendiente', lastDecision: 'Última decisión registrada el {date}.', interviewWord: 'Entrevista',
    interviewPsychologist: 'Entrevista con psicólogo', awaitingConfirmation: 'esperando confirmación',
    confirmedApproved: 'confirmado: aprobado', confirmedRejected: 'confirmado: rechazado', resolved: 'Resuelto el {date}.',
    recordOutcome: 'Registra el resultado de la adhesión tras la entrevista:', confirmApproval: 'Confirmar aprobación',
    confirming: 'Confirmando…', rejectAfterInterview: 'Rechazar tras entrevista', rejecting: 'Rechazando…',
    approve: 'Aprobar', approving: 'Aprobando…', approveInterview: 'Entrevista de conocimiento requerida',
    approvePsychologist: 'Se requiere entrevista con psicólogo.', reject: 'Rechazar', saving: 'Guardando…',
    commentsTitle: 'Comentarios / observaciones', noComments: 'Aún no hay comentarios.',
    addCommentLabel: 'Añadir un comentario', addComment: 'Añadir comentario', respRecorded: 'Respuesta registrada: {x}.',
    outcomeRecorded: 'Resultado tras la entrevista registrado: {x}.', commentRecorded: 'Comentario registrado.'
  },
  it: {
    leaderReview: 'Revisione del dirigente', language: 'Lingua', loading: 'Caricamento iscrizione...',
    errMissing: "Manca l'id dell'iscrizione o il token di accesso.", errLoad: "Errore nel caricamento dell'iscrizione.",
    errNotFound: 'Iscrizione non trovata.', errSubmit: "Errore nell'invio della risposta.",
    participation: 'Partecipazione', mode: 'Modalità', stay: 'Permanenza', selectedWorks: 'Lavori selezionati',
    contribution: 'Contributo', status: 'Stato', modeLodging: 'Alloggio e vitto', modeMeals: 'Solo vitto',
    modeSpiritual: 'Solo lavori', initiated: 'Fardado', icefluMember: 'Membro ICEFLU', firstTime: 'Prima volta',
    returning: 'Di ritorno',
    instructions:
      'La persona sopra indicata ha chiesto di partecipare all\'Encontro Europeu e ha dichiarato di fare riferimento alla vostra chiesa/centro.\n' +
      'Se conosci questa persona e ti assumi la responsabilità di farla partecipare all\'evento puoi cliccare su "Approva".\n' +
      'Se credi sia più opportuno non farla partecipare puoi cliccare su "Rifiuta".\n' +
      'Se è la prima volta che partecipa a un lavoro spirituale o non la conosci, puoi indicarle di fare un colloquio conoscitivo con qualcuno di riferimento della tua chiesa per poi decidere se farla partecipare o meno. In questo caso, clicca su "Necessario colloquio conoscitivo" e indica nei commenti come fare questo colloquio.',
    yourDecision: 'La tua decisione', decApproved: 'Approvato',
    decApprovedInterview: 'Approvato — colloquio necessario la prima volta',
    decApprovedPsychologist: 'Approvato — colloquio con psicologo necessario', decRejected: 'Rifiutato', decPending: 'In sospeso',
    lastDecision: 'Ultima decisione registrata il {date}.', interviewWord: 'Colloquio',
    interviewPsychologist: 'Colloquio con psicologo', awaitingConfirmation: 'in attesa di conferma',
    confirmedApproved: 'confermato: approvato', confirmedRejected: 'confermato: rifiutato', resolved: 'Risolto il {date}.',
    recordOutcome: "Registra l'esito dell'adesione dopo il colloquio:", confirmApproval: 'Conferma approvazione',
    confirming: 'Conferma…', rejectAfterInterview: 'Rifiuta dopo il colloquio', rejecting: 'Rifiuto…',
    approve: 'Approva', approving: 'Approvazione…', approveInterview: 'Necessario colloquio conoscitivo',
    approvePsychologist: 'Necessario colloquio con psicologo.', reject: 'Rifiuta', saving: 'Salvataggio…',
    commentsTitle: 'Commenti / osservazioni', noComments: 'Nessun commento ancora.',
    addCommentLabel: 'Aggiungi un commento', addComment: 'Aggiungi commento', respRecorded: 'Risposta registrata: {x}.',
    outcomeRecorded: 'Esito post-colloquio registrato: {x}.', commentRecorded: 'Commento registrato.'
  }
};

function decisionLabel(decision: LeaderApprovalDecision | null, copy: LeaderCopy) {
  if (decision === 'approved') return copy.decApproved;
  if (decision === 'approved-interview') return copy.decApprovedInterview;
  if (decision === 'approved-psychologist') return copy.decApprovedPsychologist;
  if (decision === 'rejected') return copy.decRejected;
  return copy.decPending;
}

function decisionBadgeClasses(decision: LeaderApprovalDecision | null) {
  if (decision === 'approved') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (decision === 'approved-interview' || decision === 'approved-psychologist') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (decision === 'rejected') return 'bg-rose-50 text-rose-800 border-rose-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function formatDateTime(value: number | null, tag: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

function formatCurrency(value: number, tag: string) {
  return new Intl.NumberFormat(tag, { style: 'currency', currency: 'EUR' }).format(value);
}

export default function LeaderReviewPage() {
  const { locale, setLocale } = useSiteLocale();
  const copy = copyByLocale[locale];
  const tag = localeTag[locale];

  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const id = params.id ?? '';
  const token = searchParams.get('t') ?? '';
  const eventId = searchParams.get('e') ?? undefined;

  const [data, setData] = useState<LeaderView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);
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
    fetchLeaderView({ id, token, eventId })
      .then(view => { if (!cancelled) setData(view); })
      .catch(error => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : copy.errLoad);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id, token, eventId, copy.errMissing, copy.errLoad]);

  const fullName = useMemo(() => {
    if (!data) return '';
    return `${data.firstName} ${data.lastName}`.trim();
  }, [data]);

  async function handleSubmit(
    key: string,
    args: { comment?: string; decision?: LeaderApprovalDecision; interviewOutcome?: InterviewOutcome }
  ) {
    setSubmitError('');
    setFeedback('');
    setSubmitting(key);
    try {
      const next = await submitLeaderResponse({ id, token, eventId, ...args });
      setData(next);
      if (args.comment) setComment('');
      setFeedback(
        args.decision
          ? copy.respRecorded.replace('{x}', decisionLabel(args.decision, copy))
          : args.interviewOutcome
            ? copy.outcomeRecorded.replace('{x}', args.interviewOutcome === 'approved' ? copy.decApproved : copy.decRejected)
            : copy.commentRecorded
      );
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
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {loadError || copy.errNotFound}
        </div>
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{copy.leaderReview}</p>
          <h1 className="text-2xl font-semibold text-slate-900">{fullName}</h1>
          <p className="text-sm text-slate-600">{data.country} · {data.church}</p>
        </div>
        {languageSelect}
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.participation}</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">{copy.mode}</dt>
            <dd className="text-sm text-slate-800">{attendanceLabel}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">{copy.stay}</dt>
            <dd className="text-sm text-slate-800">{data.checkIn ?? '—'} → {data.checkOut ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">{copy.selectedWorks}</dt>
            <dd className="text-sm text-slate-800">{data.selectedWorks.length ? data.selectedWorks.join(', ') : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">{copy.contribution}</dt>
            <dd className="text-sm text-slate-800">{formatCurrency(data.contribution.total, tag)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">{copy.status}</dt>
            <dd className="text-sm text-slate-800">
              <span className="inline-flex">
                {data.isInitiated ? `${copy.initiated} · ` : ''}
                {data.isIcefluMember ? `${copy.icefluMember} · ` : ''}
                {data.isNovice ? copy.firstTime : copy.returning}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.yourDecision}</h2>
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${decisionBadgeClasses(data.leaderApproval)}`}>
            {decisionLabel(data.leaderApproval, copy)}
          </span>
        </div>
        {data.leaderApprovalRespondedAt ? (
          <p className="text-xs text-slate-500">{copy.lastDecision.replace('{date}', formatDateTime(data.leaderApprovalRespondedAt, tag))}</p>
        ) : null}

        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          {copy.instructions.split('\n').map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>

        {data.interview ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-medium">
              {data.interview.required === 'psychologist' ? copy.interviewPsychologist : copy.interviewWord}
              {' — '}
              {data.interview.status === 'awaiting'
                ? copy.awaitingConfirmation
                : data.interview.status === 'approved' ? copy.confirmedApproved : copy.confirmedRejected}
            </div>
            {data.interview.resolvedAt ? (
              <div className="text-xs text-amber-700">{copy.resolved.replace('{date}', formatDateTime(data.interview.resolvedAt, tag))}</div>
            ) : null}
          </div>
        ) : null}

        {data.interview?.status === 'awaiting' ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">{copy.recordOutcome}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                disabled={submitting !== null}
                onClick={() => handleSubmit('interview-approved', { interviewOutcome: 'approved' })}
              >
                {submitting === 'interview-approved' ? copy.confirming : copy.confirmApproval}
              </button>
              <button
                type="button"
                className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                disabled={submitting !== null}
                onClick={() => handleSubmit('interview-rejected', { interviewOutcome: 'rejected' })}
              >
                {submitting === 'interview-rejected' ? copy.rejecting : copy.rejectAfterInterview}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
              disabled={submitting !== null}
              onClick={() => handleSubmit('approved', { decision: 'approved' })}
            >
              {submitting === 'approved' ? copy.approving : copy.approve}
            </button>
            <button
              type="button"
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"
              disabled={submitting !== null}
              onClick={() => handleSubmit('approved-interview', { decision: 'approved-interview' })}
            >
              {submitting === 'approved-interview' ? copy.saving : copy.approveInterview}
            </button>
            <button
              type="button"
              className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-60"
              disabled={submitting !== null}
              onClick={() => handleSubmit('rejected', { decision: 'rejected' })}
            >
              {submitting === 'rejected' ? copy.rejecting : copy.reject}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.commentsTitle}</h2>
        <ul className="space-y-2">
          {(data.leaderComments ?? []).length === 0 ? (
            <li className="text-sm text-slate-500">{copy.noComments}</li>
          ) : (
            (data.leaderComments ?? []).map((entry, index) => (
              <li key={`${entry.at ?? index}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <div className="text-xs text-slate-500">{formatDateTime(entry.at, tag)}</div>
                <div className="whitespace-pre-line">{entry.text}</div>
              </li>
            ))
          )}
        </ul>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600" htmlFor="leader-comment">{copy.addCommentLabel}</label>
          <textarea
            id="leader-comment"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            value={comment}
            onChange={event => setComment(event.target.value)}
          />
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            disabled={submitting !== null || !comment.trim()}
            onClick={() => handleSubmit('comment', { comment: comment.trim() })}
          >
            {submitting === 'comment' ? copy.saving : copy.addComment}
          </button>
        </div>
      </section>

      {submitError ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{submitError}</div> : null}
      {feedback ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{feedback}</div> : null}
    </div>
  );
}
