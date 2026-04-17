import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { normalizeSystemRole, type SystemRole } from '../lib/systemRole';
import { fetchUsers, updateUserSystemRole } from '../lib/users';

const roleOptions: SystemRole[] = ['user', 'admin', 'superadmin'];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
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
      setSuccessMessage('Papel atualizado com sucesso.');
    },
    onError: error => {
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao atualizar usuário');
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
        <h1 className="text-xl font-semibold text-slate-900">Central de usuários</h1>
        <p className="text-sm text-slate-600">Defina quem é admin, superadmin ou usuário comum.</p>
      </div>

      {errorMessage ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div> : null}
      {successMessage ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{successMessage}</div> : null}
      {usersQuery.isLoading ? <div className="text-sm text-slate-600">Carregando usuários...</div> : null}
      {usersQuery.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Falha ao carregar usuários.</div> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">UID</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Papel do sistema</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => {
              const systemRole = normalizeSystemRole(user.systemRole);

              return (
                <tr key={user.uid}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{user.uid}</td>
                  <td className="px-4 py-3 text-slate-900">{user.displayName ?? 'Sem nome'}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email ?? 'Sem email'}</td>
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
