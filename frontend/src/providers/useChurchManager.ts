import { useQuery } from '@tanstack/react-query';

import { fetchChurchManager } from '../lib/churchManagers';
import { useAuth } from './useAuth';

/** The churches the signed-in account manages (records works for). */
export function useChurchManager() {
  const { user } = useAuth();

  const managerQuery = useQuery({
    queryKey: ['churchManager', user?.uid],
    // An unverified account cannot read even its own grant; that simply means none.
    queryFn: () => fetchChurchManager(user!.uid).catch(() => null),
    enabled: !!user
  });

  return {
    manager: managerQuery.data ?? null,
    churchIds: managerQuery.data?.churchIds ?? [],
    loading: !!user && managerQuery.isLoading
  };
}
