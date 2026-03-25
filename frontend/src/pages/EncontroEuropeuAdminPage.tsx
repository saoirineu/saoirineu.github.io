import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchEncontroEuropeuRegistrations } from '../lib/encontroEuropeu';

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
  const query = useQuery({
    queryKey: ['encontro-europeu-inscricoes'],
    queryFn: fetchEncontroEuropeuRegistrations
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
              <div className="text-sm text-slate-500">{formatTimestamp(registration.submittedAt)}</div>
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
                  <li>Documento: {registration.identityDocumentName ?? 'Não informado'}</li>
                  <li>Pagamento: {registration.paymentProofName ?? 'Não informado'}</li>
                  <li>Consenso: {registration.consentDocumentName ?? 'Não informado'}</li>
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
