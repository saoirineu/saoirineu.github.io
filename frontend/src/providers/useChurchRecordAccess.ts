import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { hasRequiredRole } from '../lib/systemRole';
import { fetchChurches } from '../lib/works';
import { useChurchManager } from './useChurchManager';
import { useSystemRole } from './useSystemRole';

export type ChurchOption = { id: string; name: string };

/**
 * Who may keep a church's records (works, donations) and for which churches:
 * admins for every church, church managers for the churches linked to them.
 */
export function useChurchRecordAccess() {
  const { role, loading: roleLoading } = useSystemRole();
  const { manager, churchIds: managedChurchIds, loading: managerLoading } = useChurchManager();
  const isAdmin = hasRequiredRole(role, 'admin');
  const canRecord = isAdmin || managedChurchIds.length > 0;

  const churchesQuery = useQuery({ queryKey: ['churches'], queryFn: fetchChurches, enabled: canRecord });

  const churchOptions: ChurchOption[] = useMemo(() => {
    const churches = churchesQuery.data ?? [];
    if (isAdmin) {
      return churches.map(church => ({ id: church.id, name: church.name })).sort((a, b) => a.name.localeCompare(b.name));
    }
    return managedChurchIds.map((id, index) => ({
      id,
      name: churches.find(church => church.id === id)?.name ?? manager?.churchNames[index] ?? id
    }));
  }, [churchesQuery.data, isAdmin, managedChurchIds, manager]);

  return {
    isAdmin,
    canRecord,
    loading: roleLoading || managerLoading,
    managedChurchIds,
    churchOptions,
    /** A manager of a single church never has to pick it. */
    defaultChurchId: !isAdmin && churchOptions.length === 1 ? churchOptions[0].id : ''
  };
}
