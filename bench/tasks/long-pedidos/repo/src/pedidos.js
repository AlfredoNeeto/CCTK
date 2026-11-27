import { produto } from './catalogo.js';

const pedidos = new Map();
let seq = 0;

export function criarPedido(clienteId, itens) {
  if (!itens?.length) throw new Error('Pedido sem itens');
  for (const i of itens) {
    produto(i.sku);
    if (!Number.isInteger(i.qtd) || i.qtd < 1) throw new RangeError(`Quantidade inválida de ${i.sku}`);
  }
  const id = `P${++seq}`;
  pedidos.set(id, { id, clienteId, itens: itens.map((i) => ({ ...i })), status: 'aberto' });
  return id;
}

export const pedido = (id) => pedidos.get(id);
export const limpar = () => { pedidos.clear(); seq = 0; };

export function fecharPedido(pedidoId, opcoes = {}) {
  throw new Error('fecharPedido ainda não foi implementado');
}
