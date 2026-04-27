import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { normalizeSystemRole, type SystemRole } from '../lib/systemRole';
import { fetchUsers, updateUserSystemRole } from '../lib/users';
import { useSiteLocale } from '../providers/useSiteLocale';

const roleOptions: SystemRole[] = ['user', 'admin', 'superadmin'];

const copyByLocale = {
  pt: {
    title: 'Central de usuários',
    subtitle: 'Defina quem é admin, superadmin ou usuário comum.',
    loading: 'Carregando usuários...',
    loadError: 'Falha ao carregar usuários.',
    updateError: 'Erro ao atualizar usuário',
    updateSuccess: 'Papel atualizado com sucesso.',
    uid: 'UID',
    name: 'Nome',
    email: 'Email',
    role: 'Papel do sistema',
    noName: 'Sem nome',
    noEmail: 'Sem email'
  },
  en: {
    title: 'User management',
    subtitle: 'Define who is admin, superadmin, or a regular user.',
    loading: 'Loading users...',
    loadError: 'Failed to load users.',
    updateError: 'Failed to update user',
    updateSuccess: 'Role updated successfully.',
    uid: 'UID',
    name: 'Name',
    email: 'Email',
    role: 'System role',
    noName: 'No name',
    noEmail: 'No email'
  },
  es: {
    title: 'Central de usuarios',
    subtitle: 'Define quién es admin, superadmin o usuario común.',
    loading: 'Cargando usuarios...',
    loadError: 'Error al cargar usuarios.',
    updateError: 'Error al actualizar usuario',
    updateSuccess: 'Rol actualizado con éxito.',
    uid: 'UID',
    name: 'Nombre',
    email: 'Correo electrónico',
    role: 'Rol del sistema',
    noName: 'Sin nombre',
    noEmail: 'Sin correo'
  },
  it: {
    title: 'Gestione utenti',
    subtitle: 'Definisci chi è admin, superadmin o utente comune.',
    loading: 'Caricamento utenti...',
    loadError: 'Impossibile caricare gli utenti.',
    updateError: 'Errore nell\'aggiornare l\'utente',
    updateSuccess: 'Ruolo aggiornato con successo.',
    uid: 'UID',
    name: 'Nome',
    email: 'Email',
    role: 'Ruolo di sistema',
    noName: 'Senza nome',
    noEmail: 'Senza email'
  }
} as const;

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { locale } = useSiteLocale();
  const copy = copyByLocale[locale];
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  });

  const roleMutation = useMutation({
    mutationFn: async ({ systemRole, uid }: { uid: string; systemRole: SystemRole }) => {
      setErrorMessage('');
      setSuccessMessage('');
      return updateUserSystemRole(uid, systemRole);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccessMessage(copy.updateSuccess);
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
              <th className="px-4 py-3 font-medium">{copy.role}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => {
              const systemRole = normalizeSystemRole(user.systemRole);

              return (
                <tr key={user.uid}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{user.uid}</td>
                  <td className="px-4 py-3 text-slate-900">{user.displayName ?? copy.noName}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email ?? copy.noEmail}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={systemRole}
                      disabled={roleMutation.isPending}
                      onChange={event => {
                        roleMutation.mutate({ uid: user.uid, systemRole: event.target.value as SystemRole });
                      }}
                    >
                      {roleOptions.map(role => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
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
