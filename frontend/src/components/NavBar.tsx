import { NavLink } from 'react-router-dom';

import { siteLocaleOptions } from '../lib/siteLocale';
import { hasRequiredRole } from '../lib/systemRole';
import { BrandMark } from './BrandMark';
import { useDevMode } from '../providers/useDevMode';
import { useAuth } from '../providers/useAuth';
import { useSiteLocale } from '../providers/useSiteLocale';
import { useSystemRole } from '../providers/useSystemRole';

type NavCopy = typeof copyByLocale.pt;
type NavCopyKey = keyof NavCopy;

const stableLinks: Array<{ to: string; key: NavCopyKey }> = [
  { to: '/', key: 'home' }
];

const devLinks: Array<{ to: string; key: NavCopyKey }> = [
  { to: '/profile', key: 'profile' },
  { to: '/churches', key: 'churches' },
  { to: '/people', key: 'people' },
  { to: '/hymnals', key: 'hymns' },
  { to: '/beverage', key: 'beverage' },
  { to: '/works', key: 'works' }
];

const copyByLocale = {
  pt: {
    home: 'Início',
    profile: 'Perfil',
    churches: 'Igrejas',
    meeting: 'Encontro Europeu',
    people: 'Pessoas',
    hymns: 'Hinários/Hinos',
    beverage: 'Bebida',
    works: 'Trabalhos',
    users: 'Usuários',
    dev: 'Dev',
    signOut: 'Sair',
    language: 'Idioma'
  },
  en: {
    home: 'Home',
    profile: 'Profile',
    churches: 'Churches',
    meeting: 'European Meeting',
    people: 'People',
    hymns: 'Hymns',
    beverage: 'Beverage',
    works: 'Works',
    users: 'Users',
    dev: 'Dev',
    signOut: 'Sign out',
    language: 'Language'
  },
  es: {
    home: 'Inicio',
    profile: 'Perfil',
    churches: 'Iglesias',
    meeting: 'Encuentro Europeo',
    people: 'Personas',
    hymns: 'Himnarios/Himnos',
    beverage: 'Bebida',
    works: 'Trabajos',
    users: 'Usuarios',
    dev: 'Dev',
    signOut: 'Salir',
    language: 'Idioma'
  },
  it: {
    home: 'Inizio',
    profile: 'Profilo',
    churches: 'Chiese',
    meeting: 'Incontro Europeo',
    people: 'Persone',
    hymns: 'Inni/Innari',
    beverage: 'Bevanda',
    works: 'Lavori',
    users: 'Utenti',
    dev: 'Dev',
    signOut: 'Esci',
    language: 'Lingua'
  }
} as const;

export function NavBar() {
  const { signOut } = useAuth();
  const { role } = useSystemRole();
  const { canToggleDevMode, devModeEnabled, setDevModeEnabled } = useDevMode();
  const { locale, setLocale } = useSiteLocale();
  const copy = copyByLocale[locale];

  const navigationLinks = [
    ...stableLinks.map(link => ({ to: link.to, label: copy[link.key] })),
    ...(devModeEnabled ? devLinks.map(link => ({ to: link.to, label: copy[link.key] })) : []),
    ...(devModeEnabled && hasRequiredRole(role, 'superadmin') ? [{ to: '/admin/users', label: copy.users }] : [])
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-[color:var(--brand-sand)] bg-[rgba(247,244,234,0.9)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <BrandMark className="h-9 w-9 shrink-0" decorative />
          <div className="text-lg font-semibold tracking-tight text-[color:var(--brand-ink)]">São Irineu</div>
        </div>
        <nav className="hidden items-center gap-4 text-sm font-medium text-[color:var(--brand-ink)] sm:flex">
          {navigationLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-full px-3 py-2 transition hover:bg-[rgba(63,132,194,0.12)] ${isActive ? 'bg-[color:var(--brand-blue-deep)] text-[color:var(--brand-white)] shadow-sm' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <label className="hidden items-center gap-2 md:flex">
            <span className="text-xs font-medium text-[color:var(--brand-blue-deep)]">{copy.language}</span>
            <select
              className="rounded-full border border-[color:var(--brand-sand)] bg-white/90 px-3 py-2 text-sm text-[color:var(--brand-ink)] shadow-sm"
              value={locale}
              onChange={event => setLocale(event.target.value as typeof locale)}
            >
              {siteLocaleOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {canToggleDevMode ? (
            <label className="hidden items-center gap-2 rounded-full border border-[color:var(--brand-sand)] bg-white/70 px-3 py-2 text-xs font-medium text-[color:var(--brand-ink)] md:flex">
              <span>{copy.dev}</span>
              <button
                type="button"
                role="switch"
                aria-checked={devModeEnabled}
                onClick={() => setDevModeEnabled(!devModeEnabled)}
                className={`relative h-6 w-11 rounded-full transition ${devModeEnabled ? 'bg-[color:var(--brand-green)]' : 'bg-[rgba(42,98,143,0.24)]'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${devModeEnabled ? 'left-5' : 'left-0.5'}`} />
              </button>
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-full bg-[color:var(--brand-green)] px-3 py-2 text-sm font-semibold text-[color:var(--brand-white)] shadow-sm transition hover:bg-[color:var(--brand-green-deep)]"
          >
            {copy.signOut}
          </button>
        </div>
      </div>
    </header>
  );
}
