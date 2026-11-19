import test from 'node:test';
import assert from 'node:assert';
import { conciliar } from '../src/conciliacao.js';

test('concilia valor exato', () => {
  const r = conciliar([{ id: 'L1', data: '2026-11-10', valor: 100 }], [{ id: 'A', cliente: 'ana', vencimento: '2026-11-10', valor: 100 }]);
  assert.deepStrictEqual(r, { conciliados: [{ lancamento: 'L1', titulos: ['A'], tipo: 'exato', diferenca: 0 }], lancamentosSemPar: [], titulosEmAberto: [] });
});
