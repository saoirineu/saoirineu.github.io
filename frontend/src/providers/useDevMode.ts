import { useContext } from 'react';

import { DevModeContext } from './dev-mode-context';

export function useDevMode() {
  const context = useContext(DevModeContext);

  if (!context) {
    throw new Error('useDevMode deve ser usado dentro de DevModeProvider');
  }

  return context;
}
