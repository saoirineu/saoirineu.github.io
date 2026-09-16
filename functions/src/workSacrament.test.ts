import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sameWorkExit, workExitTransaction, workExitTransactionId } from './workSacrament';

const work = {
  churchId: 'it-stella-azzurra',
  churchName: 'Stella Azzurra',
  date: '2026-09-15',
  workTypeId: 'concentracao',
  workTypeLabel: 'Concentração',
  createdBy: 'manager-uid',
  sacrament: { stockId: 'stock-1', itemId: 'item-1', itemLabel: '2º grau', quantity: 0.75, unit: 'L' }
};

test('the movement id is derived from the work id', () => {
  assert.equal(workExitTransactionId('abc'), 'work-abc');
});

test('a work with a batch and quantity yields one exit movement', () => {
  assert.deepEqual(workExitTransaction('w1', work), {
    itemId: 'item-1',
    stockId: 'stock-1',
    type: 'exit',
    date: '2026-09-15',
    destinationChurchId: 'it-stella-azzurra',
    destinationChurchName: 'Stella Azzurra',
    quantity: 0.75,
    notes: 'Trabalho: Concentração (Stella Azzurra)',
    workId: 'w1',
    createdBy: 'manager-uid'
  });
});

test('the free-text label wins for works of type "other"', () => {
  const movement = workExitTransaction('w1', { ...work, workTypeId: 'other', workTypeLabel: 'Outro', workTypeOther: 'Hinário da Madrinha' });
  assert.equal(movement?.notes, 'Trabalho: Hinário da Madrinha (Stella Azzurra)');
});

test('deleted works and works without usable Daime yield no movement', () => {
  assert.equal(workExitTransaction('w1', undefined), null);
  assert.equal(workExitTransaction('w1', { ...work, sacrament: undefined }), null);
  assert.equal(workExitTransaction('w1', { ...work, sacrament: { ...work.sacrament, itemId: '' } }), null);
  assert.equal(workExitTransaction('w1', { ...work, sacrament: { ...work.sacrament, stockId: 7 } }), null);
  for (const quantity of [0, -1, Number.NaN, '1', null]) {
    assert.equal(workExitTransaction('w1', { ...work, sacrament: { ...work.sacrament, quantity } }), null, String(quantity));
  }
});

test('edits that do not touch the Daime are recognised as no-ops', () => {
  const before = workExitTransaction('w1', work);
  const reviewed = workExitTransaction('w1', { ...work, reviewStatus: 'reviewed', hymnalText: 'O Cruzeiro' });
  assert.equal(sameWorkExit(before, reviewed), true);
});

test('a changed quantity, batch, or date is a different movement', () => {
  const before = workExitTransaction('w1', work);
  assert.equal(sameWorkExit(before, workExitTransaction('w1', { ...work, sacrament: { ...work.sacrament, quantity: 1 } })), false);
  assert.equal(sameWorkExit(before, workExitTransaction('w1', { ...work, sacrament: { ...work.sacrament, itemId: 'item-2' } })), false);
  assert.equal(sameWorkExit(before, workExitTransaction('w1', { ...work, date: '2026-09-14' })), false);
});

test('appearing or disappearing Daime is a change, absence on both sides is not', () => {
  const movement = workExitTransaction('w1', work);
  assert.equal(sameWorkExit(null, movement), false);
  assert.equal(sameWorkExit(movement, null), false);
  assert.equal(sameWorkExit(null, null), true);
});
