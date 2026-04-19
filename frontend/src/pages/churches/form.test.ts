import { describe, expect, it } from 'vitest';

import { buildChurchPayload, buildChurchUsageMap, prefillChurchForm, sortChurches } from './form';

describe('churches form helpers', () => {
  it('builds church payload trimming text and validating coordinates', () => {
    const payload = buildChurchPayload({
      name: '  Igreja da Floresta  ',
      city: ' Rio Branco ',
      state: ' AC ',
      country: ' Brasil ',
      lineage: ' ICEFLU ',
      observations: ' nota ',
      lat: ' -9.974 ',
      lng: ' invalido '
    });

    expect(payload).toEqual({
      name: 'Igreja da Floresta',
      city: 'Rio Branco',
      state: 'AC',
      country: 'Brasil',
      lineage: 'ICEFLU',
      observations: 'nota',
      lat: -9.974,
      lng: undefined
    });
  });

  it('prefills and sorts churches consistently', () => {
    const form = prefillChurchForm({
      id: '2',
      name: 'Centro',
      city: 'Rio Branco',
      lat: -9.9,
      lng: -67.8
    } as import('../../lib/works').ChurchInfo);

    expect(form.name).toBe('Centro');
    expect(form.lat).toBe('-9.9');
    expect(sortChurches([{ id: 'b', name: 'Zulu' }, { id: 'a', name: 'Alpha' }] as import('../../lib/works').ChurchInfo[]).map(item => item.name)).toEqual([
      'Alpha',
      'Zulu'
    ]);
  });

  it('aggregates usage stats from sessions and users', () => {
    const usage = buildChurchUsageMap(
      [
        { id: 't1', venueId: 'i1', responsibleChurchIds: ['i1', 'i2'] },
        { id: 't2', venueId: 'i2', responsibleChurchIds: ['i2'] }
      ],
      [
        { uid: 'u1', currentChurchId: 'i1', initiationChurchId: 'i2' },
        { uid: 'u2', currentChurchId: 'i2', initiationChurchId: 'i2' }
      ]
    );

    expect(usage.get('i1')).toEqual({
      worksVenue: 1,
      worksResponsible: 1,
      membersCurrentChurch: 1,
      membersInitiationChurch: 0
    });
    expect(usage.get('i2')).toEqual({
      worksVenue: 1,
      worksResponsible: 2,
      membersCurrentChurch: 1,
      membersInitiationChurch: 2
    });
  });
});
