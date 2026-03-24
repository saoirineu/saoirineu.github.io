import type { UseMutationResult } from '@tanstack/react-query';

import type { IgrejaInfo } from '../../lib/trabalhos';
import { emptyIgrejaUsageStats, type IgrejaFormState, type IgrejaUsageStats } from './form';

type FormSectionProps = {
  editingId: string | null;
  errorMessage?: string;
  form: IgrejaFormState;
  isSuccess: boolean;
  mutation: UseMutationResult<unknown, Error, void, unknown>;
  onCancelEdit: () => void;
  onSubmit: () => void;
  setField: <K extends keyof IgrejaFormState>(field: K, value: IgrejaFormState[K]) => void;
  userPresent: boolean;
};

type ListSectionProps = {
  deleteMutation: UseMutationResult<unknown, Error, string, unknown>;
  igrejas: IgrejaInfo[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onEdit: (igreja: IgrejaInfo) => void;
  usoIgrejas: Map<string, IgrejaUsageStats>;
};

export function IgrejaFormSection({
  editingId,
  errorMessage,
  form,
  isSuccess,
  mutation,
  onCancelEdit,
  onSubmit,
  setField,
  userPresent
}: FormSectionProps) {
  return (
    <form
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Nova igreja</h2>
          <p className="text-xs text-slate-500">
            Preencha o nome e, se quiser, localização, linhagem e coordenadas (para mapa).
          </p>
        </div>
        <div className="text-xs text-slate-600">
          {editingId ? <span className="text-amber-700">Editando {editingId}</span> : null}
          {!userPresent ? <span className="ml-2 text-amber-600">Faça login para salvar</span> : null}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg bg-slate-100 p-3 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Nome
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.nome}
            onChange={event => setField('nome', event.target.value)}
            placeholder="Ex.: Igreja da Floresta"
            required
          />
        </label>

        <label className="text-sm text-slate-700">
          Linhagem / casa
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.linhagem}
            onChange={event => setField('linhagem', event.target.value)}
            placeholder="Ex.: ICEFLU, CEFLI, IDCEFLU, Barquinha, UdV, Linha Unificada, etc."
          />
        </label>

        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          <label className="text-sm text-slate-700">
            Cidade
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.cidade}
              onChange={event => setField('cidade', event.target.value)}
              placeholder="Ex.: Rio Branco"
            />
          </label>
          <label className="text-sm text-slate-700">
            Estado
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.estado}
              onChange={event => setField('estado', event.target.value)}
              placeholder="AC"
            />
          </label>
          <label className="text-sm text-slate-700">
            País
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.pais}
              onChange={event => setField('pais', event.target.value)}
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
              onChange={event => setField('lat', event.target.value)}
              placeholder="Ex.: -9.975"
            />
          </label>
          <label className="text-sm text-slate-700">
            Longitude
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.lng}
              onChange={event => setField('lng', event.target.value)}
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
            onChange={event => setField('observacoes', event.target.value)}
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
          {mutation.isPending ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar igreja'}
        </button>
        {editingId ? (
          <button type="button" className="text-xs text-slate-600 underline" onClick={onCancelEdit}>
            Cancelar edição
          </button>
        ) : null}
        {errorMessage ? <span className="text-xs text-red-600">{errorMessage}</span> : null}
        {isSuccess ? <span className="text-xs text-emerald-700">Salvo.</span> : null}
      </div>
    </form>
  );
}

function IgrejaCard({
  deleteMutation,
  igreja,
  onDelete,
  onEdit,
  uso
}: {
  deleteMutation: UseMutationResult<unknown, Error, string, unknown>;
  igreja: IgrejaInfo;
  onDelete: (id: string) => void;
  onEdit: (igreja: IgrejaInfo) => void;
  uso: IgrejaUsageStats;
}) {
  const localParts = [igreja.cidade, igreja.estado, igreja.pais].filter(Boolean).join(' • ');
  const mapLink =
    igreja.lat && igreja.lng
      ? `https://www.openstreetmap.org/?mlat=${igreja.lat}&mlon=${igreja.lng}&zoom=14`
      : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{igreja.nome}</h3>
          {igreja.linhagem ? <p className="text-xs text-slate-600">{igreja.linhagem}</p> : null}
        </div>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">{igreja.id}</span>
      </div>
      <div className="mt-2 space-y-1 text-sm text-slate-700">
        {localParts ? <p>{localParts}</p> : null}
        {igreja.observacoes ? <p className="text-slate-600">{igreja.observacoes}</p> : null}
        {mapLink ? (
          <a className="text-xs text-slate-600 underline" href={mapLink} target="_blank" rel="noreferrer">
            Ver no mapa ({igreja.lat?.toFixed(4)}, {igreja.lng?.toFixed(4)})
          </a>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div className="rounded-md bg-slate-100 px-2 py-1">
          <div className="font-semibold text-slate-800">Trabalhos</div>
          <div>Local: {uso.trabalhosLocal}</div>
          <div>Responsável: {uso.trabalhosResponsavel}</div>
        </div>
        <div className="rounded-md bg-slate-100 px-2 py-1">
          <div className="font-semibold text-slate-800">Pessoas</div>
          <div>Atuais: {uso.pessoasAtuais}</div>
          <div>Fardamento: {uso.pessoasFardamento}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <button className="rounded border border-slate-300 px-3 py-1 font-medium text-slate-700 shadow-sm" onClick={() => onEdit(igreja)}>
          Editar
        </button>
        <button
          className="rounded border border-red-200 px-3 py-1 font-medium text-red-700 shadow-sm disabled:opacity-50"
          disabled={deleteMutation.isPending && deleteMutation.variables === igreja.id}
          onClick={() => onDelete(igreja.id)}
        >
          {deleteMutation.isPending && deleteMutation.variables === igreja.id ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
    </div>
  );
}

export function IgrejasListSection({
  deleteMutation,
  igrejas,
  isLoading,
  onDelete,
  onEdit,
  usoIgrejas
}: ListSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Igrejas cadastradas</h2>
        {isLoading ? <span className="text-xs text-slate-500">Carregando...</span> : null}
      </div>

      {igrejas.length === 0 && !isLoading ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          Nenhuma igreja cadastrada ainda.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {igrejas.map(igreja => (
            <IgrejaCard
              key={igreja.id}
              deleteMutation={deleteMutation}
              igreja={igreja}
              onDelete={onDelete}
              onEdit={onEdit}
              uso={usoIgrejas.get(igreja.id) ?? emptyIgrejaUsageStats}
            />
          ))}
        </div>
      )}
    </div>
  );
}