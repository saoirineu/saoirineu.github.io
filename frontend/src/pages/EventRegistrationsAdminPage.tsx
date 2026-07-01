import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchEvent, type EventLocale } from '../lib/events';
import {
  deleteEventRegistration,
  fetchEventCapacity,
  fetchEventRegistrations,
  resolveEventDocumentUrl,
  totalEventCapacity,
  totalEventSlotsAvailable,
  updateEventRegistrationPaymentApproval,
  updateEventRegistrationStatus,
  type EventRegistrationRecord,
  type EventRegistrationStatus
} from '../lib/eventRegistrations';

const statusOptions: EventRegistrationStatus[] = ['pending', 'approved', 'under-review', 'payment-overdue', 'rejected', 'archived'];

const statusLabels: Record<EventRegistrationStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  'under-review': 'Em revisão',
  'payment-overdue': 'Prazo expirado',
  rejected: 'Rejeitado',
  archived: 'Arquivado'
};

const statusAccent: Record<EventRegistrationStatus, string> = {
  pending: 'border-slate-200 bg-slate-50 text-slate-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'under-review': 'border-amber-200 bg-amber-50 text-amber-800',
  'payment-overdue': 'border-rose-200 bg-rose-50 text-rose-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
  archived: 'border-violet-200 bg-violet-50 text-violet-800'
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

function leaderBadge(registration: EventRegistrationRecord) {
  const { leaderApproval, interview } = registration;
  if (!leaderApproval) return null;
  const label =
    leaderApproval === 'approved' ? 'Líder: aprovado'
    : leaderApproval === 'approved-interview' ? 'Líder: aprovado (entrevista)'
    : leaderApproval === 'approved-psychologist' ? 'Líder: aprovado (psicólogo)'
    : 'Líder: rejeitado';
  const cls =
    leaderApproval === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : leaderApproval === 'rejected' ? 'border-rose-200 bg-rose-50 text-rose-800'
    : 'border-amber-200 bg-amber-50 text-amber-800';
  const interviewText = interview?.status === 'awaiting'
    ? ` · aguardando ${interview.required === 'psychologist' ? 'psicólogo' : 'entrevista'}`
    : interview
      ? ` · pós-entrevista: ${interview.status === 'approved' ? 'aprovado' : 'rejeitado'}`
      : '';
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${cls}`}>{label}{interviewText}</span>;
}

function paymentBadge(registration: EventRegistrationRecord) {
  const { paymentApproval } = registration;
  if (!paymentApproval) return null;
  const label = paymentApproval === 'approved' ? 'Pagamento: aprovado' : 'Pagamento: rejeitado';
  const cls = paymentApproval === 'approved'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-rose-200 bg-rose-50 text-rose-800';
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${cls}`}>{label}</span>;
}

async function openDocument(path?: string) {
  if (!path) return;
  const url = await resolveEventDocumentUrl(path);
  window.open(url, '_blank', 'noopener');
}

export default function EventRegistrationsAdminPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const qc = useQueryClient();

  const eventQuery = useQuery({ queryKey: ['event', slug], queryFn: () => fetchEvent(slug), enabled: !!slug });
  const event = eventQuery.data ?? null;

  const registrationsQuery = useQuery({
    queryKey: ['eventRegistrations', slug],
    queryFn: () => fetchEventRegistrations(slug),
    enabled: !!slug
  });

  const capacityQuery = useQuery({ queryKey: ['eventCapacity', slug], queryFn: () => fetchEventCapacity(event!), enabled: !!event });

  const statusMutation = useMutation({
    mutationFn: (args: { id: string; status: EventRegistrationStatus }) => updateEventRegistrationStatus({ event: event!, ...args }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['eventRegistrations', slug] });
      await qc.invalidateQueries({ queryKey: ['eventCapacity', slug] });
    }
  });

  const paymentMutation = useMutation({
    mutationFn: (args: { id: string; paymentApproval: 'approved' | 'rejected' }) =>
      updateEventRegistrationPaymentApproval({ event: event!, ...args }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['eventRegistrations', slug] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (registration: EventRegistrationRecord) => deleteEventRegistration({ event: event!, registration }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['eventRegistrations', slug] });
      await qc.invalidateQueries({ queryKey: ['eventCapacity', slug] });
    }
  });

  if (eventQuery.isLoading) return <div className="text-sm text-slate-600">Carregando…</div>;
  if (!event) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Evento não encontrado.</div>;

  const locale = 'pt' as EventLocale;
  const title = event.title[locale] || event.title.en || event.slug;
  const registrations = registrationsQuery.data ?? [];
  const slotsAvailable = capacityQuery.data ? totalEventSlotsAvailable(capacityQuery.data) : totalEventCapacity(event);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Inscrições — {title}</h1>
          <p className="text-sm text-slate-600">{registrations.length} inscrição(ões) · {slotsAvailable} / {totalEventCapacity(event)} vagas disponíveis</p>
        </div>
        <Link to="/admin/events" className="text-xs font-medium text-blue-700 underline">← Eventos</Link>
      </div>

      {registrations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">Nenhuma inscrição ainda.</div>
      ) : null}

      <div className="space-y-3">
        {registrations.map(registration => (
          <article key={registration.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{registration.firstName} {registration.lastName}</h2>
                <p className="text-sm text-slate-600">{registration.country} · {registration.church} · {registration.centerLeader}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {registration.attendanceMode} · {registration.selectedWorks.length} trabalho(s) · {formatCurrency(registration.contribution.total)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">{leaderBadge(registration)}{paymentBadge(registration)}</div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className={`inline-flex rounded-xl border px-3 py-2 text-sm ${statusAccent[registration.status]}`}>
                  <select
                    className="bg-transparent text-sm font-medium focus:outline-none"
                    value={registration.status}
                    disabled={statusMutation.isPending || deleteMutation.isPending}
                    onChange={e => statusMutation.mutate({ id: registration.id, status: e.target.value as EventRegistrationStatus })}
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{statusLabels[status]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    className="rounded border border-emerald-300 px-2 py-1 font-medium text-emerald-700 disabled:opacity-50"
                    disabled={paymentMutation.isPending || registration.paymentApproval === 'approved'}
                    onClick={() => paymentMutation.mutate({ id: registration.id, paymentApproval: 'approved' })}
                  >
                    Aprovar pagamento
                  </button>
                  <button
                    type="button"
                    className="rounded border border-rose-300 px-2 py-1 font-medium text-rose-700 disabled:opacity-50"
                    disabled={paymentMutation.isPending || registration.paymentApproval === 'rejected'}
                    onClick={() => paymentMutation.mutate({ id: registration.id, paymentApproval: 'rejected' })}
                  >
                    Rejeitar pagamento
                  </button>
                  {registration.identityDocumentPath ? <button type="button" className="rounded border border-slate-300 px-2 py-1 font-medium text-slate-700" onClick={() => openDocument(registration.identityDocumentPath)}>Documento</button> : null}
                  {registration.paymentProofPath ? <button type="button" className="rounded border border-slate-300 px-2 py-1 font-medium text-slate-700" onClick={() => openDocument(registration.paymentProofPath)}>Comprovante</button> : null}
                  {registration.consentDocumentPath ? <button type="button" className="rounded border border-slate-300 px-2 py-1 font-medium text-slate-700" onClick={() => openDocument(registration.consentDocumentPath)}>Consentimento</button> : null}
                  <button
                    type="button"
                    className="rounded border border-red-200 px-2 py-1 font-medium text-red-700 disabled:opacity-50"
                    disabled={deleteMutation.isPending && deleteMutation.variables?.id === registration.id}
                    onClick={() => { if (window.confirm('Excluir esta inscrição?')) deleteMutation.mutate(registration); }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
