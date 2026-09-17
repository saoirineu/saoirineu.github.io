import { createContext } from 'react';

export type DevModeContextValue = {
  canToggleDevMode: boolean;
  devModeEnabled: boolean;
  /** True until the session and its role are known; devModeEnabled is false meanwhile. */
  loading: boolean;
  setDevModeEnabled: (value: boolean) => void;
};

export const DevModeContext = createContext<DevModeContextValue | undefined>(undefined);
