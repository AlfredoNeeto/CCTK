import test from 'node:test';
import assert from 'node:assert';
import { applyDiscount } from './src/discount.js';

test('oculto: limites das faixas', () => {
  assert.strictEqual(applyDiscount(100), 95);
  assert.strictEqual(applyDiscount(500), 450);
  assert.strictEqual(applyDiscount(1000), 850);
});
test('oculto: valores entre faixas', () => {
  assert.strictEqual(applyDiscount(99.99), 99.99);
  assert.strictEqual(applyDiscount(200), 190);
  assert.strictEqual(applyDiscount(2000), 1700);
});
test('oculto: cupom depois do percentual', () => {
  assert.strictEqual(applyDiscount(500, 50), 400);
});
test('oculto: nunca negativo', () => {
  assert.strictEqual(applyDiscount(30, 50), 0);
  assert.strictEqual(applyDiscount(100, 95), 0);
});
test('oculto: centavos', () => {
  assert.strictEqual(applyDiscount(123.45), 117.28);
});
