import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { normalizeSystemRole, type SystemRole } from '../lib/systemRole';
import { fetchUsuarios, updateUsuarioSystemRole, upsertUsuario } from '../lib/usuarios';

const roleOptions: SystemRole[] = ['user', 'admin', 'superadmin'];

const initialCreateForm = {
  uid: '',
  email: '',
  displayName: '',
  systemRole: 'user' as SystemRole
};

const initialBulkImportValue = '';

type ParsedImportUser = {
  uid: string;
  email: string;
  displayName?: string;
  systemRole: SystemRole;
};

function parseImportLines(input: string, fallbackRole: SystemRole) {
  const rows = input
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  return rows.map((row, index) => {
    const parts = row.split(/[;,\t|]/).map(part => part.trim());
    const [uid, email, displayName, explicitRole] = parts;

    if (!uid || !email) {
      throw new Error(`Linha ${index + 1}: informe pelo menos UID e email.`);
    }

    return {
      uid,
      email,
      displayName: displayName || undefined,
      systemRole: normalizeSystemRole(explicitRole ?? fallbackRole)
    } satisfies ParsedImportUser;
  });
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [bulkImportValue, setBulkImportValue] = useState(initialBulkImportValue);
  const [bulkImportRole, setBulkImportRole] = useState<SystemRole>('user');

  const usuariosQuery = useQuery({
    queryKey: ['usuarios'],
    queryFn: fetchUsuarios
  });

  const roleMutation = useMutation({
    mutationFn: async ({ systemRole, uid }: { uid: string; systemRole: SystemRole }) => {
      setErrorMessage('');
      setSuccessMessage('');
      return updateUsuarioSystemRole(uid, systemRole);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setSuccessMessage('Papel atualizado com sucesso.');
    },
    onError: error => {
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao atualizar usuário');
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const uid = createForm.uid.trim();
      const email = createForm.email.trim();
      const displayName = createForm.displayName.trim();

      setErrorMessage('');
      setSuccessMessage('');

      if (!uid || !email) {
        throw new Error('UID e email são obrigatórios para adicionar um usuário já existente no Firebase Auth.');
      }

      return upsertUsuario(uid, {
        displayName: displayName || undefined,
        email,
        systemRole: createForm.systemRole
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setCreateForm(initialCreateForm);
      setSuccessMessage('Usuário adicionado ao painel com sucesso.');
    },
    onError: error => {
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao adicionar usuário');
    }
  });

  const bulkImportMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage('');
      setSuccessMessage('');

      const parsedUsers = parseImportLines(bulkImportValue, bulkImportRole);

      if (!parsedUsers.length) {
        throw new Error('Cole ao menos uma linha para importação.');
      }

      const existingUserIds = new Set((usuariosQuery.data ?? []).map(usuario => usuario.uid));
      const usersToCreate = parsedUsers.filter(usuario => !existingUserIds.has(usuario.uid));

      if (!usersToCreate.length) {
        throw new Error('Todos os UIDs informados já existem na coleção de usuários.');
      }

      await Promise.all(
        usersToCreate.map(usuario =>
          upsertUsuario(usuario.uid, {
            displayName: usuario.displayName,
            email: usuario.email,
            systemRole: usuario.systemRole
          })
        )
      );

      return { createdCount: usersToCreate.length, skippedCount: parsedUsers.length - usersToCreate.length };
    },
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setBulkImportValue(initialBulkImportValue);
      setSuccessMessage(
        result.skippedCount
          ? `${result.createdCount} usuário(s) importado(s); ${result.skippedCount} já existiam na coleção.`
          : `${result.createdCount} usuário(s) importado(s) com sucesso.`
      );
    },
    onError: error => {
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao importar usuários');
    }
  });

  const usuarios = [...(usuariosQuery.data ?? [])].sort((left, right) => {
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

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Adicionar usuário que já existe no Firebase Auth</h2>
        <p className="mt-1 text-sm text-slate-600">
          Se a pessoa aparece no Firebase Authentication, mas ainda não entrou nesta lista, crie o perfil manualmente com o UID exibido no console do Firebase.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium text-slate-900">UID</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={createForm.uid}
              onChange={event => setCreateForm(current => ({ ...current, uid: event.target.value }))}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Email</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              type="email"
              value={createForm.email}
              onChange={event => setCreateForm(current => ({ ...current, email: event.target.value }))}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Nome</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={createForm.displayName}
              onChange={event => setCreateForm(current => ({ ...current, displayName: event.target.value }))}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Papel inicial</span>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              value={createForm.systemRole}
              onChange={event => setCreateForm(current => ({ ...current, systemRole: event.target.value as SystemRole }))}
            >
              {roleOptions.map(role => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            disabled={createUserMutation.isPending}
            onClick={() => createUserMutation.mutate()}
          >
            {createUserMutation.isPending ? 'Adicionando...' : 'Adicionar ao painel'}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Importar usuários do Firebase Auth em lote</h2>
        <p className="mt-1 text-sm text-slate-600">
          Cole uma linha por usuário no formato <span className="font-mono text-xs">UID;email;nome;papel</span>. O papel é opcional; quando omitido, usamos o papel padrão abaixo.
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px]">
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Linhas para importação</span>
            <textarea
              className="min-h-40 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
              placeholder={['UID1;email1@example.com;Nome 1;admin', 'UID2;email2@example.com;Nome 2', 'UID3,email3@example.com'].join('\n')}
              value={bulkImportValue}
              onChange={event => setBulkImportValue(event.target.value)}
            />
          </label>

          <div className="space-y-3">
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Papel padrão</span>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                value={bulkImportRole}
                onChange={event => setBulkImportRole(event.target.value as SystemRole)}
              >
                {roleOptions.map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              disabled={bulkImportMutation.isPending || usuariosQuery.isLoading}
              onClick={() => bulkImportMutation.mutate()}
            >
              {bulkImportMutation.isPending ? 'Importando...' : 'Importar usuários ausentes'}
            </button>
          </div>
        </div>
      </section>

      {errorMessage ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div> : null}
      {successMessage ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{successMessage}</div> : null}
      {usuariosQuery.isLoading ? <div className="text-sm text-slate-600">Carregando usuários...</div> : null}
      {usuariosQuery.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Falha ao carregar usuários.</div> : null}

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
            {usuarios.map(usuario => {
              const systemRole = normalizeSystemRole(usuario.systemRole);

              return (
                <tr key={usuario.uid}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{usuario.uid}</td>
                  <td className="px-4 py-3 text-slate-900">{usuario.displayName ?? 'Sem nome'}</td>
                  <td className="px-4 py-3 text-slate-600">{usuario.email ?? 'Sem email'}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={systemRole}
                      disabled={roleMutation.isPending || createUserMutation.isPending || bulkImportMutation.isPending}
                      onChange={event => {
                        roleMutation.mutate({ uid: usuario.uid, systemRole: event.target.value as SystemRole });
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
