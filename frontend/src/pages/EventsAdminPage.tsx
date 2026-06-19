import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createEvent,
  deleteEvent,
  fetchEvents,
  updateEvent,
  validateEventInput,
  type EventLocale,
  type EventRecord,
  type EventStatus
} from '../lib/events';
import {
  buildEventInput,
  initialEventForm,
  prefillEventForm,
  type EventFormValues,
  type EventFormWork
} from './events/form';

const statusLabels: Record<EventStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  closed: 'Fechado',
  archived: 'Arquivado'
};

const statusBadgeClasses: Record<EventStatus, string> = {
  draft: 'border-slate-200 bg-slate-50 text-slate-700',
  published: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  closed: 'border-amber-200 bg-amber-50 text-amber-800',
  archived: 'border-violet-200 bg-violet-50 text-violet-800'
};

const validationMessages: Record<string, string> = {
  title: 'Informe ao menos um título.',
  slug: 'Slug inválido (apenas minúsculas, números e hífens).',
  capacity: 'Configure a capacidade (vagas totais ou quartos válidos).',
  cautionDepositRate: 'A caução deve estar entre 0% e 100%.',
  works: 'Adicione ao menos um trabalho (e exatamente um para evento único).',
  pricing: 'Verifique os valores de hospedagem/alimentação.'
};

const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm';

function localizedTitle(record: EventRecord) {
  return record.title.pt || record.title.en || record.title.es || record.title.it || record.slug;
}

export default function EventsAdminPage() {
  const qc = useQueryClient();
  const { data: events, isLoading, error } = useQuery({ queryKey: ['events'], queryFn: fetchEvents });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormValues>(initialEventForm);
  const [formError, setFormError] = useState('');

  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) =>
    setForm(current => ({ ...current, [key]: value }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = buildEventInput(form);
      const validation = validateEventInput(input);
      if (validation) {
        throw new Error(validationMessages[validation] ?? 'Formulário inválido.');
      }
      if (editingId) {
        await updateEvent(editingId, input);
      } else {
        await createEvent(input);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['events'] });
      setForm(initialEventForm);
      setEditingId(null);
      setFormError('');
    },
    onError: e => setFormError(e instanceof Error ? e.message : 'Erro ao salvar.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['events'] });
      if (editingId) {
        setEditingId(null);
        setForm(initialEventForm);
      }
    }
  });

  const startEdit = (record: EventRecord) => {
    setEditingId(record.id);
    setForm(prefillEventForm(record));
    setFormError('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateWork = (index: number, patch: Partial<EventFormWork>) =>
    setForm(current => ({
      ...current,
      works: current.works.map((work, i) => (i === index ? { ...work, ...patch } : work))
    }));

  const addWork = () =>
    setForm(current => ({
      ...current,
      works: [
        ...current.works,
        { id: `work-${current.works.length + 1}-${Date.now()}`, labelPt: '', labelEn: '', labelEs: '', labelIt: '', dateTime: '' }
      ]
    }));

  const removeWork = (index: number) =>
    setForm(current => ({ ...current, works: current.works.filter((_, i) => i !== index) }));

  const updateRoom = (index: number, patch: Partial<{ name: string; capacity: string }>) =>
    setForm(current => ({
      ...current,
      rooms: current.rooms.map((room, i) => (i === index ? { ...room, ...patch } : room))
    }));

  const addRoom = () => setForm(current => ({ ...current, rooms: [...current.rooms, { name: '', capacity: '' }] }));
  const removeRoom = (index: number) =>
    setForm(current => ({ ...current, rooms: current.rooms.filter((_, i) => i !== index) }));

  const updateResource = (kind: keyof EventFormValues['resources'], locale: EventLocale, value: string) =>
    setForm(current => ({
      ...current,
      resources: { ...current.resources, [kind]: { ...current.resources[kind], [locale]: value } }
    }));

  if (isLoading) return <div className="text-sm text-slate-600">Carregando eventos...</div>;
  if (error) return <div className="text-sm text-red-600">Erro ao carregar eventos.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Eventos</h1>
        <p className="text-sm text-slate-600">Crie e configure eventos (como o Encontro Europeu): vagas, caução, trabalhos e valores.</p>
      </div>

      <form
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={e => {
          e.preventDefault();
          saveMutation.mutate();
        }}
      >
        <h2 className="text-sm font-semibold text-slate-800">{editingId ? 'Editar evento' : 'Novo evento'}</h2>

        <div className="grid gap-3 rounded-lg bg-slate-100 p-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700">Título (PT)
            <input className={inputClass} value={form.titlePt} onChange={e => set('titlePt', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700">Título (EN)
            <input className={inputClass} value={form.titleEn} onChange={e => set('titleEn', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700">Título (ES)
            <input className={inputClass} value={form.titleEs} onChange={e => set('titleEs', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700">Título (IT)
            <input className={inputClass} value={form.titleIt} onChange={e => set('titleIt', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700">Slug (deixe vazio para gerar do título)
            <input className={inputClass} value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="encontro-europeu-2026" disabled={!!editingId} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-700">Situação
              <select className={inputClass} value={form.status} onChange={e => set('status', e.target.value as EventStatus)}>
                {(Object.keys(statusLabels) as EventStatus[]).map(status => (
                  <option key={status} value={status}>{statusLabels[status]}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700">Tipo
              <select className={inputClass} value={form.kind} onChange={e => set('kind', e.target.value as EventFormValues['kind'])}>
                <option value="single">Trabalho único</option>
                <option value="multi">Vários dias / trabalhos</option>
              </select>
            </label>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg bg-slate-100 p-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700">Capacidade
            <select className={inputClass} value={form.capacityMode} onChange={e => set('capacityMode', e.target.value as EventFormValues['capacityMode'])}>
              <option value="total">Vagas totais</option>
              <option value="rooms">Quartos com vagas</option>
            </select>
          </label>
          {form.capacityMode === 'total' ? (
            <label className="text-sm text-slate-700">Vagas totais
              <input type="number" className={inputClass} value={form.totalSlots} onChange={e => set('totalSlots', e.target.value)} />
            </label>
          ) : (
            <div className="sm:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Quartos</span>
                <button type="button" className="text-xs font-medium text-blue-700 underline" onClick={addRoom}>+ adicionar quarto</button>
              </div>
              {form.rooms.length === 0 ? <p className="text-xs text-slate-500">Nenhum quarto. Adicione ao menos um.</p> : null}
              {form.rooms.map((room, index) => (
                <div key={index} className="grid grid-cols-[1fr,8rem,auto] items-end gap-2">
                  <label className="text-xs text-slate-600">Nome
                    <input className={inputClass} value={room.name} onChange={e => updateRoom(index, { name: e.target.value })} />
                  </label>
                  <label className="text-xs text-slate-600">Vagas
                    <input type="number" className={inputClass} value={room.capacity} onChange={e => updateRoom(index, { capacity: e.target.value })} />
                  </label>
                  <button type="button" className="mb-1 rounded border border-rose-200 px-2 py-1 text-xs text-rose-700" onClick={() => removeRoom(index)}>remover</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-3 rounded-lg bg-slate-100 p-3 sm:grid-cols-4">
          <label className="text-sm text-slate-700">Caução (%)
            <input type="number" className={inputClass} value={form.cautionDepositPercent} onChange={e => set('cautionDepositPercent', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700 sm:col-span-3">Beneficiário
            <input className={inputClass} value={form.paymentBeneficiary} onChange={e => set('paymentBeneficiary', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700 sm:col-span-2">IBAN
            <input className={inputClass} value={form.paymentIban} onChange={e => set('paymentIban', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700">SWIFT
            <input className={inputClass} value={form.paymentSwift} onChange={e => set('paymentSwift', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700">Causale
            <input className={inputClass} value={form.paymentCausale} onChange={e => set('paymentCausale', e.target.value)} />
          </label>
        </div>

        <div className="space-y-2 rounded-lg bg-slate-100 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Trabalhos</span>
            <button type="button" className="text-xs font-medium text-blue-700 underline" onClick={addWork}>+ adicionar trabalho</button>
          </div>
          {form.works.map((work, index) => (
            <div key={work.id} className="grid gap-2 rounded-md border border-slate-200 bg-white p-2 sm:grid-cols-[repeat(4,1fr),12rem,auto]">
              <input className="rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="PT" value={work.labelPt} onChange={e => updateWork(index, { labelPt: e.target.value })} />
              <input className="rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="EN" value={work.labelEn} onChange={e => updateWork(index, { labelEn: e.target.value })} />
              <input className="rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="ES" value={work.labelEs} onChange={e => updateWork(index, { labelEs: e.target.value })} />
              <input className="rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="IT" value={work.labelIt} onChange={e => updateWork(index, { labelIt: e.target.value })} />
              <input type="datetime-local" className="rounded-lg border border-slate-200 px-2 py-1 text-sm" value={work.dateTime} onChange={e => updateWork(index, { dateTime: e.target.value })} />
              <button type="button" className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700" onClick={() => removeWork(index)} disabled={form.works.length <= 1}>remover</button>
            </div>
          ))}
        </div>

        <div className="grid gap-3 rounded-lg bg-slate-100 p-3 sm:grid-cols-3">
          <label className="text-sm text-slate-700">Hospedagem (€/noite)
            <input type="number" className={inputClass} value={form.lodgingNightRate} onChange={e => set('lodgingNightRate', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700">Alimentação (€/noite)
            <input type="number" className={inputClass} value={form.mealsNightRate} onChange={e => set('mealsNightRate', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700">Extra (lençol/toalhas)
            <input type="number" className={inputClass} value={form.extraLinen} onChange={e => set('extraLinen', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700 sm:col-span-3">Contribuição por nº de trabalhos — Visitante (ex.: 0, 100, 180, 240, 300)
            <input className={inputClass} value={form.worksAnyone} onChange={e => set('worksAnyone', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700 sm:col-span-3">Contribuição por nº de trabalhos — Fardado
            <input className={inputClass} value={form.worksInitiated} onChange={e => set('worksInitiated', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700 sm:col-span-3">Contribuição por nº de trabalhos — ICEFLU
            <input className={inputClass} value={form.worksIceflu} onChange={e => set('worksIceflu', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700">Check-in sugerido
            <input type="date" className={inputClass} value={form.checkInSuggested} onChange={e => set('checkInSuggested', e.target.value)} />
          </label>
          <label className="text-sm text-slate-700">Check-out sugerido
            <input type="date" className={inputClass} value={form.checkOutSuggested} onChange={e => set('checkOutSuggested', e.target.value)} />
          </label>
        </div>

        <div className="space-y-2 rounded-lg bg-slate-100 p-3">
          <span className="text-sm font-medium text-slate-700">Recursos (links por idioma — opcional)</span>
          {([['programUrl', 'Programa'], ['directionsUrl', 'Como chegar'], ['consentFormUrl', 'Consentimento informado']] as const).map(([kind, label]) => (
            <div key={kind} className="grid gap-1">
              <span className="text-xs text-slate-600">{label}</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['pt', 'en', 'es', 'it'] as EventLocale[]).map(loc => (
                  <input
                    key={loc}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    placeholder={loc.toUpperCase()}
                    value={form.resources[kind][loc]}
                    onChange={e => updateResource(kind, loc, e.target.value)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60">
            {saveMutation.isPending ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar evento'}
          </button>
          {editingId ? (
            <button type="button" className="text-xs text-slate-600 underline" onClick={() => { setEditingId(null); setForm(initialEventForm); setFormError(''); }}>
              Cancelar edição
            </button>
          ) : null}
          {formError ? <span className="text-sm text-red-600">{formError}</span> : null}
        </div>
      </form>

      <div className="space-y-3">
        {(!events || events.length === 0) && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Nenhum evento cadastrado ainda.
          </div>
        )}
        {events?.map(record => (
          <div key={record.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-slate-900">{localizedTitle(record)}</span>
                <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusBadgeClasses[record.status]}`}>{statusLabels[record.status]}</span>
              </div>
              <div className="text-sm text-slate-600">
                {record.slug} · {record.kind === 'single' ? 'trabalho único' : 'vários trabalhos'} · {record.works.length} trabalho(s) ·{' '}
                {record.capacityMode === 'total' ? `${record.totalSlots ?? 0} vagas` : `${record.rooms?.length ?? 0} quarto(s)`} ·{' '}
                caução {Math.round(record.cautionDepositRate * 100)}%
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Link to={`/admin/events/${record.slug}/registrations`} className="rounded border border-slate-300 px-3 py-1 font-medium text-slate-700 shadow-sm">Inscrições</Link>
              <button className="rounded border border-slate-300 px-3 py-1 font-medium text-slate-700 shadow-sm" onClick={() => startEdit(record)}>Editar</button>
              <button
                className="rounded border border-red-200 px-3 py-1 font-medium text-red-700 shadow-sm disabled:opacity-50"
                disabled={deleteMutation.isPending && deleteMutation.variables === record.id}
                onClick={() => {
                  if (window.confirm('Excluir este evento?')) deleteMutation.mutate(record.id);
                }}
              >
                {deleteMutation.isPending && deleteMutation.variables === record.id ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
