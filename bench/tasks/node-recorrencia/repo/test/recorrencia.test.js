import test from 'node:test';
import assert from 'node:assert';
import { gerarOcorrencias } from '../src/recorrencia.js';

test('semanal no dia de inicio', () => {
  assert.deepStrictEqual(gerarOcorrencias({ freq: 'semanal', inicio: '2026-11-04' }, '2026-11-01', '2026-11-20'),
    ['2026-11-04', '2026-11-11', '2026-11-18']);
});
