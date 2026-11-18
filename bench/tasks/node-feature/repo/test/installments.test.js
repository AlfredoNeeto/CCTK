import test from 'node:test';
import assert from 'node:assert';
import { parcelar } from '../src/installments.js';

test('à vista', () => {
  assert.deepStrictEqual(parcelar(100, 1), { parcela: 100, total: 100 });
});
