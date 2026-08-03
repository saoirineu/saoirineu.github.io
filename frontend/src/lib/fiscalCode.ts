/**
 * Italian codice fiscale (persone fisiche), checked for shape only:
 *
 *   LLLLLL DD L DD LDDD L
 *   RSSMRA 85 M 01 H501 Q
 *
 *   1-6   surname + given-name consonants
 *   7-8   last two digits of the birth year
 *   9     month letter
 *   10-11 day of birth
 *   12-15 Belfiore code of the birthplace (letter + 3 digits)
 *   16    check character
 *
 * Deliberately no semantic validation: the month letter, the day, the Belfiore
 * code and the check character are not verified, only their letter/digit
 * positions. Every one of the 1427 codes in the member registry matches this.
 *
 * Only Italian members are held to this pattern — see the isItalian branch in
 * the profile form, where non-Italians instead give an ID document number in
 * whatever format their country issues.
 */

const FISCAL_CODE_PATTERN = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;

/** Uppercases and drops the spacing people often paste in. */
export function normalizeFiscalCode(value: string) {
  return value.replace(/\s/g, '').toUpperCase();
}

export function isValidFiscalCode(value: string) {
  return FISCAL_CODE_PATTERN.test(normalizeFiscalCode(value));
}

/** True while the field is empty — emptiness is the "required" check's business. */
export function isValidOptionalFiscalCode(value: string) {
  return value.trim().length === 0 || isValidFiscalCode(value);
}
