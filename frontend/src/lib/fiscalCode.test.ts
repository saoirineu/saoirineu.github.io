import { describe, expect, it } from 'vitest';

import { isValidFiscalCode, isValidOptionalFiscalCode, normalizeFiscalCode } from './fiscalCode';

describe('codice fiscale schema', () => {
  it('accepts anything shaped LLLLLLDDLDDLDDDL', () => {
    expect(isValidFiscalCode('RSSMRA85M01H501Q')).toBe(true);
    expect(isValidFiscalCode('CNTCHR83T41D969D')).toBe(true);
    expect(isValidFiscalCode('MRTMTT25D09F205Z')).toBe(true);
    // Shape is all that matters: month letter, day, Belfiore code and check
    // character are not verified.
    expect(isValidFiscalCode('AAAAAA00A00A000A')).toBe(true);
    expect(isValidFiscalCode('RSSMRA85M01H501A')).toBe(true); // check character not recomputed
    expect(isValidFiscalCode('RSSMRA85X99Z999Q')).toBe(true); // X is not a month letter
  });

  it('rejects wrong lengths', () => {
    expect(isValidFiscalCode('')).toBe(false);
    expect(isValidFiscalCode('CF123')).toBe(false);
    expect(isValidFiscalCode('RSSMRA85M01H501')).toBe(false); // 15
    expect(isValidFiscalCode('RSSMRA85M01H501QQ')).toBe(false); // 17
  });

  it('rejects letters and digits in the wrong positions', () => {
    expect(isValidFiscalCode('R5SMRA85M01H501Q')).toBe(false); // digit among the name letters
    expect(isValidFiscalCode('RSSMRAB5M01H501Q')).toBe(false); // letter in the year
    expect(isValidFiscalCode('RSSMRA8501H501QQ')).toBe(false); // digit in the month slot
    expect(isValidFiscalCode('RSSMRA85M0AH501Q')).toBe(false); // letter in the day
    expect(isValidFiscalCode('RSSMRA85M011501Q')).toBe(false); // digit in the Belfiore letter
    expect(isValidFiscalCode('RSSMRA85M01H5019')).toBe(false); // digit as check character
    expect(isValidFiscalCode('RSSMRA85M01H501-')).toBe(false); // non-alphanumeric
  });

  it('tolerates spacing and lowercase', () => {
    expect(isValidFiscalCode('rssmra85m01h501q')).toBe(true);
    expect(isValidFiscalCode(' RSSMRA85M01H501Q ')).toBe(true);
    expect(isValidFiscalCode('RSS MRA 85M01 H501Q')).toBe(true);
    expect(normalizeFiscalCode(' rss mra85m01h501q ')).toBe('RSSMRA85M01H501Q');
  });

  it('treats an empty optional value as acceptable', () => {
    expect(isValidOptionalFiscalCode('')).toBe(true);
    expect(isValidOptionalFiscalCode('   ')).toBe(true);
    expect(isValidOptionalFiscalCode('CF123')).toBe(false);
    expect(isValidOptionalFiscalCode('RSSMRA85M01H501Q')).toBe(true);
  });
});
