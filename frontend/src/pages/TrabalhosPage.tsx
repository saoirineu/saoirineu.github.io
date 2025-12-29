import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';

import { fetchTrabalhos, Trabalho } from '../lib/trabalhos';

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
  const total = (p.homens ?? 0) + (p.mulheres ?? 0) + (p.outros ?? 0);
  return { total, homens: p.homens ?? 0, mulheres: p.mulheres ?? 0, outros: p.outros ?? 0 };
}

export function TrabalhosPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['trabalhos'], queryFn: fetchTrabalhos });

  if (isLoading) {
    return <div className="text-sm text-slate-600">Carregando trabalhos...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">Erro ao carregar trabalhos.</div>;
  }

  if (!data || data.length === 0) {
    return <div className="text-sm text-slate-600">Nenhum trabalho cadastrado ainda.</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Trabalhos</h1>
        <p className="text-sm text-slate-600">Agenda e histórico com hinários, igrejas, participantes e Daime.</p>
      </div>

      <div className="space-y-3">
        {data.map(trabalho => {
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
                    {formatDate(trabalho.data)} • {formatTime(trabalho.horarioInicio)} • {trabalho.local || 'Local a definir'}
                  </div>
                </div>
                {trabalho.bebida?.loteRef || trabalho.bebida?.loteId ? (
                  <div className="text-xs font-medium text-blue-700">
                    Daime: {trabalho.bebida.loteId || trabalho.bebida.loteRef}
                    {trabalho.bebida.quantidadeLitros ? ` • ${trabalho.bebida.quantidadeLitros} L` : ''}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <span className="font-medium">Igrejas responsáveis:</span>{' '}
                  {trabalho.igrejasResponsaveis?.length
                    ? trabalho.igrejasResponsaveis.join(', ')
                    : '—'}
                </div>
                <div>
                  <span className="font-medium">Hinários:</span>{' '}
                  {trabalho.hinarios?.length ? trabalho.hinarios.join(', ') : '—'}
                </div>
                <div>
                  <span className="font-medium">Participantes:</span>{' '}
                  {participantes
                    ? `${participantes.total} (H:${participantes.homens} M:${participantes.mulheres}` +
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
