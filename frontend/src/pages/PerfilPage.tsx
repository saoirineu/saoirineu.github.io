import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchIgrejas } from '../lib/trabalhos';
import { fetchUsuario, upsertUsuario } from '../lib/usuarios';
import { useAuth } from '../providers/useAuth';
import { buildPerfilForm, buildUsuarioPayload, initialPerfilForm, type PerfilFormState } from './perfil/form';
import {
  PerfilDadosPessoaisSection,
  PerfilFardamentoSection,
  PerfilIgrejasSection,
  PerfilPapeisSection
} from './perfil/PerfilSections';

export default function PerfilPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [form, setForm] = useState<PerfilFormState>(initialPerfilForm);
  const [errorMsg, setErrorMsg] = useState('');

  const igrejasQuery = useQuery({ queryKey: ['igrejas'], queryFn: fetchIgrejas });
  const perfilQuery = useQuery({
    queryKey: ['usuario', user?.uid],
    queryFn: () => fetchUsuario(user!.uid),
    enabled: !!user
  });

  useEffect(() => {
    if (!user) return;
    setForm(buildPerfilForm(user, perfilQuery.data));
  }, [perfilQuery.data, user]);

  const setField = <K extends keyof PerfilFormState>(field: K, value: PerfilFormState[K]) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sessão expirada');
      setErrorMsg('');

      return upsertUsuario(user.uid, buildUsuarioPayload(user, form));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuario', user?.uid] });
    },
    onError: err => {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      setErrorMsg(msg);
    }
  });

  const avatar = useMemo(() => {
    if (form.avatarUrl) return form.avatarUrl;
    if (user?.photoURL) return user.photoURL;
    return '';
  }, [form.avatarUrl, user?.photoURL]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Perfil</h1>
        <p className="text-sm text-slate-600">Dados do usuário e informações de fardamento.</p>
      </div>

      <form
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={e => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <PerfilDadosPessoaisSection
          avatarUrl={avatar}
          form={form}
          setField={setField}
          userPhotoURL={user.photoURL}
        />

        <PerfilIgrejasSection form={form} igrejas={igrejasQuery.data} setField={setField} />

        <PerfilFardamentoSection form={form} igrejas={igrejasQuery.data} setField={setField} />

        <PerfilPapeisSection form={form} setField={setField} />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar perfil'}
          </button>
          {mutation.isError ? <span className="text-sm text-red-600">Erro ao salvar.</span> : null}
          {mutation.isSuccess ? <span className="text-sm text-green-700">Salvo.</span> : null}
          {errorMsg ? <span className="text-sm text-red-600">{errorMsg}</span> : null}
        </div>
      </form>
    </div>
  );
}
