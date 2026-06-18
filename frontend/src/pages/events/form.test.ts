import { describe, expect, it } from 'vitest';

import { validateEventInput } from '../../lib/events';
import { buildEventInput, initialEventForm, parseNumberList, prefillEventForm } from './form';

describe('events form helpers', () => {
  it('parses comma-separated number lists, ignoring junk', () => {
    expect(parseNumberList('0, 100, 180')).toEqual([0, 100, 180]);
    expect(parseNumberList('')).toEqual([]);
    expect(parseNumberList('a, 5, , 7')).toEqual([5, 7]);
  });

  it('builds a valid EventInput, deriving slug from the title and deposit from percent', () => {
    const input = buildEventInput({
      ...initialEventForm,
      titleEn: 'Gathering',
      slug: '',
      totalSlots: '80',
      cautionDepositPercent: '30',
      works: [{ id: 'w1', labelEn: 'Work', labelPt: '', labelEs: '', labelIt: '', dateTime: '2026-09-25T19:00' }],
      worksAnyone: '0, 100'
    });

    expect(input.slug).toBe('gathering');
    expect(input.cautionDepositRate).toBeCloseTo(0.3);
    expect(input.pricing.worksByCount.anyone).toEqual([0, 100]);
    expect(validateEventInput(input)).toBeNull();
  });

  it('prefers the explicit slug field when provided', () => {
    const input = buildEventInput({ ...initialEventForm, titleEn: 'X', slug: 'My Event 2026', totalSlots: '10' });
    expect(input.slug).toBe('my-event-2026');
  });

  it('includes resources only when present and round-trips them', () => {
    expect(buildEventInput({ ...initialEventForm, titleEn: 'X', totalSlots: '10' }).resources).toBeUndefined();

    const withResources = buildEventInput({
      ...initialEventForm,
      titleEn: 'X',
      totalSlots: '10',
      resources: {
        programUrl: { pt: '', en: '/program-en.pdf', es: '', it: '' },
        directionsUrl: { pt: '', en: '', es: '', it: '' },
        consentFormUrl: { pt: '/consent-pt.pdf', en: '', es: '', it: '' }
      }
    });
    expect(withResources.resources?.programUrl?.en).toBe('/program-en.pdf');
    expect(withResources.resources?.directionsUrl).toBeUndefined();
    expect(withResources.resources?.consentFormUrl?.pt).toBe('/consent-pt.pdf');

    const values = prefillEventForm({ id: 'x', ...withResources });
    expect(values.resources.programUrl.en).toBe('/program-en.pdf');
    expect(values.resources.consentFormUrl.pt).toBe('/consent-pt.pdf');
  });

  it('round-trips through prefill', () => {
    const input = buildEventInput({
      ...initialEventForm,
      titleEn: 'Round Trip',
      totalSlots: '50',
      works: [{ id: 'w1', labelEn: 'Work', labelPt: '', labelEs: '', labelIt: '', dateTime: '2026-09-25T19:00' }],
      worksAnyone: '0, 90'
    });
    const record = { id: input.slug, ...input };
    const values = prefillEventForm(record);
    expect(values.titleEn).toBe('Round Trip');
    expect(values.totalSlots).toBe('50');
    expect(values.cautionDepositPercent).toBe('30');
    expect(values.worksAnyone).toBe('0, 90');
    expect(validateEventInput(buildEventInput(values))).toBeNull();
  });
});
