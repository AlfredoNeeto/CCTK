import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as pedidos from '../src/pedidos.js';

beforeEach(() => pedidos.reiniciar());

test('lista na ordem de criação', () => {
  assert.deepEqual(pedidos.listar().map((p) => p.cliente), ['Ana', 'Bruno', 'Carla']);
});

test('busca por id', () => {
  assert.equal(pedidos.buscar(2).cliente, 'Bruno');
  assert.ok(!pedidos.buscar(99));
});

test('criar valida cliente e total', () => {
  assert.equal(pedidos.criar({ cliente: 'Davi', total: 10 }).id, 4);
  assert.throws(() => pedidos.criar({ cliente: '', total: 10 }));
  assert.throws(() => pedidos.criar({ cliente: 'Davi', total: 0 }));
});
