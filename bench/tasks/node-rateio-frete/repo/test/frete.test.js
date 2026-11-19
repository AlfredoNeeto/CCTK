import test from 'node:test';
import assert from 'node:assert';
import { ratearFrete } from '../src/frete.js';

test('rateia por peso', () => {
  assert.deepStrictEqual(ratearFrete(30, [{ sku: 'A', peso: 1, valor: 10 }, { sku: 'B', peso: 2, valor: 10 }]),
    [{ sku: 'A', frete: 10 }, { sku: 'B', frete: 20 }]);
});
