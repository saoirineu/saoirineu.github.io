import type { SiteLocale } from './siteLocale';

/**
 * How the portal writes a date, whatever language the browser runs in: day
 * first in Portuguese, Spanish and Italian (17/set/2026), month first in
 * English (Sep/17/2026). Month names come from this table rather than from
 * Intl, whose abbreviations vary by browser and are not always three letters
 * (Spanish CLDR gives "sept").
 */
export const monthShortNamesByLocale: Record<SiteLocale, readonly string[]> = {
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  it: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
};

const datePlaceholderByLocale: Record<SiteLocale, string> = {
  pt: 'DD/MMM/AAAA',
  en: 'MMM/DD/YYYY',
  es: 'DD/MMM/AAAA',
  it: 'GG/MMM/AAAA'
};

export function datePlaceholder(locale: SiteLocale) {
  return datePlaceholderByLocale[locale];
}

function joinDateParts(year: string, monthIndex: number, day: string, locale: SiteLocale) {
  const month = monthShortNamesByLocale[locale][monthIndex];
  return locale === 'en' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
}

/**
 * A stored calendar date (YYYY-MM-DD, as date inputs and Firestore date fields
 * hold it). Read as text so no timezone can move it to the neighbouring day.
 * Anything else is returned trimmed but unchanged.
 */
export function formatIsoDate(value: string | null | undefined, locale: SiteLocale): string {
  const trimmed = value?.trim() ?? '';
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return trimmed;
  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return trimmed;
  return joinDateParts(year, monthIndex, day, locale);
}

/** Formats every YYYY-MM-DD inside a stored label (a Daime batch name, say), leaving the rest of the text alone. */
export function formatIsoDatesInText(text: string | null | undefined, locale: SiteLocale): string {
  return (text ?? '').replace(/\b\d{4}-\d{2}-\d{2}\b/g, match => formatIsoDate(match, locale));
}

function asDate(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** An instant (timestamp, epoch millis, ISO string) as its calendar date in the viewer's timezone. */
export function formatDate(value: Date | number | string, locale: SiteLocale): string {
  const date = asDate(value);
  if (!date) return '';
  return joinDateParts(String(date.getFullYear()), date.getMonth(), String(date.getDate()).padStart(2, '0'), locale);
}

/** An instant with its time of day, which keeps each language's clock (2:30 PM in English, 14:30 elsewhere). */
export function formatDateTime(value: Date | number | string, locale: SiteLocale): string {
  const date = asDate(value);
  if (!date) return '';
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  return `${formatDate(date, locale)} ${time}`;
}
