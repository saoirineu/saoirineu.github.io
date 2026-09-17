import { Fragment, useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

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

// Up to this many links sit beside the brand; more get their own row on wide screens.
const maxInlineLinks = 4;

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
    devMode: 'Modo desenvolvedor',
    signOut: 'Sair',
    language: 'Idioma',
    navigation: 'Navegação principal',
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
    devMode: 'Developer mode',
    signOut: 'Sign out',
    language: 'Language',
    navigation: 'Main navigation',
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
    devMode: 'Modo desarrollador',
    signOut: 'Salir',
    language: 'Idioma',
    navigation: 'Navegación principal',
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
    devMode: 'Modalità sviluppatore',
    signOut: 'Esci',
    language: 'Lingua',
    navigation: 'Navigazione principale',
    openMenu: 'Apri menu',
    closeMenu: 'Chiudi menu'
  }
} as const;

function initialsOf(name: string) {
  const words = name.split(/[\s._-]+/).filter(word => /\p{L}/u.test(word));
  const initials = words.slice(0, 2).map(word => word.match(/\p{L}/u)?.[0] ?? '').join('');
  return initials.toUpperCase() || '?';
}

// An open popover closes on Escape and on a tap outside its container.
function useDismiss(open: boolean, containerRef: RefObject<HTMLElement | null>, setOpen: (open: boolean) => void) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [containerRef, open, setOpen]);
}

function Avatar({ initials, className }: { initials: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-blue-deep)] font-semibold text-[color:var(--brand-white)] ${className}`}
    >
      {initials}
    </span>
  );
}

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
  const [accountOpen, setAccountOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const accountMenuId = useId();

  const link = (to: string, key: NavCopyKey) => ({ to, label: copy[key] });
  const isAdmin = hasRequiredRole(role, 'admin');

  // Grouped as: own pages, church records, administration, developer tools.
  const navigationGroups = [
    [link('/', 'home'), link('/profile', 'profile')],
    [
      ...(managedChurchIds.length || isAdmin ? [link('/works', 'works'), link('/donations', 'donations')] : []),
      ...(hasRequiredRole(role, 'custodian') ? [link('/sacrament', 'sacrament')] : [])
    ],
    [
      ...(hasRequiredRole(role, 'eventadmin') ? [link('/admin/events', 'events')] : []),
      ...(isAdmin ? [link('/admin/members', 'members'), link('/churches', 'churches')] : []),
      ...(hasRequiredRole(role, 'useradmin')
        ? [link('/admin/registrations', 'registrations'), link('/admin/users', 'users')]
        : [])
    ],
    devModeEnabled ? [link('/people', 'people'), link('/hymnals', 'hymns')] : []
  ].filter(group => group.length);
  const linksInline = navigationGroups.flat().length <= maxInlineLinks;

  const accountName = user?.displayName || user?.email || '';
  const initials = initialsOf(user?.displayName || user?.email?.split('@')[0] || '');

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useDismiss(menuOpen, headerRef, setMenuOpen);
  useDismiss(accountOpen, accountRef, setAccountOpen);

  const handleSignOut = () => signOut().then(() => navigate('/login'));

  const tabs = (
    <nav
      aria-label={copy.navigation}
      className={`hidden min-w-0 overflow-x-auto lg:flex ${linksInline ? 'flex-1' : '-ml-3 h-11'}`}
    >
      {navigationGroups.map((group, index) => (
        <Fragment key={group[0].to}>
          {index > 0 ? <span aria-hidden="true" className="mx-2 h-4 w-px shrink-0 self-center bg-slate-300" /> : null}
          {group.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium transition focus-visible:outline-offset-[-2px] ${
                  isActive
                    ? 'border-[color:var(--brand-blue-deep)] text-[color:var(--brand-blue-deep)]'
                    : 'border-transparent text-slate-600 hover:border-[rgba(42,98,143,0.3)] hover:text-[color:var(--brand-ink)]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </Fragment>
      ))}
    </nav>
  );

  const languageSelect = (
    <div className="relative flex items-center text-[color:var(--brand-ink)]">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <path d="M3 12h18M12 3c2.5 2.6 3.75 5.6 3.75 9S14.5 18.4 12 21c-2.5-2.6-3.75-5.6-3.75-9S9.5 5.6 12 3Z" fill="none" stroke="currentColor" strokeWidth="1.75" />
      </svg>
      <select
        aria-label={copy.language}
        className="h-10 appearance-none rounded-full border border-[color:var(--brand-sand)] bg-white/80 pl-9 pr-8 text-sm shadow-sm transition hover:bg-white"
        value={locale}
        onChange={event => setLocale(event.target.value as typeof locale)}
      >
        {siteLocaleOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 h-4 w-4 text-slate-500">
        <path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </div>
  );

  const devSwitch = (
    <button
      type="button"
      role="switch"
      aria-checked={devModeEnabled}
      onClick={() => setDevModeEnabled(!devModeEnabled)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${devModeEnabled ? 'bg-[color:var(--brand-green)]' : 'bg-[rgba(42,98,143,0.24)]'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${devModeEnabled ? 'left-[1.375rem]' : 'left-0.5'}`} />
    </button>
  );

  const accountMenu = (
    <div ref={accountRef} className="relative">
      <button
        type="button"
        aria-expanded={accountOpen}
        aria-controls={accountMenuId}
        onClick={() => setAccountOpen(current => !current)}
        className="flex h-10 items-center gap-2 rounded-full border border-[color:var(--brand-sand)] bg-white/80 pl-1 pr-3 text-sm font-medium text-[color:var(--brand-ink)] shadow-sm transition hover:bg-white"
      >
        <Avatar initials={initials} className="h-8 w-8 text-xs" />
        <span className="max-w-[11rem] truncate">{accountName}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-4 w-4 text-slate-500 transition ${accountOpen ? 'rotate-180' : ''}`}>
          <path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
      {accountOpen ? (
        <div
          id={accountMenuId}
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-[color:var(--brand-sand)] bg-white p-2 text-[color:var(--brand-ink)] shadow-xl"
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar initials={initials} className="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{user?.displayName || user?.email}</div>
              {user?.displayName && user.email ? <div className="truncate text-xs text-slate-500">{user.email}</div> : null}
            </div>
          </div>
          <div className="my-1 border-t border-slate-100" />
          {canToggleDevMode ? (
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm hover:bg-slate-50">
              <span>{copy.devMode}</span>
              {devSwitch}
            </label>
          ) : null}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-slate-500">
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            {copy.signOut}
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <header ref={headerRef} className="sticky top-0 z-30 border-b border-[color:var(--brand-sand)] bg-[rgba(247,244,234,0.92)] backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-stretch gap-4">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 self-center rounded-xl">
            <BrandMark className="h-9 w-9 shrink-0" decorative />
            <span className="whitespace-nowrap text-lg font-semibold tracking-tight text-[color:var(--brand-ink)]">São Irineu</span>
          </Link>
          {devModeEnabled ? (
            <span className="-ml-1 self-center rounded-full bg-[rgba(232,194,76,0.35)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
              {copy.dev}
            </span>
          ) : null}
          {linksInline ? tabs : <div className="flex-1" />}
          <div className="hidden shrink-0 items-center gap-2 self-center lg:flex">
            {languageSelect}
            {accountMenu}
          </div>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? copy.closeMenu : copy.openMenu}
            onClick={() => setMenuOpen(current => !current)}
            className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full border border-[color:var(--brand-sand)] bg-white/80 text-[color:var(--brand-ink)] shadow-sm transition hover:bg-white lg:hidden"
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
        {linksInline ? null : tabs}
      </div>
      {menuOpen ? (
        <div id={menuId} className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-[color:var(--brand-sand)] lg:hidden">
          <div className="mx-auto max-w-6xl space-y-4 px-4 pb-5 pt-3">
            <nav aria-label={copy.navigation} className="text-base font-medium text-[color:var(--brand-ink)]">
              {navigationGroups.map((group, index) => (
                <div
                  key={group[0].to}
                  className={`grid gap-1 sm:grid-cols-2 ${index > 0 ? 'mt-2 border-t border-[color:var(--brand-sand)] pt-2' : ''}`}
                >
                  {group.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `rounded-xl px-4 py-3 transition hover:bg-[rgba(63,132,194,0.12)] ${isActive ? 'bg-[color:var(--brand-blue-deep)] text-[color:var(--brand-white)] shadow-sm' : ''}`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
            <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--brand-sand)] pt-4">
              {languageSelect}
              {canToggleDevMode ? (
                <label className="flex h-10 items-center gap-2 rounded-full border border-[color:var(--brand-sand)] bg-white/70 px-3 text-sm font-medium text-[color:var(--brand-ink)]">
                  <span>{copy.dev}</span>
                  {devSwitch}
                </label>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar initials={initials} className="h-10 w-10 text-sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[color:var(--brand-ink)]">{accountName}</div>
                  {user?.displayName && user.email ? <div className="truncate text-xs text-slate-500">{user.email}</div> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="shrink-0 rounded-full bg-[color:var(--brand-green)] px-4 py-2 text-sm font-semibold text-[color:var(--brand-white)] shadow-sm transition hover:bg-[color:var(--brand-green-deep)]"
              >
                {copy.signOut}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
