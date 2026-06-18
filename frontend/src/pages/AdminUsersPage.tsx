import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  hasRequiredRole,
  normalizeSystemRoles,
  privilegedSystemRoleOptions,
  type SystemRole
} from '../lib/systemRole';
import { fetchUsers, updateUserApprovalStatus, updateUserSystemRoles, type UserApprovalStatus } from '../lib/users';
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
    noName: 'Sem nome',
    noEmail: 'Sem email',
    approvalStatus: {
      'needs-profile': 'Perfil incompleto',
      pending: 'Pendente',
      approved: 'Aprovado',
      'needs-info': 'Precisa de ajuste'
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
    noName: 'No name',
    noEmail: 'No email',
    approvalStatus: {
      'needs-profile': 'Incomplete profile',
      pending: 'Pending',
      approved: 'Approved',
      'needs-info': 'Needs update'
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
    noName: 'Sin nombre',
    noEmail: 'Sin correo',
    approvalStatus: {
      'needs-profile': 'Perfil incompleto',
      pending: 'Pendiente',
      approved: 'Aprobado',
      'needs-info': 'Necesita ajuste'
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
    noName: 'Senza nome',
    noEmail: 'Senza email',
    approvalStatus: {
      'needs-profile': 'Profilo incompleto',
      pending: 'In attesa',
      approved: 'Approvato',
      'needs-info': 'Da aggiornare'
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
    </div>
  );
}
