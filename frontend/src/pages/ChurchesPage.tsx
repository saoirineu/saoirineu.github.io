import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createIgreja,
  deleteIgreja,
  fetchIgrejas,
  fetchTrabalhos,
  updateIgreja
} from '../lib/trabalhos';
import { fetchUsuarios } from '../lib/usuarios';
import { useAuth } from '../providers/AuthProvider';

export function ChurchesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const igrejasQuery = useQuery({ queryKey: ['igrejas'], queryFn: fetchIgrejas });
  const trabalhosQuery = useQuery({ queryKey: ['trabalhos'], queryFn: fetchTrabalhos });
  const usuariosQuery = useQuery({ queryKey: ['usuarios'], queryFn: fetchUsuarios });

  const [form, setForm] = useState({
    nome: '',
    cidade: '',
    estado: '',
    pais: '',
    linhagem: '',
    observacoes: '',
    lat: '',
    lng: ''
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Faça login para cadastrar');
      if (!form.nome.trim()) throw new Error('Nome é obrigatório');

      const latNum = form.lat.trim() ? Number(form.lat) : undefined;
      const lngNum = form.lng.trim() ? Number(form.lng) : undefined;

      const payload = {
        nome: form.nome.trim(),
        cidade: form.cidade.trim() || undefined,
        estado: form.estado.trim() || undefined,
        pais: form.pais.trim() || undefined,
        linhagem: form.linhagem.trim() || undefined,
        observacoes: form.observacoes.trim() || undefined,
        lat: Number.isFinite(latNum) ? latNum : undefined,
        lng: Number.isFinite(lngNum) ? lngNum : undefined
      };

      if (editingId) {
        return updateIgreja(editingId, payload);
      }

      return createIgreja(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['igrejas'] });
      setForm({ nome: '', cidade: '', estado: '', pais: '', linhagem: '', observacoes: '', lat: '', lng: '' });
      setEditingId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Faça login para excluir');
      return deleteIgreja(id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['igrejas'] });
      if (editingId) setEditingId(null);
    }
  });

  const igrejasOrdenadas = useMemo(() => {
    return (igrejasQuery.data ?? []).slice().sort((a, b) => a.nome.localeCompare(b.nome));
  }, [igrejasQuery.data]);

  const usoIgrejas = useMemo(() => {
    const mapa = new Map<
      string,
      { trabalhosLocal: number; trabalhosResponsavel: number; pessoasAtuais: number; pessoasFardamento: number }
    >();

    (trabalhosQuery.data ?? []).forEach(t => {
      if (t.localId) {
        const atual = mapa.get(t.localId) || { trabalhosLocal: 0, trabalhosResponsavel: 0, pessoasAtuais: 0, pessoasFardamento: 0 };
        atual.trabalhosLocal += 1;
        mapa.set(t.localId, atual);
      }

      (t.igrejasResponsaveisIds ?? []).forEach(id => {
        const atual = mapa.get(id) || { trabalhosLocal: 0, trabalhosResponsavel: 0, pessoasAtuais: 0, pessoasFardamento: 0 };
        atual.trabalhosResponsavel += 1;
        mapa.set(id, atual);
      });
    });

    (usuariosQuery.data ?? []).forEach(u => {
      if (u.igrejaAtualId) {
        const atual = mapa.get(u.igrejaAtualId) || { trabalhosLocal: 0, trabalhosResponsavel: 0, pessoasAtuais: 0, pessoasFardamento: 0 };
        atual.pessoasAtuais += 1;
        mapa.set(u.igrejaAtualId, atual);
      }

      if (u.fardamentoIgrejaId) {
        const atual = mapa.get(u.fardamentoIgrejaId) || { trabalhosLocal: 0, trabalhosResponsavel: 0, pessoasAtuais: 0, pessoasFardamento: 0 };
        atual.pessoasFardamento += 1;
        mapa.set(u.fardamentoIgrejaId, atual);
      }
    });

    return mapa;
  }, [trabalhosQuery.data, usuariosQuery.data]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Igrejas</h1>
        <p className="text-sm text-slate-600">
          Cadastro simples de casas com localização e linhagem.
        </p>
      </div>

      <form
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Nova igreja
            </h2>
            <p className="text-xs text-slate-500">
              Preencha o nome e, se quiser, localização, linhagem e coordenadas
              (para mapa).
            </p>
          </div>
          <div className="text-xs text-slate-600">
            {editingId ? (
              <span className="text-amber-700">Editando {editingId}</span>
            ) : null}
            {!user && (
              <span className="ml-2 text-amber-600">
                Faça login para salvar
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-3 rounded-lg bg-slate-100 p-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            Nome
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex.: Igreja da Floresta"
              required
            />
          </label>

          <label className="text-sm text-slate-700">
            Linhagem / casa
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.linhagem}
              onChange={(e) =>
                setForm((f) => ({ ...f, linhagem: e.target.value }))
              }
              placeholder="Ex.: ICEFLU, CEFLI, IDCEFLU, Barquinha, UdV, Linha Unificada, etc."
            />
          </label>

          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <label className="text-sm text-slate-700">
              Cidade
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.cidade}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cidade: e.target.value }))
                }
                placeholder="Ex.: Rio Branco"
              />
            </label>
            <label className="text-sm text-slate-700">
              Estado
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.estado}
                onChange={(e) =>
                  setForm((f) => ({ ...f, estado: e.target.value }))
                }
                placeholder="AC"
              />
            </label>
            <label className="text-sm text-slate-700">
              País
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.pais}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pais: e.target.value }))
                }
                placeholder="Brasil"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <label className="text-sm text-slate-700">
              Latitude
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.lat}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lat: e.target.value }))
                }
                placeholder="Ex.: -9.975"
              />
            </label>
            <label className="text-sm text-slate-700">
              Longitude
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.lng}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lng: e.target.value }))
                }
                placeholder="Ex.: -67.812"
              />
            </label>
          </div>

          <label className="text-sm text-slate-700 sm:col-span-2">
            Observações
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              value={form.observacoes}
              onChange={(e) =>
                setForm((f) => ({ ...f, observacoes: e.target.value }))
              }
              placeholder="Responsáveis, contato, notas livres"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? 'Salvando...'
              : editingId
              ? 'Salvar alterações'
              : 'Cadastrar igreja'}
          </button>
          {editingId && (
            <button
              type="button"
              className="text-xs text-slate-600 underline"
              onClick={() => {
                setEditingId(null);
                setForm({
                  nome: '',
                  cidade: '',
                  estado: '',
                  pais: '',
                  linhagem: '',
                  observacoes: '',
                  lat: '',
                  lng: '',
                });
              }}
            >
              Cancelar edição
            </button>
          )}
          {mutation.error && (
            <span className="text-xs text-red-600">
              {(mutation.error as Error).message}
            </span>
          )}
          {mutation.isSuccess && (
            <span className="text-xs text-emerald-700">Salvo.</span>
          )}
        </div>
      </form>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            Igrejas cadastradas
          </h2>
          {igrejasQuery.isLoading && (
            <span className="text-xs text-slate-500">Carregando...</span>
          )}
        </div>

        {igrejasOrdenadas.length === 0 && !igrejasQuery.isLoading ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Nenhuma igreja cadastrada ainda.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {igrejasOrdenadas.map((ig) => {
              const localParts = [ig.cidade, ig.estado, ig.pais]
                .filter(Boolean)
                .join(' • ');
              const uso = usoIgrejas.get(ig.id) || {
                trabalhosLocal: 0,
                trabalhosResponsavel: 0,
                pessoasAtuais: 0,
                pessoasFardamento: 0,
              };
              const mapLink =
                ig.lat && ig.lng
                  ? `https://www.openstreetmap.org/?mlat=${ig.lat}&mlon=${ig.lng}&zoom=14`
                  : null;
              return (
                <div
                  key={ig.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {ig.nome}
                      </h3>
                      {ig.linhagem && (
                        <p className="text-xs text-slate-600">{ig.linhagem}</p>
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-slate-500">
                      {ig.id}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-slate-700">
                    {localParts && <p>{localParts}</p>}
                    {ig.observacoes && (
                      <p className="text-slate-600">{ig.observacoes}</p>
                    )}
                    {mapLink && (
                      <a
                        className="text-xs text-slate-600 underline"
                        href={mapLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver no mapa ({ig.lat?.toFixed(4)}, {ig.lng?.toFixed(4)})
                      </a>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="rounded-md bg-slate-100 px-2 py-1">
                      <div className="font-semibold text-slate-800">
                        Trabalhos
                      </div>
                      <div>Local: {uso.trabalhosLocal}</div>
                      <div>Responsável: {uso.trabalhosResponsavel}</div>
                    </div>
                    <div className="rounded-md bg-slate-100 px-2 py-1">
                      <div className="font-semibold text-slate-800">
                        Pessoas
                      </div>
                      <div>Atuais: {uso.pessoasAtuais}</div>
                      <div>Fardamento: {uso.pessoasFardamento}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <button
                      className="rounded border border-slate-300 px-3 py-1 font-medium text-slate-700 shadow-sm"
                      onClick={() => {
                        setEditingId(ig.id);
                        setForm({
                          nome: ig.nome ?? '',
                          cidade: ig.cidade ?? '',
                          estado: ig.estado ?? '',
                          pais: ig.pais ?? '',
                          linhagem: ig.linhagem ?? '',
                          observacoes: ig.observacoes ?? '',
                          lat: ig.lat?.toString() ?? '',
                          lng: ig.lng?.toString() ?? '',
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="rounded border border-red-200 px-3 py-1 font-medium text-red-700 shadow-sm disabled:opacity-50"
                      disabled={
                        deleteMutation.isPending &&
                        deleteMutation.variables === ig.id
                      }
                      onClick={() => {
                        const ok = window.confirm('Excluir esta igreja?');
                        if (!ok) return;
                        deleteMutation.mutate(ig.id);
                      }}
                    >
                      {deleteMutation.isPending &&
                      deleteMutation.variables === ig.id
                        ? 'Excluindo...'
                        : 'Excluir'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChurchesPage;
