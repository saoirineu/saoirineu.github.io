import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createApprovedSnapshot,
  fetchUsers,
  updateUserAdminNote,
  updateUserApprovalStatus,
  type UserApprovalStatus,
  type UserProfile
} from '../lib/users';
import { useAuth } from '../providers/useAuth';
import { useSiteLocale } from '../providers/useSiteLocale';
import { UserProfileReviewModal } from './admin/UserProfileReviewModal';
import { approvalStatusButtonClass, profileLabelsByLocale } from './admin/userReview';

/**
 * Review queue for ICEFLU membership applications. Deliberately separate from
 * /admin/users, which answers "who exists?": this one answers "what needs my
 * attention?", so it opens on the pending applications, oldest first, and
 * carries no privilege or notification controls. Both approve through the same
 * modal, so a decision made here is identical to one made there.
 */

type StatusFilter = UserApprovalStatus | 'all';

const FILTER_ORDER: StatusFilter[] = ['pending', 'needs-info', 'approved', 'needs-profile', 'all'];

const copyByLocale = {
  pt: {
    title: 'Inscrições ICEFLU',
    intro: 'Analise os formulários enviados, os documentos e decida sobre cada inscrição.',
    search: 'Buscar por nome, email ou código fiscal',
    submitted: 'Enviado em',
    name: 'Nome',
    email: 'Email',
    status: 'Situação',
    neverSubmitted: '—',
    empty: 'Nenhuma inscrição nesta situação.',
    loading: 'Carregando...',
    loadError: 'Erro ao carregar as inscrições.',
    updateError: 'Erro ao atualizar a inscrição.',
    filters: {
      pending: 'Aguardando análise',
      'needs-info': 'Revisão solicitada',
      approved: 'Aprovadas',
      'needs-profile': 'Formulário não enviado',
      all: 'Todas'
    } as Record<StatusFilter, string>
  },
  en: {
    title: 'ICEFLU registrations',
    intro: 'Review the submitted forms and documents, and decide on each application.',
    search: 'Search by name, email or fiscal code',
    submitted: 'Submitted',
    name: 'Name',
    email: 'Email',
    status: 'Status',
    neverSubmitted: '—',
    empty: 'No registration in this state.',
    loading: 'Loading...',
    loadError: 'Error loading the registrations.',
    updateError: 'Error updating the registration.',
    filters: {
      pending: 'Awaiting review',
      'needs-info': 'Revision requested',
      approved: 'Approved',
      'needs-profile': 'Form not submitted',
      all: 'All'
    } as Record<StatusFilter, string>
  },
  es: {
    title: 'Inscripciones ICEFLU',
    intro: 'Revise los formularios enviados y los documentos, y decida sobre cada inscripción.',
    search: 'Buscar por nombre, correo o código fiscal',
    submitted: 'Enviado el',
    name: 'Nombre',
    email: 'Correo',
    status: 'Estado',
    neverSubmitted: '—',
    empty: 'Ninguna inscripción en este estado.',
    loading: 'Cargando...',
    loadError: 'Error al cargar las inscripciones.',
    updateError: 'Error al actualizar la inscripción.',
    filters: {
      pending: 'A la espera de revisión',
      'needs-info': 'Revisión solicitada',
      approved: 'Aprobadas',
      'needs-profile': 'Formulario no enviado',
      all: 'Todas'
    } as Record<StatusFilter, string>
  },
  it: {
    title: 'Iscrizioni ICEFLU',
    intro: 'Esamina i moduli inviati e i documenti, e decidi su ogni iscrizione.',
    search: 'Cerca per nome, email o codice fiscale',
    submitted: 'Inviato il',
    name: 'Nome',
    email: 'Email',
    status: 'Stato',
    neverSubmitted: '—',
    empty: 'Nessuna iscrizione in questo stato.',
    loading: 'Caricamento...',
    loadError: 'Errore nel caricamento delle iscrizioni.',
    updateError: "Errore nell'aggiornamento dell'iscrizione.",
    filters: {
      pending: 'In attesa di revisione',
      'needs-info': 'Revisione richiesta',
      approved: 'Approvate',
      'needs-profile': 'Modulo non inviato',
      all: 'Tutte'
    } as Record<StatusFilter, string>
  }
} as const;

function displayNameOf(user: UserProfile) {
  return user.fullName ?? user.displayName ?? ([user.firstName, user.surname].filter(Boolean).join(' ') || '—');
}

function submittedAtMillis(user: UserProfile) {
  return user.approvalSubmittedAt ? user.approvalSubmittedAt.toMillis() : 0;
}

export default function MembershipReviewPage() {
  const { locale } = useSiteLocale();
  const copy = copyByLocale[locale];
  const labels = profileLabelsByLocale[locale];
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [search, setSearch] = useState('');
  const [reviewUid, setReviewUid] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const allUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const counts = useMemo(() => {
    const tally = { pending: 0, 'needs-info': 0, approved: 0, 'needs-profile': 0, all: allUsers.length } as Record<StatusFilter, number>;
    for (const user of allUsers) {
      const status = user.approvalStatus ?? 'needs-profile';
      tally[status] = (tally[status] ?? 0) + 1;
    }
    return tally;
  }, [allUsers]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allUsers
      .filter(user => statusFilter === 'all' || (user.approvalStatus ?? 'needs-profile') === statusFilter)
      .filter(user => {
        if (!term) return true;
        return [displayNameOf(user), user.email ?? '', user.fiscalCode ?? '']
          .some(field => field.toLowerCase().includes(term));
      })
      // Oldest submission first: a queue should drain in the order people waited.
      // Anything never submitted has no date and sorts to the end, by name.
      .sort((left, right) => {
        const leftAt = submittedAtMillis(left);
        const rightAt = submittedAtMillis(right);
        if (leftAt && rightAt) return leftAt - rightAt;
        if (leftAt) return -1;
        if (rightAt) return 1;
        return displayNameOf(left).localeCompare(displayNameOf(right));
      });
  }, [allUsers, statusFilter, search]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });
  const onMutationError = (error: unknown) =>
    setErrorMessage(error instanceof Error ? error.message : copy.updateError);

  const approvalMutation = useMutation({
    mutationFn: async ({ uid, status, profile }: { uid: string; status: UserApprovalStatus; profile: UserProfile }) => {
      if (status === 'approved') {
        await createApprovedSnapshot(uid, profile, currentUser?.uid ?? 'unknown');
      }
      return updateUserApprovalStatus(uid, status, currentUser?.uid ?? 'unknown');
    },
    onSuccess: () => { setReviewUid(null); void invalidate(); },
    onError: onMutationError
  });

  const noteMutation = useMutation({
    mutationFn: ({ uid, note }: { uid: string; note: string }) => updateUserAdminNote(uid, note),
    onSuccess: () => void invalidate(),
    onError: onMutationError
  });

  const requestReviewMutation = useMutation({
    mutationFn: async ({ uid, note }: { uid: string; note: string }) => {
      await updateUserAdminNote(uid, note);
      return updateUserApprovalStatus(uid, 'needs-info', currentUser?.uid ?? 'unknown');
    },
    onSuccess: () => { setReviewUid(null); void invalidate(); },
    onError: onMutationError
  });

  const isBusy = approvalMutation.isPending || noteMutation.isPending || requestReviewMutation.isPending;
  const reviewUser = rows.find(user => user.uid === reviewUid) ?? allUsers.find(user => user.uid === reviewUid);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{copy.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{copy.intro}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTER_ORDER.map(option => (
          <button
            key={option}
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              statusFilter === option
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => setStatusFilter(option)}
          >
            {copy.filters[option]} ({counts[option] ?? 0})
          </button>
        ))}
      </div>

      <input
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:max-w-md"
        value={search}
        placeholder={copy.search}
        onChange={event => setSearch(event.target.value)}
      />

      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

      {usersQuery.isLoading ? (
        <p className="text-sm text-slate-500">{copy.loading}</p>
      ) : usersQuery.error ? (
        <p className="text-sm text-red-600">{copy.loadError}</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">{copy.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">{copy.name}</th>
                <th className="px-4 py-3 font-medium">{copy.email}</th>
                <th className="px-4 py-3 font-medium">{copy.submitted}</th>
                <th className="px-4 py-3 font-medium">{copy.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(user => {
                const status = user.approvalStatus ?? 'needs-profile';
                return (
                  <tr
                    key={user.uid}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setReviewUid(user.uid)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{displayNameOf(user)}</span>
                      {user.fiscalCode ? (
                        <span className="ml-2 font-mono text-xs text-slate-400">{user.fiscalCode}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {user.approvalSubmittedAt
                        ? new Date(user.approvalSubmittedAt.toMillis()).toLocaleString(locale)
                        : copy.neverSubmitted}
                    </td>
                    <td className="px-4 py-3">
                      <span className={approvalStatusButtonClass(status)}>{copy.filters[status]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reviewUser ? (
        <UserProfileReviewModal
          user={reviewUser}
          labels={labels}
          locale={locale}
          statusLabel={copy.filters[reviewUser.approvalStatus ?? 'needs-profile']}
          isBusy={isBusy}
          onApprove={() => approvalMutation.mutate({ uid: reviewUser.uid, status: 'approved', profile: reviewUser })}
          onRevoke={() => approvalMutation.mutate({ uid: reviewUser.uid, status: 'needs-profile', profile: reviewUser })}
          onRequestReview={note => requestReviewMutation.mutate({ uid: reviewUser.uid, note })}
          onSaveNote={note => noteMutation.mutate({ uid: reviewUser.uid, note })}
          onClose={() => setReviewUid(null)}
        />
      ) : null}
    </div>
  );
}
