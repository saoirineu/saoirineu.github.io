import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  commitMemberMerge,
  deleteMember,
  fetchMembers,
  markMemberReviewed,
  updateMember,
  MEMBER_TEXT_FIELDS,
  type MemberRecord,
  type MemberSourceFile
} from '../lib/members';
import { applyConflictResolution, fieldLabel, formatFullName, mergeMemberRecords } from './members/form';
import { useAuth } from '../providers/useAuth';

type ReviewFilter = 'all' | 'flagged' | 'clean';
type SourceFilter = 'all' | MemberSourceFile;
type SortKey = 'name-asc' | 'name-desc' | 'review-first';

const sourceLabels: Record<MemberSourceFile, string> = {
  complete: 'Cloud',
  importer: 'Import',
  certificates: 'Cert'
};

const reasonLabels: Record<string, string> = {
  'field-conflict': 'Conflito de campos',
  'possible-duplicate': 'Possível duplicado',
  'duplicate-in-importer': 'Duplicado no import',
  'certificate-only': 'Só certificado'
};

function reasonLabel(reason: string): string {
  return reasonLabels[reason] ?? reason;
}

function sourceBadgeClasses(file: MemberSourceFile): string {
  switch (file) {
    case 'complete':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'importer':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'certificates':
    default:
      return 'bg-violet-50 text-violet-800 border-violet-200';
  }
}

function sortMembers(members: MemberRecord[], sortKey: SortKey): MemberRecord[] {
  const items = [...members];
  items.sort((left, right) => {
    const leftName = formatFullName(left);
    const rightName = formatFullName(right);
    switch (sortKey) {
      case 'name-desc':
        return rightName.localeCompare(leftName, 'it');
      case 'review-first':
        if (left.needsReview !== right.needsReview) return left.needsReview ? -1 : 1;
        return leftName.localeCompare(rightName, 'it');
      case 'name-asc':
      default:
        return leftName.localeCompare(rightName, 'it');
    }
  });
  return items;
}

export default function MembersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('review-first');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useQuery({ queryKey: ['members'], queryFn: fetchMembers });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['members'] });
  const onError = (error: unknown) =>
    setErrorMessage(error instanceof Error ? error.message : 'Falha na operação.');

  const conflictMutation = useMutation({
    mutationFn: (args: { id: string; field: string; value: string; record: MemberRecord }) =>
      updateMember(args.id, applyConflictResolution(args.record, args.field, args.value)),
    onSuccess: () => {
      setErrorMessage('');
      invalidate();
    },
    onError
  });

  const reviewMutation = useMutation({
    mutationFn: (id: string) => markMemberReviewed(id, user?.uid ?? 'unknown'),
    onSuccess: () => {
      setErrorMessage('');
      invalidate();
    },
    onError
  });

  const mergeMutation = useMutation({
    mutationFn: (args: { target: MemberRecord; source: MemberRecord }) =>
      commitMemberMerge({
        targetId: args.target.id,
        targetData: mergeMemberRecords(args.target, args.source),
        sourceId: args.source.id
      }),
    onSuccess: () => {
      setErrorMessage('');
      invalidate();
    },
    onError
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMember(id),
    onSuccess: () => {
      setErrorMessage('');
      setSelectedId(null);
      invalidate();
    },
    onError
  });

  const busy =
    conflictMutation.isPending || reviewMutation.isPending || mergeMutation.isPending || deleteMutation.isPending;

  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    for (const member of query.data ?? []) {
      if (member.memberStatus) values.add(member.memberStatus);
    }
    return [...values].sort((a, b) => a.localeCompare(b, 'it'));
  }, [query.data]);

  const members = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = (query.data ?? []).filter(member => {
      const matchesSearch =
        !normalizedSearch
        || formatFullName(member).toLowerCase().includes(normalizedSearch)
        || (member.fiscalCode ?? '').toLowerCase().includes(normalizedSearch)
        || (member.email ?? '').toLowerCase().includes(normalizedSearch)
        || (member.city ?? '').toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all' || member.memberStatus === statusFilter;
      const matchesReview =
        reviewFilter === 'all'
        || (reviewFilter === 'flagged' && member.needsReview)
        || (reviewFilter === 'clean' && !member.needsReview);
      const matchesSource = sourceFilter === 'all' || member.sources.some(source => source.file === sourceFilter);
      return matchesSearch && matchesStatus && matchesReview && matchesSource;
    });
    return sortMembers(filtered, sortKey);
  }, [query.data, searchTerm, statusFilter, reviewFilter, sourceFilter, sortKey]);

  const total = query.data?.length ?? 0;
  const flaggedCount = useMemo(() => (query.data ?? []).filter(member => member.needsReview).length, [query.data]);
  const selected = useMemo(
    () => (selectedId ? (query.data ?? []).find(member => member.id === selectedId) ?? null : null),
    [query.data, selectedId]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Sócios</h1>
        <p className="text-sm text-slate-600">
          {total} sócios unificados das planilhas · {flaggedCount} marcados para revisão. Visualização restrita a
          administradores.
        </p>
      </div>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Buscar</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Nome, Codice Fiscale, e-mail, cidade"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Situação</span>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
          >
            <option value="all">Todas</option>
            {statusOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Revisão</span>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            value={reviewFilter}
            onChange={event => setReviewFilter(event.target.value as ReviewFilter)}
          >
            <option value="all">Todos</option>
            <option value="flagged">A revisar</option>
            <option value="clean">Revisados</option>
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Fonte</span>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            value={sourceFilter}
            onChange={event => setSourceFilter(event.target.value as SourceFilter)}
          >
            <option value="all">Todas</option>
            <option value="complete">Cloud (completo)</option>
            <option value="importer">Import</option>
            <option value="certificates">Certificados</option>
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Ordenar</span>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            value={sortKey}
            onChange={event => setSortKey(event.target.value as SortKey)}
          >
            <option value="review-first">A revisar primeiro</option>
            <option value="name-asc">Nome (A–Z)</option>
            <option value="name-desc">Nome (Z–A)</option>
          </select>
        </label>
      </section>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
      ) : null}
      {query.isLoading ? <div className="text-sm text-slate-600">Carregando sócios...</div> : null}
      {query.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Falha ao carregar sócios.</div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Codice Fiscale</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Cidade</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium">Fontes</th>
              <th className="px-4 py-3 font-medium">Revisão</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map(member => (
              <tr key={member.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{formatFullName(member) || '—'}</div>
                  {member.birthDate ? <div className="text-xs text-slate-500">{member.birthDate}</div> : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">{member.fiscalCode ?? '—'}</td>
                <td className="px-4 py-3 text-slate-700">{member.email ?? '—'}</td>
                <td className="px-4 py-3 text-slate-700">{member.city ?? '—'}</td>
                <td className="px-4 py-3 text-slate-700">{member.memberStatus ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {member.sources.map((source, index) => (
                      <span
                        key={`${source.file}-${source.code ?? index}`}
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${sourceBadgeClasses(source.file)}`}
                      >
                        {sourceLabels[source.file]}
                      </span>
                    ))}
                    {member.certificates.length ? (
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                        {member.certificates.length} cert.
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {member.needsReview ? (
                    <div className="flex flex-wrap gap-1">
                      {member.reviewReasons.map(reason => (
                        <span
                          key={reason}
                          className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700"
                        >
                          {reasonLabel(reason)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
                      OK
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setSelectedId(member.id)}
                  >
                    Detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!query.isLoading && members.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Nenhum sócio encontrado com os filtros atuais.
        </div>
      ) : null}

      {selected ? (
        <MemberDetailModal
          member={selected}
          allMembers={query.data ?? []}
          busy={busy}
          onClose={() => setSelectedId(null)}
          onResolveConflict={(field, value) =>
            conflictMutation.mutate({ id: selected.id, field, value, record: selected })
          }
          onMarkReviewed={() => reviewMutation.mutate(selected.id)}
          onMerge={source => {
            if (window.confirm(`Mesclar "${formatFullName(source)}" em "${formatFullName(selected)}"? O registro mesclado será apagado.`)) {
              mergeMutation.mutate({ target: selected, source });
            }
          }}
          onDelete={() => {
            if (window.confirm(`Apagar o sócio "${formatFullName(selected)}"?`)) {
              deleteMutation.mutate(selected.id);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function MemberDetailModal({
  member,
  allMembers,
  busy,
  onClose,
  onResolveConflict,
  onMarkReviewed,
  onMerge,
  onDelete
}: {
  member: MemberRecord;
  allMembers: MemberRecord[];
  busy: boolean;
  onClose: () => void;
  onResolveConflict: (field: string, value: string) => void;
  onMarkReviewed: () => void;
  onMerge: (source: MemberRecord) => void;
  onDelete: () => void;
}) {
  const conflictFields = Object.keys(member.conflicts);
  const duplicates = member.possibleDuplicateIds
    .map(id => allMembers.find(candidate => candidate.id === id))
    .filter((candidate): candidate is MemberRecord => Boolean(candidate));
  const fields = MEMBER_TEXT_FIELDS.filter(field => member[field] !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white shadow-xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{formatFullName(member) || member.id}</h3>
            <p className="text-xs text-slate-500">
              {member.fiscalCode ? `CF ${member.fiscalCode} · ` : ''}
              <span className="font-mono">{member.id}</span>
            </p>
          </div>
          <button type="button" className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-4">
          {conflictFields.length ? (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-rose-700">Conflitos a resolver</h4>
              {conflictFields.map(field => (
                <div key={field} className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <div className="text-xs font-medium text-rose-700">{fieldLabel(field)}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {member.conflicts[field].map(value => (
                      <button
                        key={value}
                        type="button"
                        disabled={busy}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                        onClick={() => onResolveConflict(field, value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {duplicates.length ? (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-amber-700">Possíveis duplicados</h4>
              {duplicates.map(candidate => (
                <div key={candidate.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="text-sm text-slate-700">
                    <div className="font-medium text-slate-900">{formatFullName(candidate) || candidate.id}</div>
                    <div className="text-xs text-slate-500">
                      {candidate.fiscalCode ?? candidate.email ?? candidate.id} · fontes {candidate.sources.map(s => sourceLabels[s.file]).join('+')}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                    onClick={() => onMerge(candidate)}
                  >
                    Mesclar aqui
                  </button>
                </div>
              ))}
            </section>
          ) : null}

          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-900">Dados</h4>
            <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              {fields.map(field => (
                <div key={field} className="text-sm">
                  <dt className="text-xs text-slate-500">{fieldLabel(field)}</dt>
                  <dd className="text-slate-800">{member[field]}</dd>
                </div>
              ))}
            </dl>
          </section>

          {member.certificates.length ? (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-900">Certificados ({member.certificates.length})</h4>
              <ul className="space-y-1 text-sm text-slate-700">
                {member.certificates.map((cert, index) => (
                  <li key={cert.code ?? index} className="rounded-lg bg-slate-50 px-3 py-2">
                    {cert.type ?? 'Certificado'} · {cert.date ?? 'sem data'}
                    {cert.code ? <span className="text-xs text-slate-500"> · #{cert.code}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {member.sources.map((source, index) => (
              <span key={`${source.file}-${index}`} className={`inline-flex rounded-full border px-2 py-0.5 font-medium ${sourceBadgeClasses(source.file)}`}>
                {sourceLabels[source.file]}
                {source.code ? ` #${source.code}` : ''}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {member.needsReview ? (
              <button
                type="button"
                disabled={busy}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                onClick={onMarkReviewed}
              >
                Marcar como revisado
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              onClick={onDelete}
            >
              Apagar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
