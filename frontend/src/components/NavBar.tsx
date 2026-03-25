import { NavLink } from 'react-router-dom';

import { hasRequiredRole } from '../lib/systemRole';
import { useDevMode } from '../providers/useDevMode';
import { useAuth } from '../providers/useAuth';
import { useSystemRole } from '../providers/useSystemRole';

const stableLinks = [
  { to: '/igrejas', label: 'Igrejas' },
  { to: '/encontro-europeu', label: 'Encontro Europeu' },
  { to: '/perfil', label: 'Perfil' }
];

const devLinks = [
  { to: '/', label: 'Início' },
  { to: '/pessoas', label: 'Pessoas' },
  { to: '/hinarios', label: 'Hinários/Hinos' },
  { to: '/bebida', label: 'Bebida' },
  { to: '/trabalhos', label: 'Trabalhos' }
];

export function NavBar() {
  const { signOut } = useAuth();
  const { role } = useSystemRole();
  const { canToggleDevMode, devModeEnabled, setDevModeEnabled } = useDevMode();

  const navigationLinks = [
    ...stableLinks,
    ...(devModeEnabled ? devLinks : []),
    ...(hasRequiredRole(role, 'admin') ? [{ to: '/admin/inscricoes-encontro', label: 'Inscrições' }] : []),
    ...(devModeEnabled && hasRequiredRole(role, 'superadmin') ? [{ to: '/admin/usuarios', label: 'Usuários' }] : [])
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-slate-900 to-blue-600" aria-hidden />
          <div className="text-lg font-semibold text-slate-900">Saoirineu</div>
        </div>
        <nav className="hidden items-center gap-4 text-sm font-medium text-slate-700 sm:flex">
          {navigationLinks.map(link => (
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
        <div className="flex items-center gap-3">
          {canToggleDevMode ? (
            <label className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 md:flex">
              <span>Dev</span>
              <button
                type="button"
                role="switch"
                aria-checked={devModeEnabled}
                onClick={() => setDevModeEnabled(!devModeEnabled)}
                className={`relative h-6 w-11 rounded-full transition ${devModeEnabled ? 'bg-slate-900' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${devModeEnabled ? 'left-5' : 'left-0.5'}`} />
              </button>
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
