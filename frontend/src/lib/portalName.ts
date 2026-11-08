import type { SiteLocale } from './siteLocale';

/** The portal's own name, the same in every language. */
export const portalName = 'São Irineu';

/**
 * What the portal is, shown after or under its name (from the 2026-10-20 meeting). The Italian
 * form is also written out in index.html and in the email header in functions/src/index.ts.
 */
export const portalDescriptorByLocale: Record<SiteLocale, string> = {
  pt: 'portal integração ICEFLU',
  en: 'ICEFLU integration portal',
  es: 'portal integración ICEFLU',
  it: 'portale integrazione ICEFLU'
};

/** Name and descriptor on one line, as in the browser tab. */
export function portalFullName(locale: SiteLocale) {
  return `${portalName} — ${portalDescriptorByLocale[locale]}`;
}
