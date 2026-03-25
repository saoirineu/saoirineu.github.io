import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { hasRequiredRole } from '../lib/systemRole';
import { useSystemRole } from './useSystemRole';
import { DevModeContext, type DevModeContextValue } from './dev-mode-context';

const storageKey = 'saoirineu-dev-mode';

export function DevModeProvider({ children }: { children: ReactNode }) {
  const { role } = useSystemRole();
  const canToggleDevMode = hasRequiredRole(role, 'superadmin');
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

    if (!canToggleDevMode) {
      window.localStorage.removeItem(storageKey);
      setStoredDevModeEnabled(false);
    }
  }, [canToggleDevMode]);

  const value = useMemo<DevModeContextValue>(
    () => ({
      canToggleDevMode,
      devModeEnabled: canToggleDevMode && storedDevModeEnabled,
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
    [canToggleDevMode, storedDevModeEnabled]
  );

  return <DevModeContext.Provider value={value}>{children}</DevModeContext.Provider>;
}
