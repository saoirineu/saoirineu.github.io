import React from 'react';
import { Link } from 'react-router-dom';

const cards = [
  { to: '/pessoas', title: 'Pessoas', desc: 'Daimistas, papéis e perfis.' },
  { to: '/igrejas', title: 'Igrejas', desc: 'Casas, linhagens e vínculos.' },
  { to: '/hinarios', title: 'Hinários / Hinos', desc: 'Taxonomia, autores, gravações.' },
  { to: '/bebida', title: 'Bebida', desc: 'Lotes, insumos, análises e destino.' },
  { to: '/trabalhos', title: 'Trabalhos', desc: 'Agenda, hinários, igrejas e participantes.' }
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Painel</h1>
        <p className="text-sm text-slate-600">Navegue pelos dados e ontologias do Santo Daime.</p>
        <p className="mt-2 text-xs text-amber-700">
          PWA: funciona offline após o primeiro acesso; dados sincronizam quando a conexão volta.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(card => (
          <Link
            key={card.to}
            to={card.to}
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-lg font-semibold text-slate-900">{card.title}</div>
            <p className="mt-1 text-sm text-slate-600">{card.desc}</p>
            <p className="mt-3 text-xs font-medium text-blue-700">Entrar →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
