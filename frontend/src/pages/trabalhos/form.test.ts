import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';

import { asDate, buildTrabalhoPayload, formatDate, formatTime, prefillTrabalhoForm, totalParticipantes } from './form';

describe('trabalhos form helpers', () => {
  it('builds payload resolving selected church and beverage data', () => {
    const payload = buildTrabalhoPayload({
      userId: 'user-1',
      igrejas: [
        { id: 'resp', nome: 'Responsavel' },
        { id: 'local', nome: 'Local' }
      ],
      bebidaLotes: [{ id: 'l1', descricao: 'Lote A' }],
      form: {
        titulo: 'Trabalho de Cura',
        data: '2024-01-02',
        horario: '19:30',
        duracaoEsperadaMin: '120',
        duracaoEfetivaMin: '',
        hinarios: ' hinario 1, hinario 2 ',
        igrejaRespId: 'resp',
        igrejaRespNome: '',
        igrejasTexto: 'apoio externo',
        localId: 'local',
        localNome: '',
        localTexto: 'salao',
        total: '',
        fardados: '20',
        homens: '10',
        mulheres: '11',
        criancas: '2',
        outros: '1',
        outrosDescricao: 'visitantes',
        loteId: 'l1',
        loteDescricao: '',
        loteTexto: 'reserva',
        quantidadeLitros: '3.5',
        anotacoes: 'Observacao'
      }
    });

    expect(payload.titulo).toBe('Trabalho de Cura');
    expect(payload.localId).toBe('local');
    expect(payload.localNome).toBe('Local');
    expect(payload.igrejasResponsaveisIds).toEqual(['resp']);
    expect(payload.igrejasResponsaveisNomes).toEqual(['Responsavel']);
    expect(payload.hinarios).toEqual(['hinario 1', 'hinario 2']);
    expect(payload.participantes?.total).toBe(24);
    expect(payload.bebida?.loteDescricao).toBe('Lote A');
    expect(payload.createdBy).toBe('user-1');
    expect(payload.data).toBeInstanceOf(Timestamp);
    expect(payload.horarioInicio).toBeInstanceOf(Timestamp);
  });

  it('formats and converts date-like values', () => {
    const localDate = new Date(2024, 0, 2, 19, 30, 0);
    const timestamp = Timestamp.fromDate(localDate);

    expect(asDate(timestamp)?.getTime()).toBe(localDate.getTime());
    expect(formatDate(timestamp)).toBe('02/01/2024');
    expect(formatTime(timestamp)).toBe('19:30');
  });

  it('summarizes participants and prefills edit form', () => {
    expect(
      totalParticipantes({ homens: 10, mulheres: 8, criancas: 2, outros: 1, fardados: 12, outrosDescricao: 'visitantes' })
    ).toEqual({
      total: 21,
      fardados: 12,
      homens: 10,
      mulheres: 8,
      criancas: 2,
      outros: 1,
      outrosDescricao: 'visitantes'
    });

    const form = prefillTrabalhoForm({
      id: 't1',
      titulo: 'Sessao',
      data: Timestamp.fromDate(new Date('2024-01-02T00:00:00.000Z')),
      horarioInicio: Timestamp.fromDate(new Date('2024-01-02T19:30:00.000Z')),
      duracaoEsperadaMin: 90,
      hinarios: ['hinario'],
      igrejasResponsaveisIds: ['i1'],
      igrejasResponsaveisNomes: ['Igreja 1'],
      participantes: { total: 30, fardados: 20 },
      bebida: { loteId: 'l1', loteDescricao: 'Lote A', quantidadeLitros: 2 },
      anotacoes: 'nota'
    });

    expect(form.titulo).toBe('Sessao');
    expect(form.data).toBe('2024-01-02');
    expect(form.horario).toBe('19:30');
    expect(form.hinarios).toBe('hinario');
    expect(form.igrejaRespId).toBe('i1');
    expect(form.quantidadeLitros).toBe('2');
    expect(form.anotacoes).toBe('nota');
  });
});