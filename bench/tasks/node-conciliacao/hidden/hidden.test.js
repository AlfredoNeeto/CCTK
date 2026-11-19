import test from 'node:test';
import assert from 'node:assert';
import { conciliar } from './src/conciliacao.js';

const L = (id, data, valor) => ({ id, data, valor });
const T = (id, vencimento, valor, cliente = 'X') => ({ id, cliente, vencimento, valor });
const par = (lancamento, titulos, tipo = 'exato', diferenca = 0) => ({ lancamento, titulos, tipo, diferenca });

test('oculto: exato escolhe o vencimento mais próximo; empate fica com o mais antigo', () => {
  assert.deepStrictEqual(conciliar([L('L1', '2026-11-10', 100)], [T('A', '2026-11-01', 100), T('B', '2026-11-11', 100)]),
    { conciliados: [par('L1', ['B'])], lancamentosSemPar: [], titulosEmAberto: ['A'] });
  assert.deepStrictEqual(conciliar([L('L1', '2026-11-10', 100)], [T('B', '2026-11-12', 100), T('A', '2026-11-08', 100), T('C', '2026-11-20', 100)]),
    { conciliados: [par('L1', ['A'])], lancamentosSemPar: [], titulosEmAberto: ['B', 'C'] });
});

test('oculto: janela de -5 a +30 dias, inclusive', () => {
  const r = conciliar([L('L1', '2026-11-05', 50), L('L2', '2026-11-04', 60), L('L3', '2026-12-10', 70), L('L4', '2026-12-11', 80)],
    [T('A', '2026-11-10', 50), T('B', '2026-11-10', 60), T('C', '2026-11-10', 70), T('D', '2026-11-10', 80)]);
  assert.deepStrictEqual(r, { conciliados: [par('L1', ['A']), par('L3', ['C'])], lancamentosSemPar: ['L2', 'L4'], titulosEmAberto: ['B', 'D'] });
});

test('oculto: a passada exata termina antes do acréscimo', () => {
  // L1 pagaria T1 com acréscimo, mas L2, processado depois, paga T1 exato
  assert.deepStrictEqual(conciliar([L('L1', '2026-11-01', 105), L('L2', '2026-11-05', 100)], [T('T1', '2026-10-25', 100)]),
    { conciliados: [par('L2', ['T1'])], lancamentosSemPar: ['L1'], titulosEmAberto: [] });
});

test('oculto: acréscimo até 10%, só com título vencido', () => {
  const r = conciliar([L('L1', '2026-11-10', 110), L('L2', '2026-11-10', 110.01), L('L3', '2026-11-10', 101)],
    [T('A', '2026-11-01', 100), T('B', '2026-11-02', 100), T('C', '2026-11-10', 100)]);
  assert.deepStrictEqual(r, { conciliados: [par('L1', ['A'], 'acrescimo', 10), par('L3', ['B'], 'acrescimo', 1)],
    lancamentosSemPar: ['L2'], titulosEmAberto: ['C'] });
});

test('oculto: acréscimo escolhe o título mais antigo; diferença em reais', () => {
  assert.deepStrictEqual(conciliar([L('L1', '2026-11-20', 103.5)], [T('B', '2026-11-05', 100), T('A', '2026-11-05', 100), T('Z', '2026-11-01', 100)]),
    { conciliados: [par('L1', ['Z'], 'acrescimo', 3.5)], lancamentosSemPar: [], titulosEmAberto: ['A', 'B'] });
});

test('oculto: agrupado exige o mesmo cliente e pega o primeiro par na ordem', () => {
  const r = conciliar([L('L1', '2026-11-10', 300)],
    [T('A', '2026-11-01', 100, 'ana'), T('B', '2026-11-02', 200, 'bia'), T('C', '2026-11-03', 200, 'ana'), T('D', '2026-11-04', 150, 'ana'), T('E', '2026-11-04', 150, 'ana')]);
  assert.deepStrictEqual(r, { conciliados: [par('L1', ['A', 'C'], 'agrupado')], lancamentosSemPar: [], titulosEmAberto: ['B', 'D', 'E'] });
  assert.deepStrictEqual(conciliar([L('L1', '2026-11-10', 0.3)], [T('A', '2026-11-01', 0.1, 'k'), T('B', '2026-11-02', 0.2, 'k')]).conciliados,
    [par('L1', ['A', 'B'], 'agrupado')]);
});

test('oculto: empate de data entre lançamentos usa ordem alfabética do id', () => {
  assert.deepStrictEqual(conciliar([L('L2', '2026-11-10', 100), L('L10', '2026-11-10', 100)], [T('A', '2026-11-10', 100)]),
    { conciliados: [par('L10', ['A'])], lancamentosSemPar: ['L2'], titulosEmAberto: [] });
});

test('oculto: entradas inválidas', () => {
  assert.throws(() => conciliar([L('L1', '2026-11-10', 1), L('L1', '2026-11-11', 2)], []), (e) => e instanceof Error && !(e instanceof RangeError));
  assert.throws(() => conciliar([], [T('A', '2026-11-10', 1), T('A', '2026-11-11', 2)]), (e) => e instanceof Error && !(e instanceof RangeError));
  for (const v of [0, -1, NaN, Infinity, 1.005]) {
    assert.throws(() => conciliar([L('L1', '2026-11-10', v)], []), RangeError, `lançamento ${v}`);
    assert.throws(() => conciliar([], [T('A', '2026-11-10', v)]), RangeError, `título ${v}`);
  }
});
