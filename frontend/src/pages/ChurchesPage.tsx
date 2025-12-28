import React from 'react';

export function ChurchesPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-slate-900">Igrejas</h1>
      <p className="text-sm text-slate-600">
        Casas, linhagens, localização e vínculos institucionais. Usar Firestore (coleção igrejas) com geodados e
        relacionamentos com pessoas e eventos.
      </p>
      <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        TODO: mapa básico (Leaflet), cartões por igreja e trilhas para responsáveis e eventos.
      </div>
    </div>
  );
}

export default ChurchesPage;
