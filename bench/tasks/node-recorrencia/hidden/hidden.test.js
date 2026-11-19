import test from 'node:test';
import assert from 'node:assert';
import { gerarOcorrencias as g } from './src/recorrencia.js';

test('oculto: semanal com vários dias e intervalo 2', () => {
  assert.deepStrictEqual(g({ freq: 'semanal', inicio: '2026-11-02', diasSemana: [1, 3], intervalo: 2 }, '2026-11-01', '2026-11-30'),
    ['2026-11-02', '2026-11-04', '2026-11-16', '2026-11-18', '2026-11-30']);
});

test('oculto: dia da semana 0 anterior ao inicio não existe', () => {
  assert.deepStrictEqual(g({ freq: 'semanal', inicio: '2026-11-04', diasSemana: [1, 5] }, '2026-11-01', '2026-11-16'),
    ['2026-11-06', '2026-11-09', '2026-11-13', '2026-11-16']);
});

test('oculto: mensal no dia 31 vira o último dia do mês, inclusive em ano bissexto', () => {
  assert.deepStrictEqual(g({ freq: 'mensal', inicio: '2026-01-31' }, '2026-01-01', '2026-04-30'),
    ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  assert.deepStrictEqual(g({ freq: 'mensal', inicio: '2027-12-31', dia: 31 }, '2028-01-01', '2028-03-31'),
    ['2028-01-31', '2028-02-29', '2028-03-31']);
  assert.deepStrictEqual(g({ freq: 'mensal', inicio: '2026-01-10', dia: -1 }, '2026-01-01', '2026-03-31'),
    ['2026-01-31', '2026-02-28', '2026-03-31']);
});

test('oculto: ordinal (última sexta e quinta segunda)', () => {
  assert.deepStrictEqual(g({ freq: 'mensal', inicio: '2026-09-01', ordinal: { n: -1, diaSemana: 5 } }, '2026-09-01', '2026-12-31'),
    ['2026-09-25', '2026-10-30', '2026-11-27', '2026-12-25']);
  assert.deepStrictEqual(g({ freq: 'mensal', inicio: '2026-01-01', ordinal: { n: 5, diaSemana: 1 } }, '2026-01-01', '2026-12-31'),
    ['2026-03-30', '2026-06-29', '2026-08-31', '2026-11-30']);
});

test('oculto: mensal com intervalo 3', () => {
  assert.deepStrictEqual(g({ freq: 'mensal', inicio: '2026-01-15', intervalo: 3 }, '2026-01-01', '2026-12-31'),
    ['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15']);
});

test('oculto: vezes conta exceções e datas antes da janela; fim é inclusivo', () => {
  assert.deepStrictEqual(g({ freq: 'mensal', inicio: '2026-01-10', vezes: 4, excecoes: ['2026-02-10'] }, '2026-01-01', '2026-12-31'),
    ['2026-01-10', '2026-03-10', '2026-04-10']);
  assert.deepStrictEqual(g({ freq: 'mensal', inicio: '2026-01-10', vezes: 4 }, '2026-03-01', '2026-12-31'), ['2026-03-10', '2026-04-10']);
  assert.deepStrictEqual(g({ freq: 'semanal', inicio: '2026-11-02', fim: '2026-11-16' }, '2026-11-01', '2026-12-31'),
    ['2026-11-02', '2026-11-09', '2026-11-16']);
});

test('oculto: ajuste para o próximo dia útil, com feriado', () => {
  assert.deepStrictEqual(g({ freq: 'mensal', inicio: '2026-11-21', ajuste: 'proximo', feriados: ['2026-12-21'] }, '2026-11-01', '2027-01-31'),
    ['2026-11-23', '2026-12-22', '2027-01-21']);
});

test('oculto: datas ajustadas para o mesmo dia viram uma só', () => {
  assert.deepStrictEqual(g({ freq: 'semanal', inicio: '2026-11-07', diasSemana: [6, 0], ajuste: 'proximo' }, '2026-11-01', '2026-11-20'),
    ['2026-11-09', '2026-11-16']);
});

test('oculto: a janela vale para a data ajustada', () => {
  // domingo 06/12, fora da janela, volta para sexta 04/12, dentro dela
  assert.deepStrictEqual(g({ freq: 'semanal', inicio: '2026-11-08', ajuste: 'anterior' }, '2026-11-01', '2026-12-04'),
    ['2026-11-06', '2026-11-13', '2026-11-20', '2026-11-27', '2026-12-04']);
  // sábado 28/11, antes da janela, avança para segunda 30/11, dentro dela
  assert.deepStrictEqual(g({ freq: 'semanal', inicio: '2026-11-28', ajuste: 'proximo' }, '2026-11-30', '2026-12-14'),
    ['2026-11-30', '2026-12-07', '2026-12-14']);
});

test('oculto: exceção vale para a data do padrão, não para a ajustada', () => {
  assert.deepStrictEqual(g({ freq: 'semanal', inicio: '2026-11-07', ajuste: 'proximo', excecoes: ['2026-11-09'] }, '2026-11-01', '2026-11-20'),
    ['2026-11-09', '2026-11-16']);
  assert.deepStrictEqual(g({ freq: 'semanal', inicio: '2026-11-07', ajuste: 'proximo', excecoes: ['2026-11-07'] }, '2026-11-01', '2026-11-20'),
    ['2026-11-16']);
});

test('oculto: regras inválidas', () => {
  const ok = { freq: 'semanal', inicio: '2026-11-02' };
  const bad = [{ freq: 'diaria' }, { intervalo: 0 }, { intervalo: 1.5 }, { ajuste: 'meio' }, { freq: 'mensal', dia: 0 },
    { freq: 'mensal', dia: 32 }, { freq: 'mensal', dia: -2 }, { freq: 'mensal', ordinal: { n: 6, diaSemana: 1 } },
    { freq: 'mensal', ordinal: { n: 1, diaSemana: 7 } }, { freq: 'mensal', dia: 1, ordinal: { n: 1, diaSemana: 1 } }];
  for (const b of bad) assert.throws(() => g({ ...ok, ...b }, '2026-11-01', '2026-11-30'), RangeError, JSON.stringify(b));
});
