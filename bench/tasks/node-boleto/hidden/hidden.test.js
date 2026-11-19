import test from 'node:test';
import assert from 'node:assert';
import { lerBoleto } from './src/boleto.js';

const HOJE = '2026-11-19';
const BASICO = '00190.00009 02345.678904 12345.678176 1 15000000012345';
// Changes the digit at position i (0-based, counting digits only) of a masked line.
const troca = (linha, i) => {
  let k = -1;
  return linha.replace(/\d/g, (c) => (++k === i ? String((Number(c) + 1) % 10) : c));
};

test('oculto: linha com máscara e sem máscara', () => {
  const esperado = { banco: '001', vencimento: '2026-07-07', valor: 123.45, codigoBarras: '00191150000000123450000002345678901234567817' };
  assert.deepStrictEqual(lerBoleto(BASICO, HOJE), esperado);
  assert.deepStrictEqual(lerBoleto(BASICO.replace(/[.\s]/g, ''), HOJE), esperado);
});

test('oculto: fator 1000 do ciclo atual e 9999 do antigo', () => {
  assert.strictEqual(lerBoleto('23791.23454 67890.123457 67890.123457 5 10000000000100', HOJE).vencimento, '2025-02-22');
  const antigo = lerBoleto('34195.55556 44444.333338 22222.111118 9 99990099999999', HOJE);
  assert.strictEqual(antigo.vencimento, '2025-02-21');
  assert.strictEqual(antigo.valor, 999999.99);
});

test('oculto: o ciclo é o mais perto de hoje', () => {
  assert.strictEqual(lerBoleto(BASICO, '2001-06-01').vencimento, '2001-11-15');
  assert.strictEqual(lerBoleto(BASICO, '2026-01-01').vencimento, '2026-07-07');
});

test('oculto: fator 0000 é sem vencimento; valor zero', () => {
  assert.strictEqual(lerBoleto('10499.87652 43210.987657 43210.987657 8 00000000005000', HOJE).vencimento, null);
  const z = lerBoleto('03390.00002 00000.000000 00000.000000 9 20000000000000', HOJE);
  assert.deepStrictEqual([z.valor, z.vencimento], [0, '2027-11-19']);
});

test('oculto: tamanho errado', () => {
  assert.throws(() => lerBoleto(BASICO.slice(0, -1), HOJE), /tamanho/);
  assert.throws(() => lerBoleto(BASICO.replace('1 1500', 'X 1500'), HOJE), /tamanho/);
  assert.throws(() => lerBoleto('', HOJE), /tamanho/);
});

test('oculto: DV de cada campo', () => {
  assert.throws(() => lerBoleto(troca(BASICO, 9), HOJE), /campo 1/);
  assert.throws(() => lerBoleto(troca(BASICO, 20), HOJE), /campo 2/);
  assert.throws(() => lerBoleto(troca(BASICO, 31), HOJE), /campo 3/);
});

test('oculto: DV geral, moeda e fator', () => {
  assert.throws(() => lerBoleto(troca(BASICO, 32), HOJE), /DV geral/);
  assert.throws(() => lerBoleto('00100.00008 02345.678904 12345.678176 8 15000000000100', HOJE), /moeda/);
  assert.throws(() => lerBoleto('00190.00009 02345.678904 12345.678176 6 09990000000100', HOJE), /fator/);
});
