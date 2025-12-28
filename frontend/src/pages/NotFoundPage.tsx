import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center text-slate-800">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-slate-600">Verifique a URL ou volte para o início.</p>
      <Link to="/" className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
        Ir para o início
      </Link>
    </div>
  );
}

export default NotFoundPage;
