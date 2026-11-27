import { produto } from './catalogo.js';
import { desconto as descontoDoCupom } from './cupons.js';
import { freteDoPedido } from './frete.js';
import { saldo, baixar } from './estoque.js';
import { enviar } from './notificacoes.js';
import { formatar } from './dinheiro.js';

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

export function fecharPedido(pedidoId, { cupom: codigo, uf } = {}) {
  const p = pedidos.get(pedidoId);
  if (!p) throw new Error(`Pedido ${pedidoId} não existe`);
  if (p.status !== 'aberto') throw new Error(`Pedido ${pedidoId} não está aberto`);
  const linhas = p.itens.map((i) => ({ ...produto(i.sku), qtd: i.qtd }));
  const subtotal = linhas.reduce((s, l) => s + l.preco * l.qtd, 0);
  const desconto = codigo ? descontoDoCupom(codigo, subtotal) : 0;
  const peso = linhas.reduce((s, l) => s + l.peso * l.qtd, 0);
  const frete = freteDoPedido(uf, peso, subtotal);
  // Tudo ou nada: confere o saldo de todos (somando SKUs repetidos) antes de baixar qualquer um.
  const porSku = new Map();
  for (const l of linhas) porSku.set(l.sku, (porSku.get(l.sku) || 0) + l.qtd);
  for (const [sku, qtd] of porSku) if (saldo(sku) < qtd) throw new Error(`Estoque insuficiente de ${sku}`);
  for (const [sku, qtd] of porSku) baixar(sku, qtd);
  p.totais = { subtotal, desconto, frete, total: subtotal - desconto + frete };
  p.status = 'fechado';
  enviar(p.clienteId, `Pedido ${p.id} fechado: ${formatar(p.totais.total)}`);
  return p.totais;
}
