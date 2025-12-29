import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';

import {
  fetchTrabalhos,
  Trabalho,
  createTrabalho,
  fetchIgrejas,
  fetchBebidaLotes
} from '../lib/trabalhos';
import { useAuth } from '../providers/AuthProvider';

function formatDate(ts?: Timestamp | null) {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('pt-BR');
}

function formatTime(ts?: Timestamp | null) {
  if (!ts) return '—';
  return ts.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function totalParticipantes(p?: Trabalho['participantes']) {
  if (!p) return null;
  const total =
    (p.total ?? 0) || (p.homens ?? 0) + (p.mulheres ?? 0) + (p.criancas ?? 0) + (p.outros ?? 0);
  return {
    total,
    homens: p.homens ?? 0,
    mulheres: p.mulheres ?? 0,
    criancas: p.criancas ?? 0,
    outros: p.outros ?? 0,
    outrosDescricao: p.outrosDescricao
  };
}

export function TrabalhosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['trabalhos'], queryFn: fetchTrabalhos });
  const igrejasQuery = useQuery({ queryKey: ['igrejas'], queryFn: fetchIgrejas });
  const bebidaQuery = useQuery({ queryKey: ['bebidaLotes'], queryFn: fetchBebidaLotes });

  const [form, setForm] = useState({
    titulo: '',
    data: '',
    horario: '',
    duracaoEsperadaMin: '',
    duracaoEfetivaMin: '',
    hinarios: '',
    igrejaRespId: '',
    igrejaRespNome: '',
    igrejasTexto: '',
    localId: '',
    localNome: '',
    localTexto: '',
    homens: '',
    mulheres: '',
    criancas: '',
    outros: '',
    outrosDescricao: '',
    loteId: '',
    loteDescricao: '',
    loteTexto: '',
    quantidadeLitros: '',
    anotacoes: ''
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sessão expirada');

      const dataTs = form.data ? Timestamp.fromDate(new Date(form.data)) : null;
      const horarioTs = form.horario && form.data
        ? Timestamp.fromDate(new Date(`${form.data}T${form.horario}:00`))
        : null;

      const igrejaResp = igrejasQuery.data?.find(i => i.id === form.igrejaRespId);
      const localSelecionado = igrejasQuery.data?.find(i => i.id === form.localId);
      const loteSelecionado = bebidaQuery.data?.find(b => b.id === form.loteId);

      return createTrabalho({
        titulo: form.titulo || undefined,
        data: dataTs,
        horarioInicio: horarioTs,
        duracaoEsperadaMin: form.duracaoEsperadaMin ? Number(form.duracaoEsperadaMin) : null,
        duracaoEfetivaMin: form.duracaoEfetivaMin ? Number(form.duracaoEfetivaMin) : null,
        localId: localSelecionado?.id,
        localNome: localSelecionado?.nome,
        localTexto: form.localTexto || undefined,
        hinarios: form.hinarios
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        igrejasResponsaveisIds: igrejaResp ? [igrejaResp.id] : undefined,
        igrejasResponsaveisNomes: igrejaResp ? [igrejaResp.nome] : undefined,
        igrejasResponsaveisTexto: form.igrejasTexto || undefined,
        participantes: {
          total:
            (form.homens ? Number(form.homens) : 0) +
            (form.mulheres ? Number(form.mulheres) : 0) +
            (form.criancas ? Number(form.criancas) : 0) +
            (form.outros ? Number(form.outros) : 0),
          homens: form.homens ? Number(form.homens) : undefined,
          mulheres: form.mulheres ? Number(form.mulheres) : undefined,
          criancas: form.criancas ? Number(form.criancas) : undefined,
          outros: form.outros ? Number(form.outros) : undefined,
          outrosDescricao: form.outrosDescricao || undefined
        },
        bebida: {
          loteId: loteSelecionado?.id || undefined,
          loteDescricao: loteSelecionado?.descricao || form.loteDescricao || undefined,
          loteTexto: form.loteTexto || undefined,
          quantidadeLitros: form.quantidadeLitros ? Number(form.quantidadeLitros) : null
        },
        anotacoes: form.anotacoes || undefined,
        createdBy: user.uid
      } as any);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['trabalhos'] });
      setForm({
        titulo: '',
        data: '',
        horario: '',
        duracaoEsperadaMin: '',
        duracaoEfetivaMin: '',
        hinarios: '',
        igrejaRespId: '',
        igrejaRespNome: '',
        igrejasTexto: '',
        localId: '',
        localNome: '',
        localTexto: '',
        homens: '',
        mulheres: '',
        criancas: '',
        outros: '',
        outrosDescricao: '',
        loteId: '',
        loteDescricao: '',
        loteTexto: '',
        quantidadeLitros: '',
        anotacoes: ''
      });
    }
  });

  if (isLoading) {
    return <div className="text-sm text-slate-600">Carregando trabalhos...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">Erro ao carregar trabalhos.</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Trabalhos</h1>
        <p className="text-sm text-slate-600">Agenda e histórico com hinários, igrejas, participantes e Daime.</p>
      </div>

      <form
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2"
        onSubmit={e => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="sm:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800">Novo trabalho</h2>
          <p className="text-xs text-slate-500">Campos principais para criar rapidamente.</p>
        </div>

        <label className="text-sm text-slate-700">
          Título
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.titulo}
            onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            placeholder="Trabalho de..."
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-700">
            Data
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.data}
              onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-700">
            Horário início
            <input
              type="time"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.horario}
              onChange={e => setForm(f => ({ ...f, horario: e.target.value }))}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-700">
            Local (igreja cadastrada)
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.localId}
              onChange={e => {
                const found = igrejasQuery.data?.find(i => i.id === e.target.value);
                setForm(f => ({ ...f, localId: e.target.value, localNome: found?.nome ?? '' }));
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
            Local (texto livre)
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.localTexto}
              onChange={e => setForm(f => ({ ...f, localTexto: e.target.value }))}
              placeholder="Ex.: nome da igreja não cadastrada ou outra localidade"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-700">
            Duração esperada (min)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.duracaoEsperadaMin}
              onChange={e => setForm(f => ({ ...f, duracaoEsperadaMin: e.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-700">
            Duração efetiva (min)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.duracaoEfetivaMin}
              onChange={e => setForm(f => ({ ...f, duracaoEfetivaMin: e.target.value }))}
            />
          </label>
        </div>

        <label className="text-sm text-slate-700">
          Hinários (separar por vírgula)
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.hinarios}
            onChange={e => setForm(f => ({ ...f, hinarios: e.target.value }))}
            placeholder="Ex.: O Cruzeiro, Lua Branca"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-700">
            Igreja responsável (cadastrada)
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.igrejaRespId}
              onChange={e => {
                const found = igrejasQuery.data?.find(i => i.id === e.target.value);
                setForm(f => ({ ...f, igrejaRespId: e.target.value, igrejaRespNome: found?.nome ?? '' }));
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
            Igreja responsável (texto livre)
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.igrejasTexto}
              onChange={e => setForm(f => ({ ...f, igrejasTexto: e.target.value }))}
              placeholder="Ex.: igreja não cadastrada ou múltiplas"
            />
          </label>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <label className="text-sm text-slate-700">
            Homens
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.homens}
              onChange={e => setForm(f => ({ ...f, homens: e.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-700">
            Mulheres
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.mulheres}
              onChange={e => setForm(f => ({ ...f, mulheres: e.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-700">
            Crianças
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.criancas}
              onChange={e => setForm(f => ({ ...f, criancas: e.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-700">
            Outros
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.outros}
              onChange={e => setForm(f => ({ ...f, outros: e.target.value }))}
            />
          </label>
        </div>
        <label className="text-sm text-slate-700">
          Descrição de "outros"
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.outrosDescricao}
            onChange={e => setForm(f => ({ ...f, outrosDescricao: e.target.value }))}
            placeholder="Ex.: visitantes, músicos convidados, equipe técnica"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-700">
            Lote de Daime (cadastrado)
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.loteId}
              onChange={e => {
                const found = bebidaQuery.data?.find(b => b.id === e.target.value);
                setForm(f => ({ ...f, loteId: e.target.value, loteDescricao: found?.descricao ?? '' }));
              }}
            >
              <option value="">— Selecionar —</option>
              {bebidaQuery.data?.map(b => (
                <option key={b.id} value={b.id}>
                  {b.descricao}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700">
            Quantidade (L)
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.quantidadeLitros}
              onChange={e => setForm(f => ({ ...f, quantidadeLitros: e.target.value }))}
            />
          </label>
        </div>

        <label className="text-sm text-slate-700">
          Descrição do Daime (texto livre)
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.loteTexto}
            onChange={e => setForm(f => ({ ...f, loteTexto: e.target.value }))}
            placeholder="Ex.: primeiro grau, 1x1, 2023, Céu do Vale"
          />
        </label>

        <label className="sm:col-span-2 text-sm text-slate-700">
          Anotações
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            value={form.anotacoes}
            onChange={e => setForm(f => ({ ...f, anotacoes: e.target.value }))}
          />
        </label>

        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar trabalho'}
          </button>
          {mutation.isError ? (
            <span className="text-sm text-red-600">Erro ao salvar.</span>
          ) : null}
          {mutation.isSuccess ? (
            <span className="text-sm text-green-700">Salvo.</span>
          ) : null}
        </div>
      </form>

      <div className="space-y-3">
        {(!data || data.length === 0) && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Nenhum trabalho cadastrado ainda.
          </div>
        )}

        {data?.map(trabalho => {
          const participantes = totalParticipantes(trabalho.participantes);

          return (
            <div
              key={trabalho.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{trabalho.titulo || 'Trabalho'}</div>
                  <div className="text-sm text-slate-600">
                    {formatDate(trabalho.data)} • {formatTime(trabalho.horarioInicio)} •
                    {' '}
                    {trabalho.localNome || trabalho.localTexto || 'Local a definir'}
                  </div>
                </div>
                {trabalho.bebida?.loteId || trabalho.bebida?.loteDescricao || trabalho.bebida?.loteTexto ? (
                  <div className="text-xs font-medium text-blue-700">
                    Daime: {trabalho.bebida.loteDescricao || trabalho.bebida.loteId || trabalho.bebida.loteTexto}
                    {trabalho.bebida.quantidadeLitros ? ` • ${trabalho.bebida.quantidadeLitros} L` : ''}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <span className="font-medium">Igrejas responsáveis:</span>{' '}
                  {trabalho.igrejasResponsaveisNomes?.length
                    ? trabalho.igrejasResponsaveisNomes.join(', ')
                    : trabalho.igrejasResponsaveisTexto || '—'}
                </div>
                <div>
                  <span className="font-medium">Hinários:</span>{' '}
                  {trabalho.hinarios?.length ? trabalho.hinarios.join(', ') : '—'}
                </div>
                <div>
                  <span className="font-medium">Participantes:</span>{' '}
                  {participantes
                    ? `${participantes.total} (H:${participantes.homens} M:${participantes.mulheres}` +
                      ` C:${participantes.criancas} ` +
                      `${participantes.outros ? ` O:${participantes.outros}` : ''})`
                    : '—'}
                </div>
                <div>
                  <span className="font-medium">Duração esperada:</span>{' '}
                  {trabalho.duracaoEsperadaMin ? `${trabalho.duracaoEsperadaMin} min` : '—'}
                  {trabalho.duracaoEfetivaMin ? ` • Efetiva: ${trabalho.duracaoEfetivaMin} min` : ''}
                </div>
              </div>

              {trabalho.anotacoes ? (
                <p className="mt-3 text-sm text-slate-600">{trabalho.anotacoes}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TrabalhosPage;
