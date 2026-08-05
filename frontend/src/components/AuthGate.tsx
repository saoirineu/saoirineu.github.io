import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../providers/useAuth';
import { useSiteLocale } from '../providers/useSiteLocale';

const loadingCopy = {
  pt: 'Carregando sessão...',
  en: 'Loading session...',
  es: 'Cargando sesión...',
  it: 'Caricamento sessione...'
} as const;

export function AuthGate() {
  const { user, loading } = useAuth();
  const { locale } = useSiteLocale();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
        <span className="animate-pulse text-lg">{loadingCopy[locale]}</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // An unconfirmed address is handled by the login page's confirmation modal,
  // not by a page of its own, so there is a single place that explains it.
  if (user.email && !user.emailVerified) {
    return <Navigate to="/login" replace state={{ unverified: true }} />;
  }

  return <Outlet />;
}
