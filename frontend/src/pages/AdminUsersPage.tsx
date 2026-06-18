import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  hasRequiredRole,
  normalizeSystemRoles,
  privilegedSystemRoleOptions,
  type SystemRole
} from '../lib/systemRole';
import {
  fetchUsers,
  resolveUserDocumentUrl,
  updateUserApprovalStatus,
  updateUserSystemRoles,
  type UserApprovalStatus,
  type UserProfile
} from '../lib/users';
import { useAuth } from '../providers/useAuth';
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
    uid: 'UID',
    name: 'Nome',
    email: 'Email',
    approval: 'Aprovação',
    privileges: 'Privilégios',
    approve: 'Aprovar',
    viewProfile: 'Ver perfil',
    noName: 'Sem nome',
    noEmail: 'Sem email',
    approvalStatus: {
      'needs-profile': 'Perfil incompleto',
      pending: 'Pendente',
      approved: 'Aprovado',
      'needs-info': 'Precisa de ajuste'
    },
    profileLabels: {
      title: 'Perfil do candidato',
      submittedAt: 'Enviado em',
      name: 'Nome completo',
      email: 'Email',
      email2: 'Email alternativo',
      phone: 'Telefone',
      mobile: 'Celular',
      fiscalCode: 'Código fiscal',
      sex: 'Sexo',
      birthDate: 'Data de nascimento',
      birthPlace: 'Local de nascimento',
      birthCountry: 'País de nascimento',
      citizenship: 'Cidadania',
      nationality: 'Nacionalidade',
      address: 'Endereço',
      city: 'Cidade',
      country: 'País',
      currentChurch: 'Igreja atual',
      originChurch: 'Igreja de origem',
      isInitiated: 'Iniciado',
      initiationDate: 'Data de iniciação',
      initiatorName: 'Nome do iniciador',
      idDocPrimary: 'Documento de identidade (frente)',
      idDocSecondary: 'Documento de identidade (verso)',
      yes: 'Sim',
      no: 'Não',
      close: 'Fechar',
      noDocument: 'Nenhum arquivo enviado'
    }
  },
  en: {
    title: 'User management',
    subtitle: 'Approve subscriptions and assign administrative privileges.',
    loading: 'Loading users...',
    loadError: 'Failed to load users.',
    updateError: 'Failed to update user',
    updateSuccess: 'Privileges updated successfully.',
    approvalSuccess: 'User approved successfully.',
    uid: 'UID',
    name: 'Name',
    email: 'Email',
    approval: 'Approval',
    privileges: 'Privileges',
    approve: 'Approve',
    viewProfile: 'View profile',
    noName: 'No name',
    noEmail: 'No email',
    approvalStatus: {
      'needs-profile': 'Incomplete profile',
      pending: 'Pending',
      approved: 'Approved',
      'needs-info': 'Needs update'
    },
    profileLabels: {
      title: 'Applicant profile',
      submittedAt: 'Submitted at',
      name: 'Full name',
      email: 'Email',
      email2: 'Alternative email',
      phone: 'Phone',
      mobile: 'Mobile',
      fiscalCode: 'Fiscal code',
      sex: 'Sex',
      birthDate: 'Date of birth',
      birthPlace: 'Place of birth',
      birthCountry: 'Country of birth',
      citizenship: 'Citizenship',
      nationality: 'Nationality',
      address: 'Address',
      city: 'City',
      country: 'Country',
      currentChurch: 'Current church',
      originChurch: 'Church of origin',
      isInitiated: 'Initiated',
      initiationDate: 'Initiation date',
      initiatorName: 'Initiator name',
      idDocPrimary: 'Identity document (front)',
      idDocSecondary: 'Identity document (back)',
      yes: 'Yes',
      no: 'No',
      close: 'Close',
      noDocument: 'No file submitted'
    }
  },
  es: {
    title: 'Central de usuarios',
    subtitle: 'Apruebe inscripciones y defina privilegios administrativos.',
    loading: 'Cargando usuarios...',
    loadError: 'Error al cargar usuarios.',
    updateError: 'Error al actualizar usuario',
    updateSuccess: 'Privilegios actualizados con éxito.',
    approvalSuccess: 'Usuario aprobado con éxito.',
    uid: 'UID',
    name: 'Nombre',
    email: 'Correo electrónico',
    approval: 'Aprobación',
    privileges: 'Privilegios',
    approve: 'Aprobar',
    viewProfile: 'Ver perfil',
    noName: 'Sin nombre',
    noEmail: 'Sin correo',
    approvalStatus: {
      'needs-profile': 'Perfil incompleto',
      pending: 'Pendiente',
      approved: 'Aprobado',
      'needs-info': 'Necesita ajuste'
    },
    profileLabels: {
      title: 'Perfil del candidato',
      submittedAt: 'Enviado el',
      name: 'Nombre completo',
      email: 'Correo electrónico',
      email2: 'Correo alternativo',
      phone: 'Teléfono',
      mobile: 'Móvil',
      fiscalCode: 'Código fiscal',
      sex: 'Sexo',
      birthDate: 'Fecha de nacimiento',
      birthPlace: 'Lugar de nacimiento',
      birthCountry: 'País de nacimiento',
      citizenship: 'Ciudadanía',
      nationality: 'Nacionalidad',
      address: 'Dirección',
      city: 'Ciudad',
      country: 'País',
      currentChurch: 'Iglesia actual',
      originChurch: 'Iglesia de origen',
      isInitiated: 'Iniciado',
      initiationDate: 'Fecha de iniciación',
      initiatorName: 'Nombre del iniciador',
      idDocPrimary: 'Documento de identidad (frente)',
      idDocSecondary: 'Documento de identidad (dorso)',
      yes: 'Sí',
      no: 'No',
      close: 'Cerrar',
      noDocument: 'Ningún archivo enviado'
    }
  },
  it: {
    title: 'Gestione utenti',
    subtitle: 'Approva le iscrizioni e assegna privilegi amministrativi.',
    loading: 'Caricamento utenti...',
    loadError: 'Impossibile caricare gli utenti.',
    updateError: 'Errore nell\'aggiornare l\'utente',
    updateSuccess: 'Privilegi aggiornati con successo.',
    approvalSuccess: 'Utente approvato con successo.',
    uid: 'UID',
    name: 'Nome',
    email: 'Email',
    approval: 'Approvazione',
    privileges: 'Privilegi',
    approve: 'Approva',
    viewProfile: 'Vedi profilo',
    noName: 'Senza nome',
    noEmail: 'Senza email',
    approvalStatus: {
      'needs-profile': 'Profilo incompleto',
      pending: 'In attesa',
      approved: 'Approvato',
      'needs-info': 'Da aggiornare'
    },
    profileLabels: {
      title: 'Profilo del candidato',
      submittedAt: 'Inviato il',
      name: 'Nome completo',
      email: 'Email',
      email2: 'Email alternativa',
      phone: 'Telefono',
      mobile: 'Cellulare',
      fiscalCode: 'Codice fiscale',
      sex: 'Sesso',
      birthDate: 'Data di nascita',
      birthPlace: 'Luogo di nascita',
      birthCountry: 'Paese di nascita',
      citizenship: 'Cittadinanza',
      nationality: 'Nazionalità',
      address: 'Indirizzo',
      city: 'Città',
      country: 'Paese',
      currentChurch: 'Chiesa attuale',
      originChurch: 'Chiesa di origine',
      isInitiated: 'Iniziato',
      initiationDate: 'Data di iniziazione',
      initiatorName: 'Nome dell\'iniziatore',
      idDocPrimary: 'Documento d\'identità (fronte)',
      idDocSecondary: 'Documento d\'identità (retro)',
      yes: 'Sì',
      no: 'No',
      close: 'Chiudi',
      noDocument: 'Nessun file inviato'
    }
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
  const [reviewUser, setReviewUser] = useState<UserProfile | null>(null);
  const canManagePrivileges = hasRequiredRole(role, 'superadmin');
  const canApproveUsers = hasRequiredRole(role, 'useradmin');

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  });

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
    mutationFn: async ({ status, uid }: { uid: string; status: UserApprovalStatus }) => {
      setErrorMessage('');
      setSuccessMessage('');
      return updateUserApprovalStatus(uid, status, currentUser?.uid ?? 'unknown');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccessMessage(copy.approvalSuccess);
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">{copy.uid}</th>
              <th className="px-4 py-3 font-medium">{copy.name}</th>
              <th className="px-4 py-3 font-medium">{copy.email}</th>
              <th className="px-4 py-3 font-medium">{copy.approval}</th>
              <th className="px-4 py-3 font-medium">{copy.privileges}</th>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {copy.approvalStatus[approvalStatus]}
                      </span>
                      {canApproveUsers ? (
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          onClick={() => setReviewUser(user)}
                        >
                          {copy.viewProfile}
                        </button>
                      ) : null}
                      {approvalStatus === 'pending' && canApproveUsers ? (
                        <button
                          type="button"
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                          disabled={approvalMutation.isPending}
                          onClick={() => approvalMutation.mutate({ uid: user.uid, status: 'approved' })}
                        >
                          {copy.approve}
                        </button>
                      ) : null}
                    </div>
                  </td>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {reviewUser ? (
        <UserProfileReviewModal
          user={reviewUser}
          labels={copy.profileLabels}
          onClose={() => setReviewUser(null)}
        />
      ) : null}
    </div>
  );
}

type ProfileLabels = Record<string, string>;

function UserDocumentLink({ name, path, fallback }: { name?: string; path?: string; fallback: string }) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!path) {
    return <span className="text-slate-400 italic">{fallback}</span>;
  }

  return (
    <span>
      <a
        href={downloadUrl ?? '#'}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2"
        onClick={async event => {
          if (downloadUrl || loading) return;
          event.preventDefault();
          setLoading(true);
          setError('');
          try {
            const url = await resolveUserDocumentUrl(path);
            setDownloadUrl(url);
            window.open(url, '_blank', 'noopener,noreferrer');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar arquivo');
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? '...' : (name ?? path.split('/').pop())}
      </a>
      {error ? <span className="ml-2 text-xs text-red-600">{error}</span> : null}
    </span>
  );
}

function UserProfileReviewModal({
  user,
  labels,
  onClose
}: {
  user: UserProfile;
  labels: ProfileLabels;
  onClose: () => void;
}) {
  const displayName =
    user.fullName ?? user.displayName ?? ([user.firstName, user.surname].filter(Boolean).join(' ') || '—');

  const submittedAt = user.approvalSubmittedAt
    ? new Date(user.approvalSubmittedAt.toMillis()).toLocaleString()
    : '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{labels.title}</h2>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            onClick={onClose}
          >
            {labels.close}
          </button>
        </div>

        <div className="divide-y divide-slate-100 px-6 py-4 text-sm">
          <ProfileSection>
            <ProfileRow label={labels.submittedAt} value={submittedAt} />
            <ProfileRow label={labels.name} value={displayName} />
            <ProfileRow label={labels.email} value={user.email} />
            {user.email2 ? <ProfileRow label={labels.email2} value={user.email2} /> : null}
            {user.phone ? <ProfileRow label={labels.phone} value={user.phone} /> : null}
            {user.mobile ? <ProfileRow label={labels.mobile} value={user.mobile} /> : null}
          </ProfileSection>

          <ProfileSection>
            {user.fiscalCode ? <ProfileRow label={labels.fiscalCode} value={user.fiscalCode} /> : null}
            {user.sex ? <ProfileRow label={labels.sex} value={user.sex} /> : null}
            {user.birthDate ? <ProfileRow label={labels.birthDate} value={user.birthDate} /> : null}
            {user.birthPlace ? <ProfileRow label={labels.birthPlace} value={user.birthPlace} /> : null}
            {user.birthCountry ? <ProfileRow label={labels.birthCountry} value={user.birthCountry} /> : null}
            {user.citizenship ? <ProfileRow label={labels.citizenship} value={user.citizenship} /> : null}
            {user.nationality ? <ProfileRow label={labels.nationality} value={user.nationality} /> : null}
          </ProfileSection>

          <ProfileSection>
            {user.address ? <ProfileRow label={labels.address} value={user.address} /> : null}
            {user.city ? <ProfileRow label={labels.city} value={user.city} /> : null}
            {user.country ? <ProfileRow label={labels.country} value={user.country} /> : null}
          </ProfileSection>

          <ProfileSection>
            {user.currentChurchName ? <ProfileRow label={labels.currentChurch} value={user.currentChurchName} /> : null}
            {user.originChurchName ? <ProfileRow label={labels.originChurch} value={user.originChurchName} /> : null}
            <ProfileRow
              label={labels.isInitiated}
              value={user.isInitiated === true ? labels.yes : user.isInitiated === false ? labels.no : '—'}
            />
            {user.initiationDate ? <ProfileRow label={labels.initiationDate} value={user.initiationDate} /> : null}
            {user.initiatorName ? <ProfileRow label={labels.initiatorName} value={user.initiatorName} /> : null}
          </ProfileSection>

          <ProfileSection>
            <div className="flex items-start gap-4 py-2">
              <span className="w-48 shrink-0 font-medium text-slate-600">{labels.idDocPrimary}</span>
              <UserDocumentLink
                name={user.identityDocumentPrimaryName}
                path={user.identityDocumentPrimaryPath}
                fallback={labels.noDocument}
              />
            </div>
          </ProfileSection>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ children }: { children: ReactNode }) {
  return <div className="py-3 space-y-0.5">{children}</div>;
}

function ProfileRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-4 py-1">
      <span className="w-48 shrink-0 font-medium text-slate-600">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}
