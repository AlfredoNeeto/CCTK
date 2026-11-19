import test from 'node:test';
import assert from 'node:assert';
import { calcularAtraso } from '../src/atraso.js';

test('pago no vencimento não tem encargos', () => {
  const r = calcularAtraso({ valor: 1000, vencimento: '2026-11-19', pagamento: '2026-11-19', multaPct: 2, jurosMesPct: 1 });
  assert.deepStrictEqual(r, { diasAtraso: 0, multa: 0, juros: 0, total: 1000 });
});
