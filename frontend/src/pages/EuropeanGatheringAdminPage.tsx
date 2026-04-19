import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteEuropeanGatheringRegistration,
  fetchEuropeanGatheringRegistrations,
  rebuildEuropeanGatheringRoomAvailabilityFromRegistrations,
  resolveEuropeanGatheringDocumentUrl,
  updateEuropeanGatheringRegistrationStatus,
  type EuropeanGatheringRegistrationRecord,
  type EuropeanGatheringRegistrationStatus
} from '../lib/europeanGathering';

const statusOptions: Array<{ value: EuropeanGatheringRegistrationStatus; label: string }> = [
  { value: 'approved', label: 'Aprovado' },
  { value: 'pending', label: 'Pendente' },
  { value: 'under-review', label: 'Em revisão' },
  { value: 'payment-overdue', label: 'Prazo expirado' },
  { value: 'rejected', label: 'Rejeitado' },
  { value: 'archived', label: 'Arquivado' }
];

const attendanceModeLabels: Record<EuropeanGatheringRegistrationRecord['attendanceMode'], string> = {
  lodging: 'Hospedagem e alimentação',
  meals: 'Somente alimentação',
  spiritual: 'Somente trabalhos'
};

const statusLabels: Record<EuropeanGatheringRegistrationStatus, string> = {
  approved: 'Aprovado',
  pending: 'Pendente',
  'under-review': 'Em revisão',
  'payment-overdue': 'Prazo expirado',
  rejected: 'Rejeitado',
  archived: 'Arquivado'
};

type ViewMode = 'cards' | 'table';
type SortKey = 'date-desc' | 'date-asc' | 'status' | 'name' | 'total-desc' | 'total-asc';

function getStatusAccentClasses(status: EuropeanGatheringRegistrationStatus) {
  switch (status) {
    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'under-review':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'payment-overdue':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    case 'rejected':
      return 'border-red-200 bg-red-50 text-red-800';
    case 'archived':
      return 'border-violet-200 bg-violet-50 text-violet-800';
    case 'pending':
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function sortRegistrations(registrations: EuropeanGatheringRegistrationRecord[], sortKey: SortKey) {
  const items = [...registrations];

  items.sort((left, right) => {
    switch (sortKey) {
      case 'date-asc':
        return (left.submittedAt?.getTime() ?? 0) - (right.submittedAt?.getTime() ?? 0);
      case 'status':
        return statusLabels[left.status].localeCompare(statusLabels[right.status]);
      case 'name':
        return `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`);
      case 'total-asc':
        return left.contribution.total - right.contribution.total;
      case 'total-desc':
        return right.contribution.total - left.contribution.total;
      case 'date-desc':
      default:
        return (right.submittedAt?.getTime() ?? 0) - (left.submittedAt?.getTime() ?? 0);
    }
  });

  return items;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatTimestamp(value?: Date | null) {
  if (!value) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(value);
}

function formatCompactTimestamp(value?: Date | null) {
  if (!value) return 'Sem data';

  const datePart = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short'
  }).format(value);

  const timePart = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(value);

  return `${datePart}, ${timePart}`;
}

function formatCompactStay(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) {
    return 'N/A';
  }

  const formatDayMonth = (value: string) => {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit'
    }).format(date);
  };

  return `${formatDayMonth(checkIn)}-${formatDayMonth(checkOut)}`;
}

function formatWorkDays(selectedWorks: string[]) {
  if (!selectedWorks.length) {
    return 'N/A';
  }

  return selectedWorks
    .map(work => work.split('-')[1])
    .join(', ');
}

function formatMembershipSummary(registration: EuropeanGatheringRegistrationRecord) {
  return [
    registration.isFardado ? 'Fardado' : 'Não fardado',
    registration.isIcefluMember ? 'ICEFLU em dia' : 'ICEFLU não informado',
    registration.isNovice ? 'Primeira vez' : 'Não é primeira vez'
  ].join(' · ');
}

function formatExtraItems(registration: EuropeanGatheringRegistrationRecord) {
  return registration.needsExtraLinen ? 'Lençol extra + toalhas' : 'Sem extras';
}

export default function EuropeanGatheringAdminPage() {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EuropeanGatheringRegistrationStatus>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | EuropeanGatheringRegistrationRecord['attendanceMode']>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const query = useQuery({
    queryKey: ['european-gathering-registrations'],
    queryFn: fetchEuropeanGatheringRegistrations
  });

  const statusMutation = useMutation({
    mutationFn: updateEuropeanGatheringRegistrationStatus,
    onSuccess: () => {
      setErrorMessage('');
      queryClient.invalidateQueries({ queryKey: ['european-gathering-registrations'] });
    },
    onError: error => {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao atualizar status.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEuropeanGatheringRegistration,
    onSuccess: () => {
      setErrorMessage('');
      queryClient.invalidateQueries({ queryKey: ['european-gathering-registrations'] });
    },
    onError: error => {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao apagar inscrição.');
    }
  });

  const registrations = useMemo(
    () => {
      const normalizedSearch = searchTerm.trim().toLowerCase();

      const filtered = (query.data ?? []).filter(registration => {
        const matchesSearch =
          !normalizedSearch
          || `${registration.firstName} ${registration.lastName}`.toLowerCase().includes(normalizedSearch)
          || registration.country.toLowerCase().includes(normalizedSearch)
          || registration.church.toLowerCase().includes(normalizedSearch)
          || registration.centerLeader.toLowerCase().includes(normalizedSearch);

        const matchesStatus = statusFilter === 'all' || registration.status === statusFilter;
        const matchesAttendance = attendanceFilter === 'all' || registration.attendanceMode === attendanceFilter;

        return matchesSearch && matchesStatus && matchesAttendance;
      });

      return sortRegistrations(filtered, sortKey);
    },
    [attendanceFilter, query.data, searchTerm, sortKey, statusFilter]
  );

  useEffect(() => {
    if (!query.data) {
      return;
    }

    rebuildEuropeanGatheringRoomAvailabilityFromRegistrations(query.data).catch(error => {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao sincronizar vagas dos quartos.');
    });
  }, [query.data]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Inscrições do Encontro Europeu</h1>
        <p className="text-sm text-slate-600">Visualização restrita a administradores.</p>
      </div>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_auto]">
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Buscar</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Nome, país, igreja, dirigente"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Status</span>
          <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'all' | EuropeanGatheringRegistrationStatus)}>
            <option value="all">Todos</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Modalidade</span>
          <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={attendanceFilter} onChange={event => setAttendanceFilter(event.target.value as 'all' | EuropeanGatheringRegistrationRecord['attendanceMode'])}>
            <option value="all">Todas</option>
            {Object.entries(attendanceModeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Ordenar por</span>
          <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={sortKey} onChange={event => setSortKey(event.target.value as SortKey)}>
            <option value="date-desc">Data mais recente</option>
            <option value="date-asc">Data mais antiga</option>
            <option value="status">Status</option>
            <option value="name">Nome</option>
            <option value="total-desc">Valor maior</option>
            <option value="total-asc">Valor menor</option>
          </select>
        </label>
        <div className="space-y-1 text-sm text-slate-700">
          <span className="block font-medium text-slate-900">Visualização</span>
          <div className="flex rounded-lg border border-slate-300 bg-slate-50 p-1">
            <button type="button" className={`flex-1 rounded-md px-3 py-2 text-sm ${viewMode === 'cards' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`} onClick={() => setViewMode('cards')}>
              Cards
            </button>
            <button type="button" className={`flex-1 rounded-md px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`} onClick={() => setViewMode('table')}>
              Tabela
            </button>
          </div>
        </div>
      </section>

      {errorMessage ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div> : null}
      {query.isLoading ? <div className="text-sm text-slate-600">Carregando inscrições...</div> : null}
      {query.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Falha ao carregar inscrições.</div> : null}

      {viewMode === 'cards' ? (
        <div className="grid gap-4">
          {registrations.map(registration => (
            <RegistrationCard
              key={registration.id}
              registration={registration}
              busy={statusMutation.isPending || deleteMutation.isPending}
              onDelete={() => {
                if (window.confirm(`Apagar a inscrição de ${registration.firstName} ${registration.lastName}?`)) {
                  deleteMutation.mutate(registration);
                }
              }}
              onStatusChange={status => statusMutation.mutate({ id: registration.id, status })}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Pessoa</th>
                <th className="px-4 py-3 font-medium">Modalidade</th>
                <th className="px-4 py-3 font-medium">Vínculo</th>
                <th className="px-4 py-3 font-medium">Extras</th>
                <th className="px-4 py-3 font-medium">Permanência</th>
                <th className="px-4 py-3 font-medium">Trabalhos</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Arquivos</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registrations.map(registration => (
                <tr key={registration.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatCompactTimestamp(registration.submittedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{registration.firstName} {registration.lastName}</div>
                    <div className="text-slate-600">{registration.country}</div>
                    <div className="text-slate-500">{registration.church}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{attendanceModeLabels[registration.attendanceMode]}</td>
                  <td className="px-4 py-3 text-slate-700">{formatMembershipSummary(registration)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatExtraItems(registration)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatCompactStay(registration.checkIn, registration.checkOut)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatWorkDays(registration.selectedWorks)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(registration.contribution.total)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="flex flex-wrap gap-2">
                      <DocumentDownloadLink name="ID" path={registration.identityDocumentPath} />
                      <DocumentDownloadLink name="CP" path={registration.paymentProofPath} />
                      <DocumentDownloadLink name="CI" path={registration.consentDocumentPath} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex rounded-xl border px-3 py-2 ${getStatusAccentClasses(registration.status)}`}>
                      <StatusSelect value={registration.status} disabled={statusMutation.isPending || deleteMutation.isPending} onChange={status => statusMutation.mutate({ id: registration.id, status })} accent />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                      disabled={statusMutation.isPending || deleteMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Apagar a inscrição de ${registration.firstName} ${registration.lastName}?`)) {
                          deleteMutation.mutate(registration);
                        }
                      }}
                    >
                      Apagar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!query.isLoading && registrations.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Nenhuma inscrição encontrada com os filtros atuais.
        </div>
      ) : null}
    </div>
  );
}

function RegistrationCard({
  registration,
  busy,
  onDelete,
  onStatusChange
}: {
  registration: EuropeanGatheringRegistrationRecord;
  busy: boolean;
  onDelete: () => void;
  onStatusChange: (status: EuropeanGatheringRegistrationStatus) => void;
}) {
  const statusAccentClasses = getStatusAccentClasses(registration.status);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {registration.firstName} {registration.lastName}
          </h2>
          <p className="text-sm text-slate-600">
            {registration.country} · {registration.church} · {registration.centerLeader}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="text-sm text-slate-500">{formatTimestamp(registration.submittedAt)}</div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={`inline-flex rounded-xl border px-3 py-2 ${statusAccentClasses}`}>
              <StatusSelect value={registration.status} disabled={busy} onChange={onStatusChange} accent />
            </div>
            <button
              type="button"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
              disabled={busy}
              onClick={onDelete}
            >
              Apagar inscrição
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <div className="font-medium text-slate-900">Modalidade</div>
          <div>{attendanceModeLabels[registration.attendanceMode]}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <div className="font-medium text-slate-900">Permanência</div>
          <div>{registration.checkIn ?? 'N/A'} até {registration.checkOut ?? 'N/A'}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <div className="font-medium text-slate-900">Quarto</div>
          <div>{registration.roomNumber ?? 'Não informado'}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <div className="font-medium text-slate-900">Contribuição</div>
          <div>{formatCurrency(registration.contribution.total)}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${registration.isFardado ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
          {registration.isFardado ? 'Fardado' : 'Não fardado'}
        </span>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${registration.isIcefluMember ? 'bg-sky-50 text-sky-800' : 'bg-slate-100 text-slate-600'}`}>
          {registration.isIcefluMember ? 'ICEFLU em dia' : 'ICEFLU não informado'}
        </span>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${registration.isNovice ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
          {registration.isNovice ? 'Primeira vez' : 'Não é primeira vez'}
        </span>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${registration.needsExtraLinen ? 'bg-violet-50 text-violet-800' : 'bg-slate-100 text-slate-600'}`}>
          {registration.needsExtraLinen ? 'Lençol extra + toalhas' : 'Sem extras'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
          <div className="font-medium text-slate-900">Trabalhos espirituais</div>
          <ul className="mt-2 list-disc pl-5">
            {registration.selectedWorks.map(work => (
              <li key={work}>{work}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
          <div className="font-medium text-slate-900">Arquivos informados</div>
          <ul className="mt-2 space-y-1">
            <li>Documento: <DocumentDownloadLink name={registration.identityDocumentName} path={registration.identityDocumentPath} /></li>
            <li>Pagamento: <DocumentDownloadLink name={registration.paymentProofName} path={registration.paymentProofPath} /></li>
            <li>Consenso: <DocumentDownloadLink name={registration.consentDocumentName} path={registration.consentDocumentPath} /></li>
          </ul>
        </div>
      </div>
    </article>
  );
}

function StatusSelect({
  value,
  disabled,
  onChange,
  accent = false
}: {
  value: EuropeanGatheringRegistrationStatus;
  disabled: boolean;
  onChange: (status: EuropeanGatheringRegistrationStatus) => void;
  accent?: boolean;
}) {
  const accentClasses = accent ? 'border-transparent bg-transparent p-0 text-sm font-medium' : 'border border-slate-300 bg-white px-3 py-2 text-sm';

  return (
    <select
      className={`rounded-lg ${accentClasses}`}
      value={value}
      disabled={disabled}
      onChange={event => onChange(event.target.value as EuropeanGatheringRegistrationStatus)}
    >
      {statusOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function DocumentDownloadLink({ name, path }: { name?: string; path?: string }) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!name) {
    return null;
  }

  if (!path) {
    return <span className="text-slate-500">{name}</span>;
  }

  return (
    <span>
      <a
        href={downloadUrl ?? '#'}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2"
        onClick={async event => {
          if (downloadUrl || loading) {
            return;
          }

          event.preventDefault();
          setLoading(true);
          setError('');

          try {
            const resolvedUrl = await resolveEuropeanGatheringDocumentUrl(path);
            setDownloadUrl(resolvedUrl);
            window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
          } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Falha ao carregar arquivo');
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? 'Gerando link...' : name}
      </a>
      {error ? <span className="ml-2 text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
