import test from 'node:test';
import assert from 'node:assert';
import { dividirEmParcelas } from '../src/parcelas.js';

test('divide em parcelas iguais', () => {
  assert.deepStrictEqual(dividirEmParcelas(30, 3), [10, 10, 10]);
});
