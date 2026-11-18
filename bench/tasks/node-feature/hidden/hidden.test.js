import test from 'node:test';
import assert from 'node:assert';
import { parcelar } from './src/installments.js';

const price = (v, n, i = 0.0199) => Math.round((v * i / (1 - (1 + i) ** -n) + Number.EPSILON) * 100) / 100;
const near = (a, b) => assert.ok(Math.abs(a - b) <= 0.011, `${a} != ${b}`);

test('oculto: até 3 parcelas sem juros', () => {
  assert.deepStrictEqual(parcelar(300, 3), { parcela: 100, total: 300 });
  assert.deepStrictEqual(parcelar(100, 3), { parcela: 33.33, total: 99.99 });
});
test('oculto: de 4 a 12 com juros (Tabela Price, 1,99% a.m.)', () => {
  for (const n of [4, 6, 12]) {
    const r = parcelar(1000, n);
    near(r.parcela, price(1000, n));
    near(r.total, Math.round(price(1000, n) * n * 100) / 100);
  }
});
test('oculto: parcela mínima de R$ 20', () => {
  assert.throws(() => parcelar(50, 3), RangeError);
  assert.deepStrictEqual(parcelar(60, 3), { parcela: 20, total: 60 });
});
test('oculto: número de parcelas inválido', () => {
  for (const n of [0, 13, 2.5, -1]) assert.throws(() => parcelar(1000, n), RangeError);
});
test('oculto: valor inválido', () => {
  assert.throws(() => parcelar(0, 1), RangeError);
  assert.throws(() => parcelar(-10, 1), RangeError);
});
