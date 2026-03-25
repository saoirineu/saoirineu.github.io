import { Link } from 'react-router-dom';

import { hasRequiredRole } from '../lib/systemRole';
import { useDevMode } from '../providers/useDevMode';
import { useSystemRole } from '../providers/useSystemRole';

const devCards = [
  { to: '/pessoas', title: 'Pessoas', desc: 'Daimistas, papéis e perfis.' },
  { to: '/igrejas', title: 'Igrejas', desc: 'Casas, linhagens e vínculos.' },
  { to: '/hinarios', title: 'Hinários / Hinos', desc: 'Taxonomia, autores, gravações.' },
  { to: '/bebida', title: 'Bebida', desc: 'Lotes, insumos, análises e destino.' },
  { to: '/trabalhos', title: 'Trabalhos', desc: 'Agenda, hinários, igrejas e participantes.' }
];

export function DashboardPage() {
  const { devModeEnabled } = useDevMode();
  const { role } = useSystemRole();

  const stableCards = [
    { to: '/perfil', title: 'Perfil', desc: 'Atualize seus dados de acesso e referência pessoal.' },
    { to: '/igrejas', title: 'Igrejas', desc: 'Cadastre e consulte as igrejas já disponíveis no sistema.' },
    { to: '/encontro-europeu', title: 'Inscrição no encontro europeu', desc: 'Preencha, salve rascunho e envie sua inscrição dentro da área logada.' },
    ...(hasRequiredRole(role, 'admin')
      ? [{ to: '/admin/inscricoes-encontro', title: 'Inscrições do encontro', desc: 'Acompanhe os inscritos e faça a triagem administrativa.' }]
      : [])
  ];

  const cards = devModeEnabled ? devCards : stableCards;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{devModeEnabled ? 'Painel' : 'Início'}</h1>
        <p className="text-sm text-slate-600">
          {devModeEnabled
            ? 'Navegue pelos dados e ontologias do Santo Daime.'
            : 'Acesse daqui apenas as áreas estáveis disponíveis para uso diário.'}
        </p>
        <p className="mt-2 text-xs text-amber-700">
          {devModeEnabled
            ? 'PWA: funciona offline após o primeiro acesso; dados sincronizam quando a conexão volta.'
            : 'O modo estável mantém visíveis somente perfil, igrejas, inscrição do encontro e páginas administrativas já prontas.'}
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
