import test from 'node:test';
import assert from 'node:assert/strict';
import { clientesDaCidade } from '../src/clientes.js';

test('clientes de uma cidade, por nome', () => {
  assert.deepEqual(clientesDaCidade('Cuiabá').map((c) => c.nome), ['Ana Souza', 'Carla Dias']);
});
