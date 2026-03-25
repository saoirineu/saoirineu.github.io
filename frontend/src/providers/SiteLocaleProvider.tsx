import { useMemo, useState, type ReactNode } from 'react';

import {
  resolveInitialSiteLocale,
  siteLocaleStorageKey,
  type SiteLocale
} from '../lib/siteLocale';
import { SiteLocaleContext, type SiteLocaleContextValue } from './site-locale-context';

export function SiteLocaleProvider({ children }: { children: ReactNode }) {
  const [localeState, setLocaleState] = useState<SiteLocale>(() =>
    resolveInitialSiteLocale(typeof window === 'undefined' ? undefined : window.localStorage.getItem(siteLocaleStorageKey) ?? navigator.language)
  );

  const value = useMemo<SiteLocaleContextValue>(
    () => ({
      locale: localeState,
      setLocale: nextLocale => {
        setLocaleState(nextLocale);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(siteLocaleStorageKey, nextLocale);
        }
      }
    }),
    [localeState]
  );

  return <SiteLocaleContext.Provider value={value}>{children}</SiteLocaleContext.Provider>;
}