import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchIgrejas } from '../lib/trabalhos';
import { fetchUsuario, upsertUsuario, UsuarioPerfil } from '../lib/usuarios';
import { useAuth } from '../providers/AuthProvider';

const initialForm = {
  displayName: '',
  email: '',
  phone: '',
  avatarUrl: '',
  cidade: '',
  estado: '',
  pais: '',
  igrejaAtualId: '',
  igrejaAtualNome: '',
  igrejaOrigemNome: '',
  fardado: false,
  fardamentoData: '',
  fardamentoLocal: '',
  fardamentoIgrejaId: '',
  fardamentoIgrejaNome: '',
  fardadorNome: '',
  fardadoComQuem: '',
  padrinhoMadrinha: false,
  padrinhoIgrejasIds: [] as string[],
  padrinhoIgrejasTexto: '',
  papeisTexto: '',
  observacoes: ''
};

function avatarFallback(name?: string, email?: string) {
  const base = name || email || '?';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(base)}&background=1e293b&color=fff`;
}

export default function PerfilPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [form, setForm] = useState(initialForm);
  const [errorMsg, setErrorMsg] = useState('');

  const igrejasQuery = useQuery({ queryKey: ['igrejas'], queryFn: fetchIgrejas });
  const perfilQuery = useQuery({
    queryKey: ['usuario', user?.uid],
    queryFn: () => fetchUsuario(user!.uid),
    enabled: !!user
  });

  useEffect(() => {
    if (!user) return;
    const data = perfilQuery.data;
    setForm(prev => ({
      ...prev,
      displayName: data?.displayName || user.displayName || '',
      email: user.email || data?.email || '',
      phone: data?.phone || '',
      avatarUrl: data?.avatarUrl || '',
      cidade: data?.cidade || '',
      estado: data?.estado || '',
      pais: data?.pais || '',
      igrejaAtualId: data?.igrejaAtualId || '',
      igrejaAtualNome: data?.igrejaAtualNome || '',
      igrejaOrigemNome: data?.igrejaOrigemNome || '',
      fardado: data?.fardado || false,
      fardamentoData: data?.fardamentoData || '',
      fardamentoLocal: data?.fardamentoLocal || '',
      fardamentoIgrejaId: data?.fardamentoIgrejaId || '',
      fardamentoIgrejaNome: data?.fardamentoIgrejaNome || '',
      fardadorNome: data?.fardadorNome || '',
      fardadoComQuem: data?.fardadoComQuem || '',
      padrinhoMadrinha: data?.padrinhoMadrinha || false,
      padrinhoIgrejasIds: data?.padrinhoIgrejasIds || [],
      padrinhoIgrejasTexto: data?.padrinhoIgrejasNomes?.join(', ') || '',
      papeisTexto: data?.papeisDoutrina?.join(', ') || '',
      observacoes: data?.observacoes || ''
    }));
  }, [perfilQuery.data, user]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sessão expirada');
      setErrorMsg('');

      const isFardado = form.fardado;
      const isPadrinho = isFardado && form.padrinhoMadrinha;
      const padrinhoIgrejasNomes = form.padrinhoIgrejasTexto
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const papeisList = form.papeisTexto
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload: Partial<UsuarioPerfil> = {
        uid: user.uid,
        displayName: form.displayName || undefined,
        email: form.email || user.email || undefined,
        phone: form.phone || undefined,
        avatarUrl: form.avatarUrl || undefined,
        cidade: form.cidade || undefined,
        estado: form.estado || undefined,
        pais: form.pais || undefined,
        igrejaAtualId: form.igrejaAtualId || undefined,
        igrejaAtualNome: form.igrejaAtualNome || undefined,
        igrejaOrigemNome: form.igrejaOrigemNome || undefined,
        fardado: isFardado,
        fardamentoData: isFardado ? form.fardamentoData || undefined : undefined,
        fardamentoLocal: isFardado ? form.fardamentoLocal || undefined : undefined,
        fardamentoIgrejaId: isFardado ? form.fardamentoIgrejaId || undefined : undefined,
        fardamentoIgrejaNome: isFardado ? form.fardamentoIgrejaNome || undefined : undefined,
        fardadorNome: isFardado ? form.fardadorNome || undefined : undefined,
        fardadoComQuem: isFardado ? form.fardadoComQuem || undefined : undefined,
        padrinhoMadrinha: isPadrinho,
        padrinhoIgrejasIds: isPadrinho ? form.padrinhoIgrejasIds.filter(Boolean) : undefined,
        padrinhoIgrejasNomes: isPadrinho ? padrinhoIgrejasNomes : undefined,
        papeisDoutrina: papeisList.length ? papeisList : undefined,
        observacoes: form.observacoes || undefined
      };

      return upsertUsuario(user.uid, payload);
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
    return avatarFallback(form.displayName, form.email);
  }, [form.avatarUrl, form.displayName, form.email, user?.photoURL]);

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
        <div className="grid gap-4 rounded-lg bg-slate-100 p-3 sm:grid-cols-[1fr,240px]">
          <div className="space-y-3">
            <label className="text-sm text-slate-700">
              Nome
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="Seu nome"
              />
            </label>
            <label className="text-sm text-slate-700">
              Email
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                value={form.email}
                readOnly
              />
            </label>
            <label className="text-sm text-slate-700">
              Telefone
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Opcional"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-sm text-slate-700">
                Cidade
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.cidade}
                  onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                />
              </label>
              <label className="text-sm text-slate-700">
                Estado/UF
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                />
              </label>
              <label className="text-sm text-slate-700">
                País
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.pais}
                  onChange={e => setForm(f => ({ ...f, pais: e.target.value }))}
                />
              </label>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-lg bg-white/60 p-3 shadow-sm">
            <img
              src={avatar}
              alt="Avatar"
              className="h-28 w-28 rounded-full border border-slate-200 object-cover shadow-sm"
            />
            <label className="w-full text-sm text-slate-700">
              URL do avatar
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.avatarUrl}
                onChange={e => setForm(f => ({ ...f, avatarUrl: e.target.value }))}
                placeholder="https://..."
              />
            </label>
            {user.photoURL ? (
              <button
                type="button"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => setForm(f => ({ ...f, avatarUrl: user.photoURL || '' }))}
              >
                Usar foto do Google
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 rounded-lg bg-slate-100 p-3 sm:grid-cols-2">
          <div className="space-y-3">
            <label className="text-sm text-slate-700">
              Igreja atual (cadastrada)
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.igrejaAtualId}
                onChange={e => {
                  const found = igrejasQuery.data?.find(i => i.id === e.target.value);
                  setForm(f => ({ ...f, igrejaAtualId: e.target.value, igrejaAtualNome: found?.nome ?? '' }));
                }}
              >
                <option value="">— Selecionar —</option>
                {igrejasQuery.data?.map(ig => (
                  <option key={ig.id} value={ig.id}>
                    {ig.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Igreja atual (texto livre)
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.igrejaAtualNome}
                onChange={e => setForm(f => ({ ...f, igrejaAtualNome: e.target.value }))}
                placeholder="Se não estiver cadastrada"
              />
            </label>
          </div>
          <div className="space-y-3">
            <label className="text-sm text-slate-700">
              Igreja de origem (texto livre)
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.igrejaOrigemNome}
                onChange={e => setForm(f => ({ ...f, igrejaOrigemNome: e.target.value }))}
                placeholder="Linha ou igreja de onde veio"
              />
            </label>
            <label className="text-sm text-slate-700">
              Observações gerais
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                rows={3}
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              />
            </label>
          </div>
        </div>

        <div className="space-y-3 rounded-lg bg-slate-100 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                id="fardado"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
                checked={form.fardado}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    fardado: e.target.checked,
                    padrinhoMadrinha: e.target.checked ? f.padrinhoMadrinha : false,
                    padrinhoIgrejasIds: e.target.checked ? f.padrinhoIgrejasIds : [],
                    padrinhoIgrejasTexto: e.target.checked ? f.padrinhoIgrejasTexto : ''
                  }))
                }
              />
              Sou fardado(a)
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                id="padrinho"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
                checked={form.padrinhoMadrinha}
                disabled={!form.fardado}
                onChange={e => setForm(f => ({ ...f, padrinhoMadrinha: e.target.checked }))}
              />
              Sou padrinho/madrinha
            </label>
          </div>

          {form.fardado ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-sm text-slate-700">
                    Data do fardamento
                    <input
                      type="date"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={form.fardamentoData}
                      onChange={e => setForm(f => ({ ...f, fardamentoData: e.target.value }))}
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Local do fardamento
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={form.fardamentoLocal}
                      onChange={e => setForm(f => ({ ...f, fardamentoLocal: e.target.value }))}
                      placeholder="Cidade/estado ou igreja"
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Quem me fardou
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={form.fardadorNome}
                      onChange={e => setForm(f => ({ ...f, fardadorNome: e.target.value }))}
                      placeholder="Nome do padrinho/madrinha"
                    />
                  </label>
                </div>
                <div className="space-y-3">
                  <label className="text-sm text-slate-700">
                    Igreja onde fui fardado (cadastrada)
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={form.fardamentoIgrejaId}
                      onChange={e => {
                        const found = igrejasQuery.data?.find(i => i.id === e.target.value);
                        setForm(f => ({ ...f, fardamentoIgrejaId: e.target.value, fardamentoIgrejaNome: found?.nome ?? '' }));
                      }}
                    >
                      <option value="">— Selecionar —</option>
                      {igrejasQuery.data?.map(ig => (
                        <option key={ig.id} value={ig.id}>
                          {ig.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    Igreja onde fui fardado (texto livre)
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={form.fardamentoIgrejaNome}
                      onChange={e => setForm(f => ({ ...f, fardamentoIgrejaNome: e.target.value }))}
                      placeholder="Se não estiver cadastrada"
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Com quem me fardei
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={form.fardadoComQuem}
                      onChange={e => setForm(f => ({ ...f, fardadoComQuem: e.target.value }))}
                      placeholder="Outras pessoas fardadas junto"
                    />
                  </label>
                </div>
              </div>

              {form.padrinhoMadrinha ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    Igrejas onde sou padrinho/madrinha (cadastradas)
                    <select
                      multiple
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={form.padrinhoIgrejasIds}
                      onChange={e => {
                        const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                        setForm(f => ({ ...f, padrinhoIgrejasIds: selected }));
                      }}
                      size={Math.min(igrejasQuery.data?.length ?? 4, 6)}
                    >
                      {igrejasQuery.data?.map(ig => (
                        <option key={ig.id} value={ig.id}>
                          {ig.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    Igrejas onde sou padrinho/madrinha (texto livre)
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={form.padrinhoIgrejasTexto}
                      onChange={e => setForm(f => ({ ...f, padrinhoIgrejasTexto: e.target.value }))}
                      placeholder="Ex.: nome de igrejas não cadastradas"
                    />
                  </label>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-700">
            Papéis na doutrina (separar por vírgula)
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.papeisTexto}
              onChange={e => setForm(f => ({ ...f, papeisTexto: e.target.value }))}
              placeholder="Ex.: tesoureiro, coordenador, músico oficial, limpeza"
            />
          </label>
          <p className="text-xs text-slate-500">Use termos livres (ex.: tesoureiro, cozinheira oficial, organização, arrumação, limpeza, músico, músico oficial).</p>
        </div>

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
