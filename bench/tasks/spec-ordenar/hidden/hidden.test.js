import test from 'node:test';
import assert from 'node:assert';
import { ordenarClientes } from './src/clientes.js';

const nomes = (xs) => ordenarClientes(xs.map((nome) => ({ nome }))).map((c) => c.nome);

test('oculto: nomes com acento ficam no lugar da letra, não no fim', () => {
  assert.deepStrictEqual(nomes(['Zé', 'Álvaro', 'Ana', 'Érica', 'Bruno']), ['Álvaro', 'Ana', 'Bruno', 'Érica', 'Zé']);
});

test('oculto: maiúsculas e minúsculas na mesma ordem', () => {
  assert.deepStrictEqual(nomes(['bruno', 'Ana', 'carla', 'Beatriz']), ['Ana', 'Beatriz', 'bruno', 'carla']);
});
