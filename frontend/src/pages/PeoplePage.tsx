import React from 'react';

export function PeoplePage() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-slate-900">Pessoas</h1>
      <p className="text-sm text-slate-600">
        Listas e perfis de daimistas, papéis e participações. Integrar com Firestore (coleção pessoas) e definições SKOS
        para papéis e relações.
      </p>
      <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        TODO: consulta paginada no Firestore, busca, filtros por papéis e navegação conceito → exemplos → fontes.
      </div>
    </div>
  );
}

export default PeoplePage;
