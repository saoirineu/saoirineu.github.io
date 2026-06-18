import { useQuery } from '@tanstack/react-query';

import { getEffectiveSystemRoles } from '../lib/systemRole';
import { fetchUser } from '../lib/users';
import { useAuth } from './useAuth';

export function useSystemRole() {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ['user', user?.uid],
    queryFn: () => fetchUser(user!.uid),
    enabled: !!user
  });

  const roles = getEffectiveSystemRoles({
    email: user?.email,
    storedRole: profileQuery.data?.systemRole,
    storedRoles: profileQuery.data?.systemRoles
  });

  return {
    profile: profileQuery.data,
    role: roles,
    roles,
    loading: !!user && profileQuery.isLoading,
    user
  };
}
