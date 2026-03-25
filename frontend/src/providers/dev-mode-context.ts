import { createContext } from 'react';

export type DevModeContextValue = {
  canToggleDevMode: boolean;
  devModeEnabled: boolean;
  setDevModeEnabled: (value: boolean) => void;
};

export const DevModeContext = createContext<DevModeContextValue | undefined>(undefined);
