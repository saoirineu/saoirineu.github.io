import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchEncontroEuropeuRegistrations,
  resolveEncontroEuropeuDocumentUrl,
  updateEncontroEuropeuRegistrationStatus,
  type EncontroEuropeuRegistrationStatus
} from '../lib/encontroEuropeu';

const statusOptions: Array<{ value: EncontroEuropeuRegistrationStatus; label: string }> = [
  { value: 'approved', label: 'Aprovado' },
  { value: 'pending', label: 'Pendente' },
  { value: 'under-review', label: 'Em revisão' },
  { value: 'payment-overdue', label: 'Prazo expirado' }
];

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

export default function EncontroEuropeuAdminPage() {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState('');

  const query = useQuery({
    queryKey: ['encontro-europeu-inscricoes'],
    queryFn: fetchEncontroEuropeuRegistrations
  });

  const statusMutation = useMutation({
    mutationFn: updateEncontroEuropeuRegistrationStatus,
    onSuccess: () => {
      setErrorMessage('');
      queryClient.invalidateQueries({ queryKey: ['encontro-europeu-inscricoes'] });
    },
    onError: error => {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao atualizar status.');
    }
  });

  const registrations = useMemo(
    () => [...(query.data ?? [])].sort((left, right) => (right.submittedAt?.getTime() ?? 0) - (left.submittedAt?.getTime() ?? 0)),
    [query.data]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Inscrições do Encontro Europeu</h1>
        <p className="text-sm text-slate-600">Visualização restrita a administradores.</p>
      </div>

      {errorMessage ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div> : null}
      {query.isLoading ? <div className="text-sm text-slate-600">Carregando inscrições...</div> : null}
      {query.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Falha ao carregar inscrições.</div> : null}

      <div className="grid gap-4">
        {registrations.map(registration => (
          <article key={registration.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {registration.firstName} {registration.lastName}
                </h2>
                <p className="text-sm text-slate-600">
                  {registration.country} · {registration.church} · {registration.centerLeader}
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-slate-500">{formatTimestamp(registration.submittedAt)}</div>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-900">Status</span>
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={registration.status}
                    disabled={statusMutation.isPending}
                    onChange={event => {
                      statusMutation.mutate({
                        id: registration.id,
                        status: event.target.value as EncontroEuropeuRegistrationStatus
                      });
                    }}
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <div className="font-medium text-slate-900">Modalidade</div>
                <div>{registration.attendanceMode}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <div className="font-medium text-slate-900">Permanência</div>
                <div>
                  {registration.checkIn ?? 'N/A'} até {registration.checkOut ?? 'N/A'}
                </div>
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
                  <li>
                    Documento:{' '}
                    <DocumentDownloadLink name={registration.identityDocumentName} path={registration.identityDocumentPath} />
                  </li>
                  <li>
                    Pagamento:{' '}
                    <DocumentDownloadLink name={registration.paymentProofName} path={registration.paymentProofPath} />
                  </li>
                  <li>
                    Consenso:{' '}
                    <DocumentDownloadLink name={registration.consentDocumentName} path={registration.consentDocumentPath} />
                  </li>
                </ul>
              </div>
            </div>
          </article>
        ))}

        {!query.isLoading && registrations.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Nenhuma inscrição encontrada.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DocumentDownloadLink({ name, path }: { name?: string; path?: string }) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!name || !path) {
    return <span>Não informado</span>;
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
            const resolvedUrl = await resolveEncontroEuropeuDocumentUrl(path);
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
