import { NavLink } from 'react-router-dom';

import { useAuth } from '../providers/AuthProvider';

const links = [
  { to: '/', label: 'Início' },
  { to: '/pessoas', label: 'Pessoas' },
  { to: '/igrejas', label: 'Igrejas' },
  { to: '/hinarios', label: 'Hinários/Hinos' },
  { to: '/bebida', label: 'Bebida' },
  { to: '/trabalhos', label: 'Trabalhos' },
  { to: '/perfil', label: 'Perfil' }
];

export function NavBar() {
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-slate-900 to-blue-600" aria-hidden />
          <div className="text-lg font-semibold text-slate-900">Saoirineu</div>
        </div>
        <nav className="hidden items-center gap-4 text-sm font-medium text-slate-700 sm:flex">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded px-3 py-2 transition hover:bg-slate-100 ${isActive ? 'bg-slate-900 text-white' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
