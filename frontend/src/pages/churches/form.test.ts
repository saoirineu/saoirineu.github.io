import { describe, expect, it } from 'vitest';

import { buildChurchPayload, buildChurchUsageMap, initialChurchForm, prefillChurchForm, sortChurches } from './form';

describe('churches form helpers', () => {
  it('builds church payload trimming text and validating coordinates', () => {
    const payload = buildChurchPayload({
      name: '  Igreja da Floresta  ',
      city: ' Rio Branco ',
      state: ' AC ',
      country: ' Brasil ',
      isIceflu: false,
      lineage: ' Barquinha ',
      leaderName: ' Maria Silva ',
      leaderEmail: ' maria@example.org ',
      churchEmail: ' igreja@example.org ',
      observations: ' nota ',
      lat: ' -9.974 ',
      lng: ' invalido '
    });

    expect(payload).toEqual({
      name: 'Igreja da Floresta',
      city: 'Rio Branco',
      state: 'AC',
      country: 'Brasil',
      lineage: 'Barquinha',
      leaderName: 'Maria Silva',
      leaderEmail: 'maria@example.org',
      churchEmail: 'igreja@example.org',
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
      leaderName: 'João Souza',
      leaderEmail: 'joao@example.org',
      churchEmail: 'centro@example.org',
      lat: -9.9,
      lng: -67.8
    } as import('../../lib/works').ChurchInfo);

    expect(form.name).toBe('Centro');
    expect(form.leaderName).toBe('João Souza');
    expect(form.leaderEmail).toBe('joao@example.org');
    expect(form.churchEmail).toBe('centro@example.org');
    expect(form.lat).toBe('-9.9');
    expect(sortChurches([{ id: 'b', name: 'Zulu' }, { id: 'a', name: 'Alpha' }] as import('../../lib/works').ChurchInfo[]).map(item => item.name)).toEqual([
      'Alpha',
      'Zulu'
    ]);
  });

  it('stores ICEFLU as the line unless another one is named', () => {
    expect(initialChurchForm.isIceflu).toBe(true);
    expect(buildChurchPayload({ ...initialChurchForm, name: 'Casa', lineage: 'Barquinha' }).lineage).toBe('ICEFLU');
    expect(buildChurchPayload({ ...initialChurchForm, name: 'Casa', isIceflu: false, lineage: '  ' }).lineage).toBeUndefined();

    const church = { id: '1', name: 'Casa' };
    expect(prefillChurchForm({ ...church, lineage: ' iceflu ' })).toMatchObject({ isIceflu: true, lineage: '' });
    expect(prefillChurchForm({ ...church, lineage: 'UdV' })).toMatchObject({ isIceflu: false, lineage: 'UdV' });
    expect(prefillChurchForm(church)).toMatchObject({ isIceflu: true, lineage: '' });
  });

  it('aggregates usage stats from sessions and users', () => {
    const usage = buildChurchUsageMap(
      [
        { churchId: 'i1' },
        { churchId: 'i2' },
        { churchId: 'i2' },
        { churchId: '' }
      ],
      [
        { uid: 'u1', currentChurchId: 'i1', initiationChurchId: 'i2' },
        { uid: 'u2', currentChurchId: 'i2', initiationChurchId: 'i2' }
      ]
    );

    expect(usage.get('i1')).toEqual({
      worksResponsible: 1,
      membersCurrentChurch: 1,
      membersInitiationChurch: 0
    });
    expect(usage.get('i2')).toEqual({
      worksResponsible: 2,
      membersCurrentChurch: 1,
      membersInitiationChurch: 2
    });
  });
});
