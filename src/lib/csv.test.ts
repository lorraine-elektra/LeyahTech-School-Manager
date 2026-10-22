import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toCsv } from './csv';

test('cells with commas, quotes and line breaks are quoted', () => {
  assert.equal(toCsv(['Name', 'Note'], [['Mensah, Ama', 'Said "fine"\nthen left']]), 'Name,Note\r\n"Mensah, Ama","Said ""fine""\nthen left"\r\n');
});

test('values that look like formulas are made plain text', () => {
  assert.equal(toCsv(['Phone'], [['+233 24 412 6630'], ['=SUM(A1)']]), "Phone\r\n'+233 24 412 6630\r\n'=SUM(A1)\r\n");
});

test('empty and numeric cells', () => {
  assert.equal(toCsv(['A', 'B', 'C'], [[null, 0, 1450.5]]), 'A,B,C\r\n,0,1450.5\r\n');
});
