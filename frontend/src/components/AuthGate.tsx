import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../providers/AuthProvider';

export function AuthGate() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
        <span className="animate-pulse text-lg">Carregando sessão...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
