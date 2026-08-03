import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  decideConsent,
  fetchUserConsents,
  resolveConsentDocumentUrl,
  type ConsentRecord
} from '../../lib/consents';
import type { SiteLocale } from '../../lib/siteLocale';
import { useAuth } from '../../providers/useAuth';

const copyByLocale = {
  pt: {
    title: 'Consenso informato',
    none: 'Nenhum consenso enviado.',
    uploadedOn: 'Enviado em',
    approvedOn: 'Aprovado em',
    open: 'Abrir documento',
    approve: 'Aprovar',
    reject: 'Recusar',
    forEvent: 'evento',
    status: { pending: 'Aguardando revisão', approved: 'Aprovado', rejected: 'Recusado' }
  },
  en: {
    title: 'Informed consent',
    none: 'No consent submitted.',
    uploadedOn: 'Sent on',
    approvedOn: 'Approved on',
    open: 'Open document',
    approve: 'Approve',
    reject: 'Reject',
    forEvent: 'event',
    status: { pending: 'Awaiting review', approved: 'Approved', rejected: 'Rejected' }
  },
  es: {
    title: 'Consenso informato',
    none: 'Ningún consentimiento enviado.',
    uploadedOn: 'Enviado el',
    approvedOn: 'Aprobado el',
    open: 'Abrir documento',
    approve: 'Aprobar',
    reject: 'Rechazar',
    forEvent: 'evento',
    status: { pending: 'A la espera de revisión', approved: 'Aprobado', rejected: 'Rechazado' }
  },
  it: {
    title: 'Consenso informato',
    none: 'Nessun consenso inviato.',
    uploadedOn: 'Inviato il',
    approvedOn: 'Approvato il',
    open: 'Apri documento',
    approve: 'Approva',
    reject: 'Rifiuta',
    forEvent: 'evento',
    status: { pending: 'In attesa di revisione', approved: 'Approvato', rejected: 'Rifiutato' }
  }
} as const;

function statusClass(status: ConsentRecord['status']) {
  const base = 'rounded-full px-2 py-0.5 text-[11px] font-medium ';
  if (status === 'approved') return base + 'bg-emerald-100 text-emerald-800';
  if (status === 'rejected') return base + 'bg-red-100 text-red-800';
  return base + 'bg-amber-100 text-amber-800';
}

/**
 * Consents a member submitted, with the approve/reject decision. Approving is
 * what anchors the 12-month validity window used by consentRequired().
 */
export function ConsentsPanel({ uid, locale }: { uid: string; locale: SiteLocale }) {
  const copy = copyByLocale[locale];
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');

  const consentsQuery = useQuery({
    queryKey: ['consents', uid],
    queryFn: () => fetchUserConsents(uid)
  });

  const decisionMutation = useMutation({
    mutationFn: ({ consentId, decision }: { consentId: string; decision: 'approved' | 'rejected' }) =>
      decideConsent(uid, consentId, decision, currentUser?.uid ?? 'unknown'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consents', uid] }),
    onError: (error: unknown) => setErrorMsg(error instanceof Error ? error.message : String(error))
  });

  async function openDocument(path: string) {
    try {
      window.open(await resolveConsentDocumentUrl(path), '_blank', 'noopener');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : String(error));
    }
  }

  const consents = consentsQuery.data ?? [];

  return (
    <div className="border-t border-slate-100 px-6 py-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.title}</h3>

      {consentsQuery.isLoading ? (
        <p className="text-xs text-slate-400">...</p>
      ) : consents.length === 0 ? (
        <p className="text-xs text-slate-400">{copy.none}</p>
      ) : (
        <ul className="space-y-2">
          {consents.map(consent => (
            <li key={consent.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <span className={statusClass(consent.status)}>{copy.status[consent.status]}</span>
              <span>
                {copy.uploadedOn} {consent.uploadedAt ? consent.uploadedAt.toLocaleDateString(locale) : '—'}
              </span>
              {consent.approvedAt ? (
                <span>
                  · {copy.approvedOn} {consent.approvedAt.toLocaleDateString(locale)}
                </span>
              ) : null}
              {consent.eventId ? <span className="text-slate-400">· {copy.forEvent}: {consent.eventId}</span> : null}

              {consent.documentPath ? (
                <button
                  type="button"
                  className="font-medium text-blue-700 hover:underline"
                  onClick={() => openDocument(consent.documentPath!)}
                >
                  {copy.open}
                </button>
              ) : null}

              {consent.status !== 'approved' ? (
                <button
                  type="button"
                  className="ml-auto rounded-lg border border-emerald-300 bg-white px-2 py-1 font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
                  disabled={decisionMutation.isPending}
                  onClick={() => decisionMutation.mutate({ consentId: consent.id, decision: 'approved' })}
                >
                  {copy.approve}
                </button>
              ) : null}
              {consent.status !== 'rejected' ? (
                <button
                  type="button"
                  className="rounded-lg border border-red-300 bg-white px-2 py-1 font-medium text-red-800 hover:bg-red-50 disabled:opacity-60"
                  disabled={decisionMutation.isPending}
                  onClick={() => decisionMutation.mutate({ consentId: consent.id, decision: 'rejected' })}
                >
                  {copy.reject}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {errorMsg ? <p className="mt-2 text-xs text-red-600">{errorMsg}</p> : null}
    </div>
  );
}
