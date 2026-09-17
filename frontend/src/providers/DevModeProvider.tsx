import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { hasRequiredRole } from '../lib/systemRole';
import { useAuth } from './useAuth';
import { useSystemRole } from './useSystemRole';
import { DevModeContext, type DevModeContextValue } from './dev-mode-context';

const storageKey = 'saoirineu-dev-mode';

export function DevModeProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading } = useAuth();
  const { loading: roleLoading, role } = useSystemRole();
  const canToggleDevMode = hasRequiredRole(role, 'superadmin');
  // Until both are known the role reads as a plain user, which must not count as losing the privilege.
  const loading = authLoading || roleLoading;
  const [storedDevModeEnabled, setStoredDevModeEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setStoredDevModeEnabled(window.localStorage.getItem(storageKey) === 'on');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!loading && !canToggleDevMode) {
      window.localStorage.removeItem(storageKey);
      setStoredDevModeEnabled(false);
    }
  }, [canToggleDevMode, loading]);

  const value = useMemo<DevModeContextValue>(
    () => ({
      canToggleDevMode,
      devModeEnabled: canToggleDevMode && storedDevModeEnabled,
      loading,
      setDevModeEnabled: nextValue => {
        setStoredDevModeEnabled(nextValue);
        if (typeof window !== 'undefined') {
          if (nextValue) {
            window.localStorage.setItem(storageKey, 'on');
          } else {
            window.localStorage.removeItem(storageKey);
          }
        }
      }
    }),
    [canToggleDevMode, loading, storedDevModeEnabled]
  );

  return <DevModeContext.Provider value={value}>{children}</DevModeContext.Provider>;
}
