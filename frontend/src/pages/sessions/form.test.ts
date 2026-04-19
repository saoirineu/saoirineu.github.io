import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';

import { asDate, buildSessionPayload, formatDate, formatTime, prefillSessionForm, totalAttendees } from './form';

describe('sessions form helpers', () => {
  it('builds payload resolving selected church and beverage data', () => {
    const payload = buildSessionPayload({
      userId: 'user-1',
      churches: [
        { id: 'resp', name: 'Responsavel' },
        { id: 'local', name: 'Local' }
      ],
      beverageBatches: [{ id: 'l1', description: 'Lote A' }],
      form: {
        title: 'Trabalho de Cura',
        date: '2024-01-02',
        startTime: '19:30',
        expectedDurationMin: '120',
        actualDurationMin: '',
        hymnals: ' hinario 1, hinario 2 ',
        churchRespId: 'resp',
        churchRespName: '',
        churchesText: 'apoio externo',
        venueId: 'local',
        venueName: '',
        venueText: 'salao',
        total: '',
        initiated: '20',
        men: '10',
        women: '11',
        children: '2',
        others: '1',
        othersDescription: 'visitantes',
        batchId: 'l1',
        batchDescription: '',
        batchText: 'reserva',
        liters: '3.5',
        notes: 'Observacao'
      }
    });

    expect(payload.title).toBe('Trabalho de Cura');
    expect(payload.venueId).toBe('local');
    expect(payload.venueName).toBe('Local');
    expect(payload.responsibleChurchIds).toEqual(['resp']);
    expect(payload.responsibleChurchNames).toEqual(['Responsavel']);
    expect(payload.hymnals).toEqual(['hinario 1', 'hinario 2']);
    expect(payload.attendees?.total).toBe(24);
    expect(payload.beverage?.batchDescription).toBe('Lote A');
    expect(payload.createdBy).toBe('user-1');
    expect(payload.date).toBeInstanceOf(Timestamp);
    expect(payload.startTime).toBeInstanceOf(Timestamp);
  });

  it('formats and converts date-like values', () => {
    const localDate = new Date(2024, 0, 2, 19, 30, 0);
    const timestamp = Timestamp.fromDate(localDate);

    expect(asDate(timestamp)?.getTime()).toBe(localDate.getTime());
    expect(formatDate(timestamp)).toBe('02/01/2024');
    expect(formatTime(timestamp)).toBe('19:30');
  });

  it('summarizes attendees and prefills edit form', () => {
    expect(
      totalAttendees({ men: 10, women: 8, children: 2, others: 1, initiated: 12, othersDescription: 'visitantes' })
    ).toEqual({
      total: 21,
      initiated: 12,
      men: 10,
      women: 8,
      children: 2,
      others: 1,
      othersDescription: 'visitantes'
    });

    const form = prefillSessionForm({
      id: 't1',
      title: 'Sessao',
      date: Timestamp.fromDate(new Date('2024-01-02T00:00:00.000Z')),
      startTime: Timestamp.fromDate(new Date('2024-01-02T19:30:00.000Z')),
      expectedDurationMin: 90,
      hymnals: ['hinario'],
      responsibleChurchIds: ['i1'],
      responsibleChurchNames: ['Igreja 1'],
      attendees: { total: 30, initiated: 20 },
      beverage: { batchId: 'l1', batchDescription: 'Lote A', liters: 2 },
      notes: 'nota'
    });

    expect(form.title).toBe('Sessao');
    expect(form.date).toBe('2024-01-02');
    expect(form.startTime).toBe('19:30');
    expect(form.hymnals).toBe('hinario');
    expect(form.churchRespId).toBe('i1');
    expect(form.liters).toBe('2');
    expect(form.notes).toBe('nota');
  });
});
