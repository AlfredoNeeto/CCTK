import test from 'node:test';
import assert from 'node:assert';
import { lerBoleto } from '../src/boleto.js';

test('lê o banco e o valor', () => {
  const b = lerBoleto('00190.00009 02345.678904 12345.678176 1 15000000012345', '2026-11-19');
  assert.strictEqual(b.banco, '001');
  assert.strictEqual(b.valor, 123.45);
});
