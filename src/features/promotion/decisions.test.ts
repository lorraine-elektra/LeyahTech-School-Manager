import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextAcademicYear, nextClassName, proposedDecision } from './decisions';

test('students at or above the pass mark are promoted', () => {
  assert.equal(proposedDecision({ yearGroup: 8 }, 45), 'Promoted');
  assert.equal(proposedDecision({ yearGroup: 8 }, 44.9), 'Repeated');
  assert.equal(proposedDecision({ yearGroup: 8 }, null), null);
});

test('final-year classes complete instead of moving up', () => {
  assert.equal(proposedDecision({ yearGroup: 9 }, 38), 'Completed');
  assert.equal(proposedDecision({ yearGroup: 12 }, 71), 'Completed');
});

test('promoted students move one year group up in the same stream or programme', () => {
  assert.equal(nextClassName({ yearGroup: 7, stream: 'A', programme: null }, 'Promoted'), 'Basic 8A');
  assert.equal(nextClassName({ yearGroup: 8, stream: 'B', programme: null }, 'Repeated'), 'Basic 8B');
  assert.equal(nextClassName({ yearGroup: 10, stream: null, programme: 'General Arts' }, 'Promoted on trial'), 'SHS 2 General Arts');
  assert.equal(nextAcademicYear('2026/2027'), '2027/2028');
});
