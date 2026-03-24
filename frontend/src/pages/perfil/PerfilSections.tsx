import type { IgrejaInfo } from '../../lib/trabalhos';
import { avatarFallback, type PerfilFormFieldSetter, type PerfilFormState } from './form';

type IgrejasProps = {
  igrejas?: IgrejaInfo[];
};

type BaseSectionProps = {
  form: PerfilFormState;
  setField: PerfilFormFieldSetter;
};

function selectIgrejaName(igrejas: IgrejaInfo[] | undefined, id: string) {
  return igrejas?.find(igreja => igreja.id === id)?.nome ?? '';
}

export function PerfilDadosPessoaisSection({
  avatarUrl,
  form,
  setField,
  userPhotoURL
}: BaseSectionProps & { avatarUrl: string; userPhotoURL?: string | null }) {
  const resolvedAvatar = avatarUrl || userPhotoURL || avatarFallback(form.displayName, form.email);

  return (
    <div className="grid gap-4 rounded-lg bg-slate-100 p-3 sm:grid-cols-[1fr,240px]">
      <div className="space-y-3">
        <label className="text-sm text-slate-700">
          Nome
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.displayName}
            onChange={event => setField('displayName', event.target.value)}
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
            onChange={event => setField('phone', event.target.value)}
            placeholder="Opcional"
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-sm text-slate-700">
            Cidade
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.cidade}
              onChange={event => setField('cidade', event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700">
            Estado/UF
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.estado}
              onChange={event => setField('estado', event.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700">
            País
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.pais}
              onChange={event => setField('pais', event.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-lg bg-white/60 p-3 shadow-sm">
        <img
          src={resolvedAvatar}
          alt="Avatar"
          className="h-28 w-28 rounded-full border border-slate-200 object-cover shadow-sm"
        />
        <label className="w-full text-sm text-slate-700">
          URL do avatar
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.avatarUrl}
            onChange={event => setField('avatarUrl', event.target.value)}
            placeholder="https://..."
          />
        </label>
        {userPhotoURL ? (
          <button
            type="button"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={() => setField('avatarUrl', userPhotoURL)}
          >
            Usar foto do Google
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PerfilIgrejasSection({ form, igrejas, setField }: BaseSectionProps & IgrejasProps) {
  return (
    <div className="grid gap-3 rounded-lg bg-slate-100 p-3 sm:grid-cols-2">
      <div className="space-y-3">
        <label className="text-sm text-slate-700">
          Igreja atual (cadastrada)
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.igrejaAtualId}
            onChange={event => {
              const igrejaAtualId = event.target.value;
              setField('igrejaAtualId', igrejaAtualId);
              setField('igrejaAtualNome', selectIgrejaName(igrejas, igrejaAtualId));
            }}
          >
            <option value="">— Selecionar —</option>
            {igrejas?.map(igreja => (
              <option key={igreja.id} value={igreja.id}>
                {igreja.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Igreja atual (texto livre)
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.igrejaAtualNome}
            onChange={event => setField('igrejaAtualNome', event.target.value)}
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
            onChange={event => setField('igrejaOrigemNome', event.target.value)}
            placeholder="Linha ou igreja de onde veio"
          />
        </label>
        <label className="text-sm text-slate-700">
          Observações gerais
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            value={form.observacoes}
            onChange={event => setField('observacoes', event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

export function PerfilFardamentoSection({ form, igrejas, setField }: BaseSectionProps & IgrejasProps) {
  return (
    <div className="space-y-3 rounded-lg bg-slate-100 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            id="fardado"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-slate-900"
            checked={form.fardado}
            onChange={event => {
              const isChecked = event.target.checked;
              setField('fardado', isChecked);
              if (!isChecked) {
                setField('padrinhoMadrinha', false);
                setField('padrinhoIgrejasIds', []);
                setField('padrinhoIgrejasTexto', '');
              }
            }}
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
            onChange={event => setField('padrinhoMadrinha', event.target.checked)}
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
                  onChange={event => setField('fardamentoData', event.target.value)}
                />
              </label>
              <label className="text-sm text-slate-700">
                Local do fardamento
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.fardamentoLocal}
                  onChange={event => setField('fardamentoLocal', event.target.value)}
                  placeholder="Cidade/estado ou igreja"
                />
              </label>
              <label className="text-sm text-slate-700">
                Quem me fardou
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.fardadorNome}
                  onChange={event => setField('fardadorNome', event.target.value)}
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
                  onChange={event => {
                    const fardamentoIgrejaId = event.target.value;
                    setField('fardamentoIgrejaId', fardamentoIgrejaId);
                    setField('fardamentoIgrejaNome', selectIgrejaName(igrejas, fardamentoIgrejaId));
                  }}
                >
                  <option value="">— Selecionar —</option>
                  {igrejas?.map(igreja => (
                    <option key={igreja.id} value={igreja.id}>
                      {igreja.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Igreja onde fui fardado (texto livre)
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.fardamentoIgrejaNome}
                  onChange={event => setField('fardamentoIgrejaNome', event.target.value)}
                  placeholder="Se não estiver cadastrada"
                />
              </label>
              <label className="text-sm text-slate-700">
                Com quem me fardei
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.fardadoComQuem}
                  onChange={event => setField('fardadoComQuem', event.target.value)}
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
                  onChange={event => {
                    const selected = Array.from(event.target.selectedOptions).map(option => option.value);
                    setField('padrinhoIgrejasIds', selected);
                  }}
                  size={Math.min(igrejas?.length ?? 4, 6)}
                >
                  {igrejas?.map(igreja => (
                    <option key={igreja.id} value={igreja.id}>
                      {igreja.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Igrejas onde sou padrinho/madrinha (texto livre)
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.padrinhoIgrejasTexto}
                  onChange={event => setField('padrinhoIgrejasTexto', event.target.value)}
                  placeholder="Ex.: nome de igrejas não cadastradas"
                />
              </label>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function PerfilPapeisSection({ form, setField }: BaseSectionProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-slate-700">
        Papéis na doutrina (separar por vírgula)
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={form.papeisTexto}
          onChange={event => setField('papeisTexto', event.target.value)}
          placeholder="Ex.: tesoureiro, coordenador, músico oficial, limpeza"
        />
      </label>
      <p className="text-xs text-slate-500">
        Use termos livres (ex.: tesoureiro, cozinheira oficial, organização, arrumação, limpeza, músico, músico oficial).
      </p>
    </div>
  );
}