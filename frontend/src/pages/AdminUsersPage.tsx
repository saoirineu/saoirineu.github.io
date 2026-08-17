import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  hasRequiredRole,
  normalizeSystemRoles,
  privilegedSystemRoleOptions,
  type PrivilegedSystemRole,
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
  fetchUnverifiedSignups,
  fetchUsers,
  updateUserAdminNote,
  updateUserApprovalStatus,
  updateUserSystemRoles,
  type UserApprovalStatus,
  type UserProfile
} from '../lib/users';
import { useAuth } from '../providers/useAuth';
import { DeleteUserDialog } from './admin/DeleteUserDialog';
import { UserProfileReviewModal } from './admin/UserProfileReviewModal';
import { approvalStatusButtonClass, profileLabelsByLocale } from './admin/userReview';
import { useSiteLocale } from '../providers/useSiteLocale';
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
    filters: {
      search: 'Buscar',
      searchPlaceholder: 'Nome, email, UID, código fiscal, cidade...',
      approvalAll: 'Todas as situações',
      privilegesAll: 'Todos os privilégios',
      privilegesNone: 'Sem privilégios',
      sort: 'Ordenar',
      sortEmailAsc: 'Email (A-Z)',
      sortEmailDesc: 'Email (Z-A)',
      sortNameAsc: 'Nome (A-Z)',
      sortNameDesc: 'Nome (Z-A)',
      sortApproval: 'Pendentes primeiro',
      sortNewest: 'Cadastro mais recente',
      sortOldest: 'Cadastro mais antigo',
      count: (shown: number, total: number) => `${shown} de ${total} usuários`,
      empty: 'Nenhum usuário corresponde aos filtros.'
    },
    unverified: {
      title: 'Cadastros sem email confirmado',
      subtitle: 'Criaram a conta mas nunca abriram o link de confirmação, por isso ainda não têm perfil no portal.',
      empty: 'Nenhum cadastro aguardando confirmação.',
      error: 'Não foi possível carregar os cadastros sem confirmação.',
      created: 'Cadastro',
      lastSignIn: 'Último acesso',
      provider: 'Origem',
      never: 'Nunca'
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
    filters: {
      search: 'Search',
      searchPlaceholder: 'Name, email, UID, fiscal code, city...',
      approvalAll: 'All approval states',
      privilegesAll: 'All privileges',
      privilegesNone: 'No privileges',
      sort: 'Sort',
      sortEmailAsc: 'Email (A-Z)',
      sortEmailDesc: 'Email (Z-A)',
      sortNameAsc: 'Name (A-Z)',
      sortNameDesc: 'Name (Z-A)',
      sortApproval: 'Pending first',
      sortNewest: 'Newest signup',
      sortOldest: 'Oldest signup',
      count: (shown: number, total: number) => `${shown} of ${total} users`,
      empty: 'No user matches the filters.'
    },
    unverified: {
      title: 'Signups without a confirmed email',
      subtitle: 'They created an account but never opened the confirmation link, so they have no portal profile yet.',
      empty: 'No signup is waiting for confirmation.',
      error: 'Could not load the unconfirmed signups.',
      created: 'Signed up',
      lastSignIn: 'Last sign-in',
      provider: 'Source',
      never: 'Never'
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
    filters: {
      search: 'Buscar',
      searchPlaceholder: 'Nombre, correo, UID, código fiscal, ciudad...',
      approvalAll: 'Todos los estados',
      privilegesAll: 'Todos los privilegios',
      privilegesNone: 'Sin privilegios',
      sort: 'Ordenar',
      sortEmailAsc: 'Correo (A-Z)',
      sortEmailDesc: 'Correo (Z-A)',
      sortNameAsc: 'Nombre (A-Z)',
      sortNameDesc: 'Nombre (Z-A)',
      sortApproval: 'Pendientes primero',
      sortNewest: 'Registro más reciente',
      sortOldest: 'Registro más antiguo',
      count: (shown: number, total: number) => `${shown} de ${total} usuarios`,
      empty: 'Ningún usuario coincide con los filtros.'
    },
    unverified: {
      title: 'Registros sin correo confirmado',
      subtitle: 'Crearon la cuenta pero nunca abrieron el enlace de confirmación, por eso aún no tienen perfil en el portal.',
      empty: 'Ningún registro espera confirmación.',
      error: 'No fue posible cargar los registros sin confirmar.',
      created: 'Registro',
      lastSignIn: 'Último acceso',
      provider: 'Origen',
      never: 'Nunca'
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
    filters: {
      search: 'Cerca',
      searchPlaceholder: 'Nome, email, UID, codice fiscale, città...',
      approvalAll: 'Tutti gli stati',
      privilegesAll: 'Tutti i privilegi',
      privilegesNone: 'Senza privilegi',
      sort: 'Ordina',
      sortEmailAsc: 'Email (A-Z)',
      sortEmailDesc: 'Email (Z-A)',
      sortNameAsc: 'Nome (A-Z)',
      sortNameDesc: 'Nome (Z-A)',
      sortApproval: 'Prima le pendenti',
      sortNewest: 'Iscrizione più recente',
      sortOldest: 'Iscrizione meno recente',
      count: (shown: number, total: number) => `${shown} di ${total} utenti`,
      empty: 'Nessun utente corrisponde ai filtri.'
    },
    unverified: {
      title: 'Iscrizioni senza email confermata',
      subtitle: 'Hanno creato l\'account ma non hanno mai aperto il link di conferma, quindi non hanno ancora un profilo nel portale.',
      empty: 'Nessuna iscrizione in attesa di conferma.',
      error: 'Impossibile caricare le iscrizioni non confermate.',
      created: 'Iscrizione',
      lastSignIn: 'Ultimo accesso',
      provider: 'Origine',
      never: 'Mai'
    },
    profileLabels: profileLabelsByLocale.it
  }
} as const;

type SortKey = 'email-asc' | 'email-desc' | 'name-asc' | 'name-desc' | 'approval' | 'newest' | 'oldest';
type ApprovalFilter = 'all' | UserApprovalStatus;
type PrivilegeFilter = 'all' | 'none' | PrivilegedSystemRole;

const approvalStatusOptions: UserApprovalStatus[] = ['needs-profile', 'pending', 'approved', 'needs-info'];

/** Whoever is waiting on the admin comes first; the settled ones sink. */
const approvalQueueOrder: Record<UserApprovalStatus, number> = {
  pending: 0,
  'needs-info': 1,
  'needs-profile': 2,
  approved: 3
};

const searchableFields = [
  'uid',
  'displayName',
  'fullName',
  'firstName',
  'surname',
  'email',
  'email2',
  'fiscalCode',
  'city',
  'phone',
  'mobile',
  'memberCode'
] as const;

/** Accent-insensitive, so typing "mario" also finds "Mário". */
function normalizeText(value: string | undefined) {
  return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function userDisplayName(user: UserProfile) {
  return user.fullName ?? user.displayName ?? [user.firstName, user.surname].filter(Boolean).join(' ');
}

function matchesSearch(user: UserProfile, normalizedTerm: string) {
  if (!normalizedTerm) return true;
  return searchableFields.some(field => normalizeText(user[field]).includes(normalizedTerm));
}

function sortUsers(users: UserProfile[], sortKey: SortKey): UserProfile[] {
  const byEmail = (left: UserProfile, right: UserProfile) => (left.email ?? '').localeCompare(right.email ?? '');
  const byName = (left: UserProfile, right: UserProfile) => userDisplayName(left).localeCompare(userDisplayName(right));
  const createdMillis = (user: UserProfile) => user.createdAt?.toMillis() ?? 0;
  const sorted = [...users];

  switch (sortKey) {
    case 'email-desc':
      return sorted.sort((left, right) => byEmail(right, left));
    case 'name-asc':
      return sorted.sort(byName);
    case 'name-desc':
      return sorted.sort((left, right) => byName(right, left));
    case 'approval':
      return sorted.sort((left, right) => {
        const delta = approvalQueueOrder[left.approvalStatus ?? 'needs-profile'] - approvalQueueOrder[right.approvalStatus ?? 'needs-profile'];
        return delta !== 0 ? delta : byEmail(left, right);
      });
    case 'newest':
      return sorted.sort((left, right) => createdMillis(right) - createdMillis(left));
    case 'oldest':
      return sorted.sort((left, right) => createdMillis(left) - createdMillis(right));
    default:
      return sorted.sort(byEmail);
  }
}

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
  // An unconfirmed signup has no profile document, so the dialog gets the account itself.
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const canApproveUsers = hasRequiredRole(role, 'useradmin');
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('all');
  const [privilegeFilter, setPrivilegeFilter] = useState<PrivilegeFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('email-asc');

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  });

  const unverifiedQuery = useQuery({
    queryKey: ['unverifiedSignups'],
    queryFn: fetchUnverifiedSignups,
    enabled: canApproveUsers
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

  const allUsers = usersQuery.data;
  const users = useMemo(() => {
    const normalizedTerm = normalizeText(searchTerm.trim());
    const filtered = (allUsers ?? []).filter(user => {
      if (!matchesSearch(user, normalizedTerm)) return false;
      if (approvalFilter !== 'all' && (user.approvalStatus ?? 'needs-profile') !== approvalFilter) return false;
      if (privilegeFilter !== 'all') {
        const roles = normalizeSystemRoles(user.systemRoles, user.systemRole);
        const isPrivileged = roles.some(item => item !== 'user');
        if (privilegeFilter === 'none' ? isPrivileged : !roles.includes(privilegeFilter)) return false;
      }
      return true;
    });
    return sortUsers(filtered, sortKey);
  }, [allUsers, searchTerm, approvalFilter, privilegeFilter, sortKey]);

  const unverifiedSignups = unverifiedQuery.data ?? [];
  const formatMoment = (value: string | null) => (value ? new Date(value).toLocaleString(locale) : copy.unverified.never);

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

      {canApproveUsers ? (
        <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {copy.unverified.title}
              {unverifiedSignups.length ? <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs text-amber-900">{unverifiedSignups.length}</span> : null}
            </h2>
            <p className="text-sm text-slate-600">{copy.unverified.subtitle}</p>
          </div>

          {unverifiedQuery.isLoading ? <p className="text-sm text-slate-600">{copy.loading}</p> : null}
          {unverifiedQuery.isError ? <p className="text-sm text-red-700">{copy.unverified.error}</p> : null}
          {unverifiedQuery.isSuccess && !unverifiedSignups.length ? (
            <p className="text-sm text-slate-600">{copy.unverified.empty}</p>
          ) : null}

          {unverifiedSignups.length ? (
            <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">{copy.email}</th>
                    <th className="px-4 py-2 font-medium">{copy.name}</th>
                    <th className="px-4 py-2 font-medium">{copy.unverified.created}</th>
                    <th className="px-4 py-2 font-medium">{copy.unverified.lastSignIn}</th>
                    <th className="px-4 py-2 font-medium">{copy.unverified.provider}</th>
                    {canDeleteUsers ? <th className="px-4 py-2 font-medium">{copy.remove.column}</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unverifiedSignups.map(account => (
                    <tr key={account.uid}>
                      <td className="px-4 py-2 text-slate-900">{account.email}</td>
                      <td className="px-4 py-2 text-slate-600">{account.displayName ?? copy.noName}</td>
                      <td className="px-4 py-2 text-slate-600">{formatMoment(account.createdAt)}</td>
                      <td className="px-4 py-2 text-slate-600">{formatMoment(account.lastSignInAt)}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{account.providers.join(', ') || '—'}</td>
                      {canDeleteUsers ? (
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteTarget({ uid: account.uid, email: account.email, displayName: account.displayName ?? undefined })}
                          >
                            {copy.remove.action}
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">{copy.filters.search}</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder={copy.filters.searchPlaceholder}
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">{copy.approval}</span>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            value={approvalFilter}
            onChange={event => setApprovalFilter(event.target.value as ApprovalFilter)}
          >
            <option value="all">{copy.filters.approvalAll}</option>
            {approvalStatusOptions.map(status => (
              <option key={status} value={status}>
                {copy.approvalStatus[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">{copy.privileges}</span>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            value={privilegeFilter}
            onChange={event => setPrivilegeFilter(event.target.value as PrivilegeFilter)}
          >
            <option value="all">{copy.filters.privilegesAll}</option>
            <option value="none">{copy.filters.privilegesNone}</option>
            {privilegedSystemRoleOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">{copy.filters.sort}</span>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            value={sortKey}
            onChange={event => setSortKey(event.target.value as SortKey)}
          >
            <option value="email-asc">{copy.filters.sortEmailAsc}</option>
            <option value="email-desc">{copy.filters.sortEmailDesc}</option>
            <option value="name-asc">{copy.filters.sortNameAsc}</option>
            <option value="name-desc">{copy.filters.sortNameDesc}</option>
            <option value="approval">{copy.filters.sortApproval}</option>
            <option value="newest">{copy.filters.sortNewest}</option>
            <option value="oldest">{copy.filters.sortOldest}</option>
          </select>
        </label>
        <p className="text-xs text-slate-500 lg:col-span-4">{copy.filters.count(users.length, allUsers?.length ?? 0)}</p>
      </section>

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
                        onClick={() => setDeleteTarget(user)}
                      >
                        {copy.remove.action}
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {usersQuery.isSuccess && !users.length ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-600" colSpan={7}>
                  {copy.filters.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {deleteTarget ? (
        <DeleteUserDialog
          user={deleteTarget}
          locale={locale}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setReviewUid(current => (current === deleteTarget.uid ? null : current));
            setDeleteTarget(null);
            void queryClient.invalidateQueries({ queryKey: ['users'] });
            void queryClient.invalidateQueries({ queryKey: ['unverifiedSignups'] });
          }}
        />
      ) : null}

      {reviewUid ? (() => {
        const reviewUser = (allUsers ?? []).find(u => u.uid === reviewUid);
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

