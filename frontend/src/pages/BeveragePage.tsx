import React from 'react';

export function BeveragePage() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-slate-900">Bebida</h1>
      <p className="text-sm text-slate-600">
        Lotes de Daime com insumos, datas, responsáveis, análises sensorial/química e destinação. Coleção bebida/lotes no
        Firestore com anexos no Storage (quando necessário) e regras restritivas.
      </p>
      <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        TODO: cards de lotes, filtros por grau/ano/localidade e trilha para fontes e análises.
      </div>
    </div>
  );
}

export default BeveragePage;
