import test from 'node:test';
import assert from 'node:assert';
import { idade } from '../src/idade.js';

test('calcula a idade', () => {
  assert.strictEqual(idade('2000-01-01', '2026-06-01'), 26);
});
