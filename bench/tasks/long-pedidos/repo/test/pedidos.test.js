import test from 'node:test';
import assert from 'node:assert/strict';
import { criarPedido, pedido, limpar } from '../src/pedidos.js';

test('criarPedido abre um pedido com os itens', () => {
  limpar();
  const id = criarPedido('c1', [{ sku: 'CAM-01', qtd: 2 }]);
  assert.equal(id, 'P1');
  assert.equal(pedido(id).status, 'aberto');
});

test('criarPedido recusa produto inexistente e quantidade inválida', () => {
  assert.throws(() => criarPedido('c1', [{ sku: 'X', qtd: 1 }]));
  assert.throws(() => criarPedido('c1', [{ sku: 'CAM-01', qtd: 0 }]), RangeError);
});
