import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateTemporaryPassword, hashPassword, verifyPassword } from './password';
import { passwordProblem } from './passwordRules';

test('hashed passwords verify and wrong ones do not', async () => {
  const stored = await hashPassword('Kente-2026');
  assert.equal(await verifyPassword('Kente-2026', stored), true);
  assert.equal(await verifyPassword('kente-2026', stored), false);
});

test('temporary passwords avoid look-alike characters', () => {
  const password = generateTemporaryPassword();
  assert.equal(password.length, 10);
  assert.match(password, /^[a-hjkmnp-z2-9]+$/);
});

test('weak passwords are refused with a reason', () => {
  assert.equal(passwordProblem('short', 'ymensah'), 'Use at least 8 characters.');
  assert.equal(passwordProblem('ymensah2026', 'ymensah'), 'The password cannot contain your username.');
  assert.match(passwordProblem('password123', 'ymensah') ?? '', /easy to guess/);
  assert.equal(passwordProblem('Osu-Castle-14', 'ymensah'), undefined);
});
