export type SiteLocale = 'pt' | 'en' | 'es' | 'it';

export const siteLocaleStorageKey = 'saoirineu-site-locale';

export const siteLocaleOptions: Array<{ value: SiteLocale; label: string }> = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' }
];

export function resolveInitialSiteLocale(input?: string): SiteLocale {
  const value = (input ?? '').toLowerCase();

  if (value.startsWith('it')) return 'it';
  if (value.startsWith('es')) return 'es';
  if (value.startsWith('en')) return 'en';
  return 'pt';
}