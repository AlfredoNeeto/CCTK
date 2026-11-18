import test from 'node:test';
import assert from 'node:assert';
import { store } from '../src/store.js';
import { reserve, release, confirm } from '../src/inventory.js';
import { reserveCart } from '../src/cart.js';

test('reserva e confirma', async () => {
  store.seed('A', 5);
  assert.strictEqual(await reserve('A', 2), true);
  await confirm('A', 2);
  assert.deepStrictEqual(store.peek('A'), { sku: 'A', available: 3, reserved: 0 });
});

test('sem estoque', async () => {
  store.seed('B', 1);
  assert.strictEqual(await reserve('B', 2), false);
});

test('carrinho desfaz reservas se faltar item', async () => {
  store.seed('C', 5);
  store.seed('D', 0);
  assert.strictEqual(await reserveCart([{ sku: 'C', qty: 2 }, { sku: 'D', qty: 1 }]), false);
  assert.strictEqual(store.peek('C').available, 5);
});

test('release devolve', async () => {
  store.seed('E', 3);
  await reserve('E', 3);
  await release('E', 3);
  assert.deepStrictEqual(store.peek('E'), { sku: 'E', available: 3, reserved: 0 });
});
