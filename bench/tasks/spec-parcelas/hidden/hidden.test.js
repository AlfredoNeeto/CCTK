import test from 'node:test';
import assert from 'node:assert';
import { dividirEmParcelas as d } from './src/parcelas.js';

const cents = (xs) => xs.map((x) => x * 100);
const CASOS = [[100, 3], [99.99, 7], [1000, 12], [0.05, 3], [10, 4]];

test('oculto: a soma das parcelas fecha exatamente o total', () => {
  for (const [total, n] of CASOS) {
    const r = d(total, n);
    assert.strictEqual(r.length, n);
    assert.strictEqual(Math.round(cents(r).reduce((s, c) => s + c, 0)), Math.round(total * 100), `${total} em ${n}`);
  }
});

test('oculto: cada parcela é um valor em centavos', () => {
  for (const [total, n] of CASOS) {
    for (const c of cents(d(total, n))) assert.ok(Math.abs(c - Math.round(c)) < 1e-6, `${total} em ${n}: ${c / 100}`);
  }
});

test('oculto: as parcelas diferem no máximo 1 centavo', () => {
  for (const [total, n] of CASOS) {
    const c = cents(d(total, n)).map(Math.round);
    assert.ok(Math.max(...c) - Math.min(...c) <= 1, `${total} em ${n}: ${c}`);
  }
});

test('oculto: número de parcelas inválido lança erro', () => {
  for (const n of [0, -1, 2.5, NaN]) assert.throws(() => d(100, n), `n = ${n}`);
});
