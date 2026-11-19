import test from 'node:test';
import assert from 'node:assert';
import { ordenarClientes } from '../src/clientes.js';

test('ordena por nome', () => {
  const r = ordenarClientes([{ nome: 'Carlos' }, { nome: 'Ana' }, { nome: 'Bruno' }]);
  assert.deepStrictEqual(r.map((c) => c.nome), ['Ana', 'Bruno', 'Carlos']);
});
