import assert from 'node:assert/strict';
import { test } from 'node:test';
import { className } from './naming';

test('names JHS classes by year and stream', () => {
  assert.equal(className(7, null, 'A'), 'Basic 7A');
  assert.equal(className(9, null, null), 'Basic 9');
});

test('names SHS classes by form, programme and stream', () => {
  assert.equal(className(10, 'Science', null), 'SHS 1 Science');
  assert.equal(className(12, 'General Arts', 'B'), 'SHS 3 General Arts B');
});
