import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchSessions,
  createSession,
  fetchChurches,
  fetchBeverageBatches,
  updateSession,
  deleteSession
} from '../lib/sessions';
import { useAuth } from '../providers/useAuth';
import {
  buildSessionPayload,
  formatDate,
  formatTime,
  initialSessionForm,
  prefillSessionForm,
  totalAttendees
} from './sessions/form';

export function SessionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['sessions'], queryFn: fetchSessions });
  const churchesQuery = useQuery({ queryKey: ['churches'], queryFn: fetchChurches });
  const beverageQuery = useQuery({ queryKey: ['beverageBatches'], queryFn: fetchBeverageBatches });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialSessionForm);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sessão expirada');

      const payload = buildSessionPayload({
        beverageBatches: beverageQuery.data,
        form,
        churches: churchesQuery.data,
        userId: user.uid
      });

      if (editingId) {
        return updateSession(editingId, { ...payload, createdBy: undefined });
      }

      return createSession(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sessions'] });
      setForm(initialSessionForm);
      setEditingId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Sessão expirada');
      return deleteSession(id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sessions'] });
      if (editingId) setEditingId(null);
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
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={e => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Novo trabalho</h2>
          <p className="text-xs text-slate-500">Campos principais para criar rapidamente.</p>
        </div>

        <div className="grid gap-3 rounded-lg bg-slate-100 p-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            Título
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Trabalho de..."
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-700">
              Data
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </label>
            <label className="text-sm text-slate-700">
              Horário início
              <input
                type="time"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <label className="text-sm text-slate-700">
              Duração esperada (min)
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.expectedDurationMin}
                onChange={e => setForm(f => ({ ...f, expectedDurationMin: e.target.value }))}
              />
            </label>
            <label className="text-sm text-slate-700">
              Duração efetiva (min)
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.actualDurationMin}
                onChange={e => setForm(f => ({ ...f, actualDurationMin: e.target.value }))}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg bg-slate-100 p-3 sm:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-700">
              Igreja responsável (cadastrada)
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.churchRespId}
                onChange={e => {
                  const found = churchesQuery.data?.find(i => i.id === e.target.value);
                  setForm(f => ({ ...f, churchRespId: e.target.value, churchRespName: found?.name ?? '' }));
                }}
              >
                <option value="">— Selecionar —</option>
                {churchesQuery.data?.map(ig => (
                  <option key={ig.id} value={ig.id}>
                    {ig.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              Igreja responsável (texto livre)
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.churchesText}
                onChange={e => setForm(f => ({ ...f, churchesText: e.target.value }))}
                placeholder="Ex.: igreja não cadastrada ou múltiplas"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-700">
              Local (igreja cadastrada)
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.venueId}
                onChange={e => {
                  const found = churchesQuery.data?.find(i => i.id === e.target.value);
                  setForm(f => ({ ...f, venueId: e.target.value, venueName: found?.name ?? '' }));
                }}
              >
                <option value="">— Selecionar —</option>
                {churchesQuery.data?.map(ig => (
                  <option key={ig.id} value={ig.id}>
                    {ig.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Local (texto livre)
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.venueText}
                onChange={e => setForm(f => ({ ...f, venueText: e.target.value }))}
                placeholder="Ex.: nome da igreja não cadastrada ou outra localidade"
              />
            </label>
          </div>

          <label className="text-sm text-slate-700 sm:col-span-2">
            Hinários (separar por vírgula)
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.hymnals}
              onChange={e => setForm(f => ({ ...f, hymnals: e.target.value }))}
              placeholder="Ex.: O Cruzeiro, Lua Branca"
            />
          </label>
        </div>

        <div className="grid gap-3 rounded-lg bg-slate-100 p-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <label className="text-sm text-slate-700">
              Total de pessoas
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.total}
                onChange={e => setForm(f => ({ ...f, total: e.target.value }))}
              />
            </label>
            <label className="text-sm text-slate-700">
              Fardados
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.initiated}
                onChange={e => setForm(f => ({ ...f, initiated: e.target.value }))}
              />
            </label>
            <label className="text-sm text-slate-700">
              Homens
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.men}
                onChange={e => setForm(f => ({ ...f, men: e.target.value }))}
              />
            </label>
            <label className="text-sm text-slate-700">
              Mulheres
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.women}
                onChange={e => setForm(f => ({ ...f, women: e.target.value }))}
              />
            </label>
            <label className="text-sm text-slate-700">
              Crianças
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.children}
                onChange={e => setForm(f => ({ ...f, children: e.target.value }))}
              />
            </label>
            <label className="text-sm text-slate-700">
              Outros
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.others}
                onChange={e => setForm(f => ({ ...f, others: e.target.value }))}
              />
            </label>
          </div>
          <label className="text-sm text-slate-700">
            Descrição de "outros"
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.othersDescription}
              onChange={e => setForm(f => ({ ...f, othersDescription: e.target.value }))}
              placeholder="Ex.: visitantes, músicos convidados, equipe técnica"
            />
          </label>
        </div>

        <div className="grid gap-3 rounded-lg bg-slate-100 p-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-700">
              Lote de Daime (cadastrado)
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.batchId}
                onChange={e => {
                  const found = beverageQuery.data?.find(b => b.id === e.target.value);
                  setForm(f => ({ ...f, batchId: e.target.value, batchDescription: found?.description ?? '' }));
                }}
              >
                <option value="">— Selecionar —</option>
                {beverageQuery.data?.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.description}
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
                value={form.liters}
                onChange={e => setForm(f => ({ ...f, liters: e.target.value }))}
              />
            </label>
          </div>

          <label className="text-sm text-slate-700">
            Descrição do Daime (texto livre)
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.batchText}
              onChange={e => setForm(f => ({ ...f, batchText: e.target.value }))}
              placeholder="Ex.: primeiro grau, 1x1, 2023, Céu do Vale"
            />
          </label>
        </div>

        <div className="rounded-lg bg-slate-100 p-3">
          <label className="text-sm text-slate-700">
            Anotações
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            {mutation.isPending ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar trabalho'}
          </button>
          {editingId && (
            <button
              type="button"
              className="text-xs text-slate-600 underline"
              onClick={() => {
                setEditingId(null);
                setForm(initialSessionForm);
              }}
            >
              Cancelar edição
            </button>
          )}
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

        {data?.map(session => {
          const attendees = totalAttendees(session.attendees);
          const editPrefill = () => {
            setEditingId(session.id);
            setForm(prefillSessionForm(session));
          };

          return (
            <div
              key={session.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{session.title || 'Trabalho'}</div>
                  <div className="text-sm text-slate-600">
                    {formatDate(session.date)} • {formatTime(session.startTime)} •{' '}
                    {session.venueName || session.venueText || 'Local a definir'}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {session.beverage?.batchId || session.beverage?.batchDescription || session.beverage?.batchText ? (
                    <div className="text-xs font-medium text-blue-700">
                      Daime: {session.beverage.batchDescription || session.beverage.batchId || session.beverage.batchText}
                      {session.beverage.liters ? ` • ${session.beverage.liters} L` : ''}
                    </div>
                  ) : null}
                  <button
                    className="rounded border border-slate-300 px-3 py-1 font-medium text-slate-700 shadow-sm"
                    onClick={editPrefill}
                  >
                    Editar
                  </button>
                  <button
                    className="rounded border border-red-200 px-3 py-1 font-medium text-red-700 shadow-sm disabled:opacity-50"
                    disabled={deleteMutation.isPending && deleteMutation.variables === session.id}
                    onClick={() => {
                      const ok = window.confirm('Excluir este trabalho?');
                      if (!ok) return;
                      deleteMutation.mutate(session.id);
                    }}
                  >
                    {deleteMutation.isPending && deleteMutation.variables === session.id
                      ? 'Excluindo...'
                      : 'Excluir'}
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <span className="font-medium">Igrejas responsáveis:</span>{' '}
                  {session.responsibleChurchNames?.length
                    ? session.responsibleChurchNames.join(', ')
                    : session.responsibleChurchText || '—'}
                </div>
                <div>
                  <span className="font-medium">Hinários:</span>{' '}
                  {session.hymnals?.length ? session.hymnals.join(', ') : '—'}
                </div>
                <div>
                  <span className="font-medium">Participantes:</span>{' '}
                  {attendees
                    ? `${attendees.total} (F:${attendees.initiated ?? '0'} H:${attendees.men} M:${attendees.women}` +
                      ` C:${attendees.children} ` +
                      `${attendees.others ? ` O:${attendees.others}` : ''})`
                    : '—'}
                </div>
                <div>
                  <span className="font-medium">Duração esperada:</span>{' '}
                  {session.expectedDurationMin ? `${session.expectedDurationMin} min` : '—'}
                  {session.actualDurationMin ? ` • Efetiva: ${session.actualDurationMin} min` : ''}
                </div>
              </div>

              {session.notes ? (
                <p className="mt-3 text-sm text-slate-600">{session.notes}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SessionsPage;
