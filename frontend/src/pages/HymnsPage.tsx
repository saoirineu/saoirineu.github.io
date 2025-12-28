import React from 'react';

export function HymnsPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-slate-900">Hinários / Hinos</h1>
      <p className="text-sm text-slate-600">
        Taxonomia por tema/nível semântico, autoria, gravações e fontes. Sincronizar coleções de hinarios e hinos no
        Firestore e mapear conceitos SKOS para tooltips.
      </p>
      <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        TODO: busca por hino, filtros por tema e autor, player para gravações e links para fontes.
      </div>
    </div>
  );
}

export default HymnsPage;
