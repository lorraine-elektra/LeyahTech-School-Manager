import assert from 'node:assert/strict';
import { test } from 'node:test';
import { annualAverage, rankPositions } from './results';

test('tied scores share a position and the next one is skipped', () => {
  const totals = [612, 588, 588, 540, null];
  const positions = rankPositions(totals.map((total, index) => ({ index, total })), (r) => r.total);
  assert.deepEqual([...positions.entries()].sort((a, b) => a[0].index - b[0].index).map(([, p]) => p), [1, 2, 2, 4]);
});

test('students without a complete set of scores are not ranked', () => {
  const rows = [{ total: null }, { total: 70 }];
  const positions = rankPositions(rows, (r) => r.total);
  assert.equal(positions.get(rows[0]), undefined);
  assert.equal(positions.get(rows[1]), 1);
});

test('annual average ignores terms without results', () => {
  assert.equal(annualAverage([45.6, 50.3, 45.5]), 47.1);
  assert.equal(annualAverage([62.4, null, null]), 62.4);
  assert.equal(annualAverage([null, null]), null);
});
