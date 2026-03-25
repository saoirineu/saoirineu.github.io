import { useContext } from 'react';

import { SiteLocaleContext } from './site-locale-context';

export function useSiteLocale() {
  const ctx = useContext(SiteLocaleContext);

  if (!ctx) {
    throw new Error('useSiteLocale deve ser usado dentro de SiteLocaleProvider');
  }

  return ctx;
}