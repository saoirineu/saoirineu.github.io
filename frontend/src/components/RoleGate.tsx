import { Outlet } from 'react-router-dom';

import { hasRequiredRole, type SystemRole } from '../lib/systemRole';
import { useSystemRole } from '../providers/useSystemRole';

export function RoleGate({ requiredRole }: { requiredRole: Extract<SystemRole, 'admin' | 'superadmin'> }) {
  const { loading, role } = useSystemRole();

  if (loading) {
    return <div className="flex min-h-[30vh] items-center justify-center text-sm text-slate-600">Carregando permissões...</div>;
  }

  if (!hasRequiredRole(role, requiredRole)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
        Você não tem permissão para acessar esta área.
      </div>
    );
  }

  return <Outlet />;
}
