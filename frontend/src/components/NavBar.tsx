import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { siteLocaleOptions } from '../lib/siteLocale';
import { hasRequiredRole } from '../lib/systemRole';
import { BrandMark } from './BrandMark';
import { useDevMode } from '../providers/useDevMode';
import { useAuth } from '../providers/useAuth';
import { useChurchManager } from '../providers/useChurchManager';
import { useSiteLocale } from '../providers/useSiteLocale';
import { useSystemRole } from '../providers/useSystemRole';

type NavCopy = typeof copyByLocale.pt;
type NavCopyKey = keyof NavCopy;

const stableLinks: Array<{ to: string; key: NavCopyKey }> = [
  { to: '/', key: 'home' },
  { to: '/profile', key: 'profile' }
];

const devLinks: Array<{ to: string; key: NavCopyKey }> = [
  { to: '/churches', key: 'churches' },
  { to: '/people', key: 'people' },
  { to: '/hymnals', key: 'hymns' }
];

const custodianLinks: Array<{ to: string; key: NavCopyKey }> = [
  { to: '/sacrament', key: 'sacrament' }
];

const adminLinks: Array<{ to: string; key: NavCopyKey }> = [
  { to: '/admin/members', key: 'members' }
];

const copyByLocale = {
  pt: {
    home: 'Home',
    profile: 'Perfil',
    churches: 'Igrejas',
    events: 'Eventos',
    people: 'Pessoas',
    members: 'Sócios',
    hymns: 'Hinários/Hinos',
    sacrament: 'Sacramento',
    works: 'Trabalhos',
    donations: 'Doações',
    users: 'Usuários',
    registrations: 'Inscrições',
    dev: 'Dev',
    signOut: 'Sair',
    language: 'Idioma',
    openMenu: 'Abrir menu',
    closeMenu: 'Fechar menu'
  },
  en: {
    home: 'Home',
    profile: 'Profile',
    churches: 'Churches',
    events: 'Events',
    people: 'People',
    members: 'Members',
    hymns: 'Hymns',
    sacrament: 'Sacrament',
    works: 'Works',
    donations: 'Donations',
    users: 'Users',
    registrations: 'Registrations',
    dev: 'Dev',
    signOut: 'Sign out',
    language: 'Language',
    openMenu: 'Open menu',
    closeMenu: 'Close menu'
  },
  es: {
    home: 'Home',
    profile: 'Perfil',
    churches: 'Iglesias',
    events: 'Eventos',
    people: 'Personas',
    members: 'Socios',
    hymns: 'Himnarios/Himnos',
    sacrament: 'Sacramento',
    works: 'Trabajos',
    donations: 'Donaciones',
    users: 'Usuarios',
    registrations: 'Inscripciones',
    dev: 'Dev',
    signOut: 'Salir',
    language: 'Idioma',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú'
  },
  it: {
    home: 'Home',
    profile: 'Profilo',
    churches: 'Chiese',
    events: 'Eventi',
    people: 'Persone',
    members: 'Soci',
    hymns: 'Inni/Innari',
    sacrament: 'Sacramento',
    works: 'Lavori',
    donations: 'Donazioni',
    users: 'Utenti',
    registrations: 'Iscrizioni',
    dev: 'Dev',
    signOut: 'Esci',
    language: 'Lingua',
    openMenu: 'Apri menu',
    closeMenu: 'Chiudi menu'
  }
} as const;

export function NavBar() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { role } = useSystemRole();
  const { churchIds: managedChurchIds } = useChurchManager();
  const { canToggleDevMode, devModeEnabled, setDevModeEnabled } = useDevMode();
  const { locale, setLocale } = useSiteLocale();
  const copy = copyByLocale[locale];
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const menuId = useId();

  const navigationLinks = [
    ...stableLinks.map(link => ({ to: link.to, label: copy[link.key] })),
    ...(devModeEnabled ? devLinks.map(link => ({ to: link.to, label: copy[link.key] })) : []),
    ...(managedChurchIds.length || hasRequiredRole(role, 'admin')
      ? [{ to: '/works', label: copy.works }, { to: '/donations', label: copy.donations }]
      : []),
    ...(hasRequiredRole(role, 'custodian') ? custodianLinks.map(link => ({ to: link.to, label: copy[link.key] })) : []),
    ...(hasRequiredRole(role, 'eventadmin') ? [{ to: '/admin/events', label: copy.events }] : []),
    ...(hasRequiredRole(role, 'admin') ? adminLinks.map(link => ({ to: link.to, label: copy[link.key] })) : []),
    ...(hasRequiredRole(role, 'useradmin')
      ? [{ to: '/admin/registrations', label: copy.registrations }, { to: '/admin/users', label: copy.users }]
      : [])
  ];

  // The small-screen menu closes on navigation, on Escape and on a tap outside the header.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [menuOpen]);

  const handleSignOut = () => signOut().then(() => navigate('/login'));

  const languageSelect = (
    <select
      aria-label={copy.language}
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
  );

  const devSwitch = canToggleDevMode ? (
    <label className="flex items-center gap-2 rounded-full border border-[color:var(--brand-sand)] bg-white/70 px-3 py-2 text-xs font-medium text-[color:var(--brand-ink)]">
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
  ) : null;

  const signOutButton = (
    <button
      type="button"
      onClick={handleSignOut}
      className="shrink-0 rounded-full bg-[color:var(--brand-green)] px-4 py-2 text-sm font-semibold text-[color:var(--brand-white)] shadow-sm transition hover:bg-[color:var(--brand-green-deep)]"
    >
      {copy.signOut}
    </button>
  );

  return (
    <header ref={headerRef} className="sticky top-0 z-10 border-b border-[color:var(--brand-sand)] bg-[rgba(247,244,234,0.9)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex shrink-0 items-center gap-3">
          <BrandMark className="h-9 w-9 shrink-0" decorative />
          <div className="whitespace-nowrap text-lg font-semibold tracking-tight text-[color:var(--brand-ink)]">São Irineu</div>
        </div>
        {/* Wide screens: links wrap onto a second line rather than overflow when an account has many privileges. */}
        <nav className="hidden min-w-0 flex-1 flex-wrap items-center gap-1 text-sm font-medium text-[color:var(--brand-ink)] lg:flex">
          {navigationLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-[rgba(63,132,194,0.12)] ${isActive ? 'bg-[color:var(--brand-blue-deep)] text-[color:var(--brand-white)] shadow-sm' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {languageSelect}
          {devSwitch}
          {signOutButton}
          {user ? (
            <span className="hidden max-w-[10rem] truncate text-xs text-slate-500 xl:block">{user.displayName ?? user.email}</span>
          ) : null}
        </div>
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? copy.closeMenu : copy.openMenu}
          onClick={() => setMenuOpen(current => !current)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-sand)] bg-white/80 text-[color:var(--brand-ink)] shadow-sm transition hover:bg-white lg:hidden"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            )}
          </svg>
        </button>
      </div>
      {menuOpen ? (
        <div id={menuId} className="max-h-[calc(100dvh-4.25rem)] overflow-y-auto border-t border-[color:var(--brand-sand)] lg:hidden">
          <div className="mx-auto max-w-6xl space-y-4 px-4 pb-5 pt-3">
            <nav className="grid gap-1 text-base font-medium text-[color:var(--brand-ink)] sm:grid-cols-2">
              {navigationLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-3 transition hover:bg-[rgba(63,132,194,0.12)] ${isActive ? 'bg-[color:var(--brand-blue-deep)] text-[color:var(--brand-white)] shadow-sm' : ''}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--brand-sand)] pt-4">
              {languageSelect}
              {devSwitch}
            </div>
            <div className="flex items-center justify-between gap-3">
              {user ? (
                <span className="min-w-0 truncate text-sm text-slate-600">{user.displayName ?? user.email}</span>
              ) : (
                <span />
              )}
              {signOutButton}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
