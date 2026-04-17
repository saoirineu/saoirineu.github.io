import { useQuery } from '@tanstack/react-query';

import { getEffectiveSystemRole } from '../lib/systemRole';
import { fetchUser } from '../lib/users';
import { useAuth } from './useAuth';

export function useSystemRole() {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ['user', user?.uid],
    queryFn: () => fetchUser(user!.uid),
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
