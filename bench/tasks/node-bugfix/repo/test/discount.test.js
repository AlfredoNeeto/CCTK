import test from 'node:test';
import assert from 'node:assert';
import { applyDiscount } from '../src/discount.js';

test('pedido de R$ 500 tem 10% de desconto', () => {
  assert.strictEqual(applyDiscount(500), 450);
});

test('pedido pequeno não tem desconto', () => {
  assert.strictEqual(applyDiscount(50), 50);
});
