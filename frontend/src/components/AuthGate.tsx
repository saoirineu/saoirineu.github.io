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

  return <Outlet />;
}
