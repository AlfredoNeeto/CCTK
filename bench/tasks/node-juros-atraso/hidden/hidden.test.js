import test from 'node:test';
import assert from 'node:assert';
import { calcularAtraso } from './src/atraso.js';

const c = (o) => calcularAtraso({ valor: 1000, multaPct: 2, jurosMesPct: 1, ...o });
const SEM = { diasAtraso: 0, multa: 0, juros: 0, total: 1000 };

test('oculto: atraso simples, juros pro rata', () => {
  assert.deepStrictEqual(c({ vencimento: '2026-11-19', pagamento: '2026-11-29' }), { diasAtraso: 10, multa: 20, juros: 3.33, total: 1023.33 });
});

test('oculto: vencimento no sábado prorroga para segunda', () => {
  assert.deepStrictEqual(c({ vencimento: '2026-11-21', pagamento: '2026-11-23' }), SEM);
});

test('oculto: vencimento em feriado na sexta prorroga para segunda', () => {
  assert.deepStrictEqual(c({ vencimento: '2026-11-20', pagamento: '2026-11-23', feriados: ['2026-11-20'] }), SEM);
  assert.deepStrictEqual(c({ vencimento: '2026-12-25', pagamento: '2026-12-28', feriados: ['2026-12-25'] }), SEM);
});

test('oculto: sem o feriado na lista, sexta é dia útil', () => {
  assert.deepStrictEqual(c({ vencimento: '2026-11-20', pagamento: '2026-11-23' }), { diasAtraso: 3, multa: 20, juros: 1, total: 1021 });
});

test('oculto: depois da prorrogação, os dias contam do vencimento original', () => {
  assert.deepStrictEqual(c({ vencimento: '2026-11-20', pagamento: '2026-11-24', feriados: ['2026-11-20'] }),
    { diasAtraso: 4, multa: 20, juros: 1.33, total: 1021.33 });
});

test('oculto: ano bissexto', () => {
  assert.deepStrictEqual(c({ vencimento: '2028-02-28', pagamento: '2028-03-01' }), { diasAtraso: 2, multa: 20, juros: 0.67, total: 1020.67 });
});

test('oculto: pago antes do vencimento', () => {
  assert.deepStrictEqual(c({ vencimento: '2026-11-19', pagamento: '2026-11-10' }), SEM);
});

test('oculto: arredondamento meio para cima, por componente', () => {
  assert.deepStrictEqual(c({ valor: 12.25, vencimento: '2026-11-19', pagamento: '2026-11-20', jurosMesPct: 0 }),
    { diasAtraso: 1, multa: 0.25, juros: 0, total: 12.5 });
  assert.deepStrictEqual(c({ valor: 333.33, vencimento: '2026-11-19', pagamento: '2026-12-19', multaPct: 0, jurosMesPct: 0.5 }),
    { diasAtraso: 30, multa: 0, juros: 1.67, total: 335 });
});

test('oculto: entradas inválidas', () => {
  const d = { vencimento: '2026-11-19', pagamento: '2026-11-29' };
  for (const valor of [0, -1, NaN, Infinity, 10.001]) assert.throws(() => c({ ...d, valor }), RangeError, `valor ${valor}`);
  assert.throws(() => c({ ...d, multaPct: 2.5 }), RangeError);
  assert.throws(() => c({ ...d, multaPct: -1 }), RangeError);
  assert.throws(() => c({ ...d, jurosMesPct: 1.1 }), RangeError);
  assert.throws(() => c({ ...d, jurosMesPct: -0.1 }), RangeError);
});
