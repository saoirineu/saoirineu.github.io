import { describe, expect, it } from 'vitest';

import { buildIgrejaPayload, buildUsoIgrejasMap, prefillIgrejaForm, sortIgrejas } from './form';

describe('churches form helpers', () => {
  it('builds church payload trimming text and validating coordinates', () => {
    const payload = buildIgrejaPayload({
      nome: '  Igreja da Floresta  ',
      cidade: ' Rio Branco ',
      estado: ' AC ',
      pais: ' Brasil ',
      linhagem: ' ICEFLU ',
      observacoes: ' nota ',
      lat: ' -9.974 ',
      lng: ' invalido '
    });

    expect(payload).toEqual({
      nome: 'Igreja da Floresta',
      cidade: 'Rio Branco',
      estado: 'AC',
      pais: 'Brasil',
      linhagem: 'ICEFLU',
      observacoes: 'nota',
      lat: -9.974,
      lng: undefined
    });
  });

  it('prefills and sorts churches consistently', () => {
    const form = prefillIgrejaForm({
      id: '2',
      nome: 'Centro',
      cidade: 'Rio Branco',
      lat: -9.9,
      lng: -67.8
    });

    expect(form.nome).toBe('Centro');
    expect(form.lat).toBe('-9.9');
    expect(sortIgrejas([{ id: 'b', nome: 'Zulu' }, { id: 'a', nome: 'Alpha' }]).map(item => item.nome)).toEqual([
      'Alpha',
      'Zulu'
    ]);
  });

  it('aggregates usage stats from trabalhos and usuarios', () => {
    const usage = buildUsoIgrejasMap(
      [
        { id: 't1', localId: 'i1', igrejasResponsaveisIds: ['i1', 'i2'] },
        { id: 't2', localId: 'i2', igrejasResponsaveisIds: ['i2'] }
      ],
      [
        { uid: 'u1', igrejaAtualId: 'i1', fardamentoIgrejaId: 'i2' },
        { uid: 'u2', igrejaAtualId: 'i2', fardamentoIgrejaId: 'i2' }
      ]
    );

    expect(usage.get('i1')).toEqual({
      trabalhosLocal: 1,
      trabalhosResponsavel: 1,
      pessoasAtuais: 1,
      pessoasFardamento: 0
    });
    expect(usage.get('i2')).toEqual({
      trabalhosLocal: 1,
      trabalhosResponsavel: 2,
      pessoasAtuais: 1,
      pessoasFardamento: 2
    });
  });
});