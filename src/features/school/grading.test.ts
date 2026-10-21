import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gradeFor, totalScore, weightedExamScore } from './grading';

test('total is class score plus 70% of the exam, rounded', () => {
  assert.equal(totalScore(24, 68), 72);
  assert.equal(totalScore(30, 100), 100);
  assert.equal(totalScore(17.5, 41), 46);
  assert.equal(weightedExamScore(67), 46.9);
});

test('JHS uses BECE grades 1 to 9', () => {
  assert.equal(gradeFor('JHS', 80).grade, '1');
  assert.equal(gradeFor('JHS', 79).grade, '2');
  assert.equal(gradeFor('JHS', 45).remark, 'Low Average');
  assert.equal(gradeFor('JHS', 12).grade, '9');
});

test('SHS uses WASSCE grades A1 to F9', () => {
  assert.equal(gradeFor('SHS', 75).grade, 'A1');
  assert.equal(gradeFor('SHS', 62).grade, 'C4');
  assert.equal(gradeFor('SHS', 62).remark, 'Credit');
  assert.equal(gradeFor('SHS', 39).grade, 'F9');
});
