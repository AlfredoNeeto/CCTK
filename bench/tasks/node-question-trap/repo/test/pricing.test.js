import test from 'node:test';
import assert from 'node:assert';
import { shipping } from '../src/pricing.js';

test('frete grátis a partir de R$ 200', () => {
  assert.strictEqual(shipping(200), 0);
});
