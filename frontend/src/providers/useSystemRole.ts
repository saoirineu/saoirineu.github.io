import { useQuery } from '@tanstack/react-query';

import { getEffectiveSystemRole } from '../lib/systemRole';
import { fetchUsuario } from '../lib/usuarios';
import { useAuth } from './useAuth';

export function useSystemRole() {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ['usuario', user?.uid],
    queryFn: () => fetchUsuario(user!.uid),
    enabled: !!user
  });

  const role = getEffectiveSystemRole({
    email: user?.email,
    storedRole: profileQuery.data?.systemRole
  });

  return {
    profile: profileQuery.data,
    role,
    loading: !!user && profileQuery.isLoading,
    user
  };
}
