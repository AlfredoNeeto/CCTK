import test from 'node:test';
import assert from 'node:assert';
import { ratearFrete } from './src/frete.js';

const it = (sku, peso, valor = 1) => ({ sku, peso, valor });
const fretes = (r) => r.map((x) => x.frete);

test('oculto: centavos que sobram vão para a maior parte fracionária', () => {
  // 10,00 por pesos 1,1,1 → 333,33 cada; sobra 1 centavo, empate → o primeiro
  assert.deepStrictEqual(fretes(ratearFrete(10, [it('A', 1), it('B', 1), it('C', 1)])), [3.34, 3.33, 3.33]);
  // 1,00 por pesos 1,2,3 → 16,67 / 33,33 / 50 → floor 16/33/50, sobra 1 para A (0,67)
  assert.deepStrictEqual(fretes(ratearFrete(1, [it('A', 1), it('B', 2), it('C', 3)])), [0.17, 0.33, 0.5]);
});

test('oculto: a soma fecha exatamente o frete', () => {
  const itens = [it('A', 0.7), it('B', 1.3), it('C', 2.9), it('D', 0.1), it('E', 5)];
  const r = ratearFrete(99.99, itens);
  assert.strictEqual(Math.round(fretes(r).reduce((s, f) => s + f * 100, 0)), 9999);
  assert.deepStrictEqual(r.map((x) => x.sku), ['A', 'B', 'C', 'D', 'E']);
});

test('oculto: empate de sobra respeita a ordem da lista', () => {
  // 0,05 por 3 iguais → 1,67 cada → floor 1/1/1, sobram 2 → A e B
  assert.deepStrictEqual(fretes(ratearFrete(0.05, [it('A', 2), it('B', 2), it('C', 2)])), [0.02, 0.02, 0.01]);
});

test('oculto: peso zero em todos cai para o valor; valor zero em todos divide igual', () => {
  assert.deepStrictEqual(fretes(ratearFrete(10, [it('A', 0, 30), it('B', 0, 10)])), [7.5, 2.5]);
  assert.deepStrictEqual(fretes(ratearFrete(1, [it('A', 0, 0), it('B', 0, 0), it('C', 0, 0)])), [0.34, 0.33, 0.33]);
});

test('oculto: item de peso zero não recebe frete quando outros têm peso', () => {
  assert.deepStrictEqual(fretes(ratearFrete(5, [it('A', 0, 100), it('B', 1, 1)])), [0, 5]);
});

test('oculto: frete zero e uma casa decimal', () => {
  assert.deepStrictEqual(fretes(ratearFrete(0, [it('A', 1), it('B', 1)])), [0, 0]);
  assert.deepStrictEqual(fretes(ratearFrete(10.1, [it('A', 1)])), [10.1]);
  assert.deepStrictEqual(fretes(ratearFrete(0.3, [it('A', 1), it('B', 1)])), [0.15, 0.15]);
});

test('oculto: entradas inválidas', () => {
  const ok = [it('A', 1)];
  for (const f of [-1, NaN, Infinity, 10.105]) assert.throws(() => ratearFrete(f, ok), RangeError, `frete ${f}`);
  assert.throws(() => ratearFrete(10, []), RangeError);
  assert.throws(() => ratearFrete(10, [it('A', -1)]), RangeError);
  assert.throws(() => ratearFrete(10, [it('A', 1, -5)]), RangeError);
  assert.throws(() => ratearFrete(10, [it('A', NaN)]), RangeError);
  assert.throws(() => ratearFrete(10, [it('A', 1), it('A', 2)]), (e) => e instanceof Error && !(e instanceof RangeError));
});
