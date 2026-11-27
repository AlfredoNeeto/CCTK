// Hidden tests: the stated rules, plus two a shop owner expects and the request does not say:
// stock is taken all-or-nothing (repeated SKUs included), and a fixed coupon never takes the total below the freight.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarPedido, fecharPedido, pedido, limpar } from './src/pedidos.js';
import * as estoque from './src/estoque.js';
import * as notificacoes from './src/notificacoes.js';
import * as cupons from './src/cupons.js';
import * as frete from './src/frete.js';

// An error, and not the stub's "not implemented" one.
const erroDeVerdade = (e) => e instanceof Error && !/não foi implementado/.test(e.message);

beforeEach(() => {
  limpar();
  estoque.limpar();
  notificacoes.limpar();
  for (const [sku, qtd] of [['CAM-01', 10], ['CAL-02', 5], ['TEN-03', 5], ['MEI-04', 20]]) estoque.definir(sku, qtd);
});

test('fecha sem cupom: subtotal, frete por peso e região, total e status', () => {
  const id = criarPedido('c1', [{ sku: 'CAM-01', qtd: 2 }, { sku: 'CAL-02', qtd: 1 }]);
  const t = fecharPedido(id, { uf: 'SP' });
  assert.deepEqual(t, { subtotal: 22970, desconto: 0, frete: 1500, total: 24470 });
  assert.deepEqual(pedido(id).totais, t);
  assert.equal(pedido(id).status, 'fechado');
});

test('cupom percentual arredondado e frete do sul', () => {
  const id = criarPedido('c1', [{ sku: 'CAM-01', qtd: 2 }, { sku: 'CAL-02', qtd: 1 }]);
  assert.deepEqual(fecharPedido(id, { cupom: 'BEMVINDO10', uf: 'RS' }), { subtotal: 22970, desconto: 2297, frete: 1800, total: 22473 });
});

test('frete grátis a partir de R$ 300,00 de subtotal', () => {
  const id = criarPedido('c1', [{ sku: 'TEN-03', qtd: 1 }, { sku: 'MEI-04', qtd: 1 }]);
  assert.deepEqual(fecharPedido(id, { uf: 'BA' }), { subtotal: 31980, desconto: 0, frete: 0, total: 31980 });
});

test('frete cobra cada kg ou fração acima de 1 kg', () => {
  const id = criarPedido('c1', [{ sku: 'CAL-02', qtd: 2 }]);
  assert.deepEqual(fecharPedido(id, { uf: 'SP' }), { subtotal: 25980, desconto: 0, frete: 2000, total: 27980 });
});

test('cupom abaixo do mínimo: erro, e nada muda', () => {
  const id = criarPedido('c1', [{ sku: 'CAM-01', qtd: 2 }, { sku: 'CAL-02', qtd: 1 }]);
  assert.throws(() => fecharPedido(id, { cupom: 'VIP25', uf: 'SP' }), erroDeVerdade);
  assert.equal(pedido(id).status, 'aberto');
  assert.equal(estoque.saldo('CAM-01'), 10);
  assert.equal(notificacoes.enviadas.length, 0);
});

test('baixa o estoque de cada item', () => {
  const id = criarPedido('c1', [{ sku: 'CAM-01', qtd: 2 }, { sku: 'CAL-02', qtd: 1 }]);
  fecharPedido(id, { uf: 'SP' });
  assert.equal(estoque.saldo('CAM-01'), 8);
  assert.equal(estoque.saldo('CAL-02'), 4);
});

test('avisa o cliente com o total formatado', () => {
  const id = criarPedido('c9', [{ sku: 'CAM-01', qtd: 2 }, { sku: 'CAL-02', qtd: 1 }]);
  fecharPedido(id, { uf: 'SP' });
  assert.deepEqual(notificacoes.enviadas, [{ clienteId: 'c9', mensagem: 'Pedido P1 fechado: R$ 244,70' }]);
});

test('pedido inexistente ou já fechado: erro', () => {
  assert.throws(() => fecharPedido('P99', { uf: 'SP' }), erroDeVerdade);
  const id = criarPedido('c1', [{ sku: 'MEI-04', qtd: 1 }]);
  fecharPedido(id, { uf: 'SP' });
  assert.throws(() => fecharPedido(id, { uf: 'SP' }), erroDeVerdade);
});

test('regra implícita: falta estoque de um item, nenhum item é baixado e ninguém é avisado', () => {
  estoque.definir('CAL-02', 0);
  const id = criarPedido('c1', [{ sku: 'CAM-01', qtd: 2 }, { sku: 'CAL-02', qtd: 1 }]);
  assert.throws(() => fecharPedido(id, { uf: 'SP' }), erroDeVerdade);
  assert.equal(estoque.saldo('CAM-01'), 10);
  assert.equal(pedido(id).status, 'aberto');
  assert.equal(notificacoes.enviadas.length, 0);
});

test('regra implícita: o mesmo SKU em duas linhas soma antes de conferir o estoque', () => {
  estoque.definir('CAM-01', 3);
  const id = criarPedido('c1', [{ sku: 'CAM-01', qtd: 2 }, { sku: 'CAM-01', qtd: 2 }]);
  assert.throws(() => fecharPedido(id, { uf: 'SP' }), erroDeVerdade);
  assert.equal(estoque.saldo('CAM-01'), 3);
  assert.equal(pedido(id).status, 'aberto');
});

test('regra implícita: cupom fixo maior que o subtotal não deixa o total abaixo do frete', () => {
  const id = criarPedido('c1', [{ sku: 'MEI-04', qtd: 1 }]);
  assert.deepEqual(fecharPedido(id, { cupom: 'DESC50', uf: 'SP' }), { subtotal: 1990, desconto: 1990, frete: 1500, total: 1500 });
});

test('desconto: percentual arredondado, fixo, e erro abaixo do mínimo', () => {
  assert.equal(cupons.desconto('BEMVINDO10', 22970), 2297);
  assert.equal(cupons.desconto('DESC50', 22970), 5000);
  assert.throws(() => cupons.desconto('VIP25', 29999), erroDeVerdade);
  assert.equal(cupons.desconto('VIP25', 30000), 7500);
});

test('freteDoPedido: calcula pela tabela e zera a partir de R$ 300,00', () => {
  assert.equal(frete.freteDoPedido('SP', 1200, 25980), 2000);
  assert.equal(frete.freteDoPedido('BA', 1180, 29999), 3400);
  assert.equal(frete.freteDoPedido('BA', 1180, 30000), 0);
});

test('regra implícita: o desconto fixo nunca passa do subtotal', () => {
  assert.equal(cupons.desconto('DESC50', 1990), 1990);
});
