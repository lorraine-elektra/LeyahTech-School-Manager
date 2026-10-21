import assert from 'node:assert/strict';
import { test } from 'node:test';
import { amountInWords, formatBalance, formatMoney, normalisePhone, ordinal } from './format';

test('money is shown in cedis with two decimal places', () => {
  assert.equal(formatMoney(1450), 'GH₵ 1,450.00');
  assert.equal(formatMoney(87.5), 'GH₵ 87.50');
  assert.equal(formatBalance(-350), 'GH₵ 350.00 in credit');
});

test('receipt amounts in words', () => {
  assert.equal(amountInWords(350), 'Three hundred and fifty Ghana cedis');
  assert.equal(amountInWords(1262.5), 'One thousand two hundred and sixty-two Ghana cedis and fifty pesewas');
  assert.equal(amountInWords(2005), 'Two thousand and five Ghana cedis');
  assert.equal(amountInWords(0.75), 'Zero Ghana cedis and seventy-five pesewas');
});

test('Ghana phone numbers are normalised to 024 412 6630', () => {
  assert.equal(normalisePhone('0244126630'), '024 412 6630');
  assert.equal(normalisePhone('+233 20 816 2274'), '020 816 2274');
  assert.equal(normalisePhone('233554019387'), '055 401 9387');
  assert.equal(normalisePhone('24412663'), undefined);
});

test('positions use English ordinals', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 103].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '103rd']);
});
