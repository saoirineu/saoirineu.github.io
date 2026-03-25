import { createContext } from 'react';

import type { SiteLocale } from '../lib/siteLocale';

export type SiteLocaleContextValue = {
  locale: SiteLocale;
  setLocale: (locale: SiteLocale) => void;
};

export const SiteLocaleContext = createContext<SiteLocaleContextValue | undefined>(undefined);