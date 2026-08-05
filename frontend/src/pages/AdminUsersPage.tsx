import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  hasRequiredRole,
  normalizeSystemRoles,
  privilegedSystemRoleOptions,
  type SystemRole
} from '../lib/systemRole';
import {
  BASELINE_NOTIFY_EMAILS,
  fetchNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings
} from '../lib/notificationSettings';
import {
  createApprovedSnapshot,
  fetchUsers,
  updateUserAdminNote,
  updateUserApprovalStatus,
  updateUserSystemRoles,
  type UserApprovalStatus,
  type UserProfile
} from '../lib/users';
import { useAuth } from '../providers/useAuth';
import { DeleteUserDialog } from './admin/DeleteUserDialog';
import {
  UserProfileReviewModal,
  approvalStatusButtonClass,
  profileLabelsByLocale
} from './admin/UserProfileReviewModal';
import { useSiteLocale } from '../providers/useSiteLocale';
import type { SiteLocale } from '../lib/siteLocale';
import { useSystemRole } from '../providers/useSystemRole';

const copyByLocale = {
  pt: {
    title: 'Central de usuários',
    subtitle: 'Aprove inscrições e defina privilégios administrativos.',
    loading: 'Carregando usuários...',
    loadError: 'Falha ao carregar usuários.',
    updateError: 'Erro ao atualizar usuário',
    updateSuccess: 'Privilégios atualizados com sucesso.',
    approvalSuccess: 'Usuário aprovado com sucesso.',
    remove: { column: 'Remover', action: 'Remover', notSelf: 'Você não pode remover a sua própria conta.' },
    uid: 'UID',
    name: 'Nome',
    email: 'Email',
    approval: 'Aprovação',
    privileges: 'Privilégios',
    approve: 'Aprovar',
    noName: 'Sem nome',
    noEmail: 'Sem email',
    approvalStatus: {
      'needs-profile': 'Perfil incompleto',
      pending: 'Pendente',
      approved: 'Aprovado',
      'needs-info': 'Precisa de ajuste'
    },
    notify: {
      title: 'Destinatários de notificações',
      subtitle: 'Escolha quem recebe o e-mail quando uma nova inscrição ICEFLU é enviada. Os endereços base recebem sempre.',
      baseline: 'Sempre notificados',
      column: 'Notificar',
      extraLabel: 'E-mails adicionais',
      extraPlaceholder: 'nome@exemplo.com',
      extraAdd: 'Adicionar',
      invalidEmail: 'Informe um e-mail válido.'
    },
    profileLabels: profileLabelsByLocale.pt
  },
  en: {
    title: 'User management',
    subtitle: 'Approve subscriptions and assign administrative privileges.',
    loading: 'Loading users...',
    loadError: 'Failed to load users.',
    updateError: 'Failed to update user',
    updateSuccess: 'Privileges updated successfully.',
    approvalSuccess: 'User approved successfully.',
    remove: { column: 'Remove', action: 'Remove', notSelf: 'You cannot remove your own account.' },
    uid: 'UID',
    name: 'Name',
    email: 'Email',
    approval: 'Approval',
    privileges: 'Privileges',
    approve: 'Approve',
    noName: 'No name',
    noEmail: 'No email',
    approvalStatus: {
      'needs-profile': 'Incomplete profile',
      pending: 'Pending',
      approved: 'Approved',
      'needs-info': 'Needs update'
    },
    notify: {
      title: 'Notification recipients',
      subtitle: 'Choose who receives the email when a new ICEFLU registration is submitted. The baseline addresses always receive it.',
      baseline: 'Always notified',
      column: 'Notify',
      extraLabel: 'Additional emails',
      extraPlaceholder: 'name@example.com',
      extraAdd: 'Add',
      invalidEmail: 'Enter a valid email.'
    },
    profileLabels: profileLabelsByLocale.en
  },
  es: {
    title: 'Central de usuarios',
    subtitle: 'Apruebe inscripciones y defina privilegios administrativos.',
    loading: 'Cargando usuarios...',
    loadError: 'Error al cargar usuarios.',
    updateError: 'Error al actualizar usuario',
    updateSuccess: 'Privilegios actualizados con éxito.',
    approvalSuccess: 'Usuario aprobado con éxito.',
    remove: { column: 'Eliminar', action: 'Eliminar', notSelf: 'No puede eliminar su propia cuenta.' },
    uid: 'UID',
    name: 'Nombre',
    email: 'Correo electrónico',
    approval: 'Aprobación',
    privileges: 'Privilegios',
    approve: 'Aprobar',
    noName: 'Sin nombre',
    noEmail: 'Sin correo',
    approvalStatus: {
      'needs-profile': 'Perfil incompleto',
      pending: 'Pendiente',
      approved: 'Aprobado',
      'needs-info': 'Necesita ajuste'
    },
    notify: {
      title: 'Destinatarios de notificaciones',
      subtitle: 'Elija quién recibe el correo cuando se envía una nueva inscripción ICEFLU. Las direcciones base siempre lo reciben.',
      baseline: 'Siempre notificados',
      column: 'Notificar',
      extraLabel: 'Correos adicionales',
      extraPlaceholder: 'nombre@ejemplo.com',
      extraAdd: 'Añadir',
      invalidEmail: 'Introduzca un correo válido.'
    },
    profileLabels: profileLabelsByLocale.es
  },
  it: {
    title: 'Gestione utenti',
    subtitle: 'Approva le iscrizioni e assegna privilegi amministrativi.',
    loading: 'Caricamento utenti...',
    loadError: 'Impossibile caricare gli utenti.',
    updateError: 'Errore nell\'aggiornare l\'utente',
    updateSuccess: 'Privilegi aggiornati con successo.',
    approvalSuccess: 'Utente approvato con successo.',
    remove: { column: 'Rimuovi', action: 'Rimuovi', notSelf: 'Non puoi rimuovere il tuo account.' },
    uid: 'UID',
    name: 'Nome',
    email: 'Email',
    approval: 'Approvazione',
    privileges: 'Privilegi',
    approve: 'Approva',
    noName: 'Senza nome',
    noEmail: 'Senza email',
    approvalStatus: {
      'needs-profile': 'Profilo incompleto',
      pending: 'In attesa',
      approved: 'Approvato',
      'needs-info': 'Da aggiornare'
    },
    notify: {
      title: 'Destinatari delle notifiche',
      subtitle: 'Scegli chi riceve l\'email quando viene inviata una nuova iscrizione ICEFLU. Gli indirizzi base la ricevono sempre.',
      baseline: 'Sempre notificati',
      column: 'Notifica',
      extraLabel: 'Email aggiuntive',
      extraPlaceholder: 'nome@esempio.com',
      extraAdd: 'Aggiungi',
      invalidEmail: 'Inserisci un\'email valida.'
    },
    profileLabels: profileLabelsByLocale.it
  }
} as const;

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { role } = useSystemRole();
  const { locale } = useSiteLocale();
  const copy = copyByLocale[locale];
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [reviewUid, setReviewUid] = useState<string | null>(null);
  const [extraEmailDraft, setExtraEmailDraft] = useState('');
  const canManagePrivileges = hasRequiredRole(role, 'superadmin');
  // Deleting a member is irreversible, so it stays with the narrowest role.
  const canDeleteUsers = hasRequiredRole(role, 'superadmin');
  const [deleteUid, setDeleteUid] = useState<string | null>(null);
  const canApproveUsers = hasRequiredRole(role, 'useradmin');

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  });

  const notificationSettingsQuery = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: fetchNotificationSettings,
    enabled: canApproveUsers
  });
  const notificationSettings = notificationSettingsQuery.data ?? { recipientUserIds: [], extraEmails: [] };

  const notificationMutation = useMutation({
    mutationFn: async (next: NotificationSettings) => {
      setErrorMessage('');
      return updateNotificationSettings(next);
    },
    onMutate: async (next: NotificationSettings) => {
      await queryClient.cancelQueries({ queryKey: ['notificationSettings'] });
      const previous = queryClient.getQueryData<NotificationSettings>(['notificationSettings']);
      queryClient.setQueryData(['notificationSettings'], next);
      return { previous };
    },
    onError: (error, _next, context) => {
      if (context?.previous) queryClient.setQueryData(['notificationSettings'], context.previous);
      setErrorMessage(error instanceof Error ? error.message : copy.updateError);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
    }
  });

  const toggleRecipient = (uid: string) => {
    const selected = new Set(notificationSettings.recipientUserIds);
    if (selected.has(uid)) selected.delete(uid);
    else selected.add(uid);
    notificationMutation.mutate({ ...notificationSettings, recipientUserIds: Array.from(selected) });
  };

  const addExtraEmail = () => {
    const email = extraEmailDraft.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage(copy.notify.invalidEmail);
      return;
    }
    setExtraEmailDraft('');
    if (notificationSettings.extraEmails.includes(email)) return;
    notificationMutation.mutate({ ...notificationSettings, extraEmails: [...notificationSettings.extraEmails, email] });
  };

  const removeExtraEmail = (email: string) => {
    notificationMutation.mutate({
      ...notificationSettings,
      extraEmails: notificationSettings.extraEmails.filter(item => item !== email)
    });
  };

  const roleMutation = useMutation({
    mutationFn: async ({ systemRoles, uid }: { uid: string; systemRoles: SystemRole[] }) => {
      setErrorMessage('');
      setSuccessMessage('');
      return updateUserSystemRoles(uid, systemRoles);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccessMessage(copy.updateSuccess);
    },
    onError: error => {
      setErrorMessage(error instanceof Error ? error.message : copy.updateError);
    }
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ status, uid, profile }: { uid: string; status: UserApprovalStatus; profile?: UserProfile }) => {
      setErrorMessage('');
      setSuccessMessage('');
      if (status === 'approved' && profile) {
        await createApprovedSnapshot(uid, profile, currentUser?.uid ?? 'unknown');
      }
      return updateUserApprovalStatus(uid, status, currentUser?.uid ?? 'unknown');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      setErrorMessage(error instanceof Error ? error.message : copy.updateError);
    }
  });

  const noteMutation = useMutation({
    mutationFn: async ({ uid, note }: { uid: string; note: string }) => {
      setErrorMessage('');
      return updateUserAdminNote(uid, note);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      setErrorMessage(error instanceof Error ? error.message : copy.updateError);
    }
  });

  const requestReviewMutation = useMutation({
    mutationFn: async ({ uid, note }: { uid: string; note: string }) => {
      setErrorMessage('');
      if (note.trim()) {
        await updateUserAdminNote(uid, note.trim());
      }
      return updateUserApprovalStatus(uid, 'needs-info', currentUser?.uid ?? 'unknown');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      setErrorMessage(error instanceof Error ? error.message : copy.updateError);
    }
  });

  const users = [...(usersQuery.data ?? [])].sort((left, right) => {
    const leftEmail = left.email ?? '';
    const rightEmail = right.email ?? '';
    return leftEmail.localeCompare(rightEmail);
  });

  const toggleRole = (uid: string, currentRoles: SystemRole[], roleToToggle: SystemRole) => {
    const selected = currentRoles.includes(roleToToggle)
      ? currentRoles.filter(role => role !== roleToToggle)
      : [...currentRoles.filter(role => role !== 'user'), roleToToggle];

    roleMutation.mutate({ uid, systemRoles: selected.length ? selected : ['user'] });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{copy.title}</h1>
        <p className="text-sm text-slate-600">{copy.subtitle}</p>
      </div>

      {errorMessage ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div> : null}
      {successMessage ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{successMessage}</div> : null}
      {usersQuery.isLoading ? <div className="text-sm text-slate-600">{copy.loading}</div> : null}
      {usersQuery.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{copy.loadError}</div> : null}

      {canApproveUsers ? (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{copy.notify.title}</h2>
            <p className="text-sm text-slate-600">{copy.notify.subtitle}</p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{copy.notify.baseline}</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {BASELINE_NOTIFY_EMAILS.map(email => (
                <span key={email} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{email}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{copy.notify.extraLabel}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {notificationSettings.extraEmails.map(email => (
                <span key={email} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
                  {email}
                  <button
                    type="button"
                    className="text-slate-400 hover:text-red-600 disabled:opacity-50"
                    disabled={notificationMutation.isPending}
                    onClick={() => removeExtraEmail(email)}
                    aria-label={`${copy.notify.extraLabel}: ${email}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <form
                className="inline-flex items-center gap-2"
                onSubmit={event => {
                  event.preventDefault();
                  addExtraEmail();
                }}
              >
                <input
                  type="email"
                  value={extraEmailDraft}
                  onChange={event => setExtraEmailDraft(event.target.value)}
                  placeholder={copy.notify.extraPlaceholder}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  disabled={notificationMutation.isPending || !extraEmailDraft.trim()}
                >
                  {copy.notify.extraAdd}
                </button>
              </form>
            </div>
          </div>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">{copy.uid}</th>
              <th className="px-4 py-3 font-medium">{copy.name}</th>
              <th className="px-4 py-3 font-medium">{copy.email}</th>
              <th className="px-4 py-3 font-medium">{copy.approval}</th>
              {canApproveUsers ? <th className="px-4 py-3 font-medium">{copy.notify.column}</th> : null}
              <th className="px-4 py-3 font-medium">{copy.privileges}</th>
              {canDeleteUsers ? <th className="px-4 py-3 font-medium">{copy.remove.column}</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => {
              const systemRoles = normalizeSystemRoles(user.systemRoles, user.systemRole);
              const approvalStatus = user.approvalStatus ?? 'needs-profile';

              return (
                <tr key={user.uid}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{user.uid}</td>
                  <td className="px-4 py-3 text-slate-900">{user.displayName ?? copy.noName}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email ?? copy.noEmail}</td>
                  <td className="px-4 py-3">
                    {canApproveUsers ? (
                      <button
                        type="button"
                        className={approvalStatusButtonClass(approvalStatus)}
                        onClick={() => setReviewUid(user.uid)}
                      >
                        {copy.approvalStatus[approvalStatus]}
                      </button>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {copy.approvalStatus[approvalStatus]}
                      </span>
                    )}
                  </td>
                  {canApproveUsers ? (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 disabled:opacity-50"
                        checked={notificationSettings.recipientUserIds.includes(user.uid)}
                        disabled={notificationMutation.isPending || !user.email}
                        title={user.email ?? copy.noEmail}
                        onChange={() => toggleRecipient(user.uid)}
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {privilegedSystemRoleOptions.map(option => (
                        <label key={option} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-slate-300"
                            checked={systemRoles.includes(option)}
                            disabled={!canManagePrivileges || roleMutation.isPending}
                            onChange={() => toggleRole(user.uid, systemRoles, option)}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </td>
                  {canDeleteUsers ? (
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
                        disabled={user.uid === currentUser?.uid}
                        title={user.uid === currentUser?.uid ? copy.remove.notSelf : undefined}
                        onClick={() => setDeleteUid(user.uid)}
                      >
                        {copy.remove.action}
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {deleteUid ? (() => {
        const target = users.find(u => u.uid === deleteUid);
        return target ? (
          <DeleteUserDialog
            user={target}
            locale={locale}
            onClose={() => setDeleteUid(null)}
            onDeleted={() => {
              setDeleteUid(null);
              setReviewUid(current => (current === deleteUid ? null : current));
              void queryClient.invalidateQueries({ queryKey: ['users'] });
            }}
          />
        ) : null;
      })() : null}

      {reviewUid ? (() => {
        const reviewUser = users.find(u => u.uid === reviewUid);
        return reviewUser ? (
          <UserProfileReviewModal
            user={reviewUser}
            labels={copy.profileLabels}
            locale={locale}
            statusLabel={copy.approvalStatus[reviewUser.approvalStatus ?? 'needs-profile']}
            isBusy={approvalMutation.isPending || noteMutation.isPending || requestReviewMutation.isPending}
            onApprove={() => approvalMutation.mutate({ uid: reviewUser.uid, status: 'approved', profile: reviewUser })}
            onRevoke={() => approvalMutation.mutate({ uid: reviewUser.uid, status: 'needs-info' })}
            onRequestReview={note => requestReviewMutation.mutate({ uid: reviewUser.uid, note })}
            onSaveNote={note => noteMutation.mutate({ uid: reviewUser.uid, note })}
            onClose={() => setReviewUid(null)}
          />
        ) : null;
      })() : null}
    </div>
  );
}

