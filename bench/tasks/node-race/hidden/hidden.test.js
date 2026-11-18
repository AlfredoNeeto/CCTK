import test from 'node:test';
import assert from 'node:assert';
import { store } from './src/store.js';
import { reserve, release, confirm } from './src/inventory.js';
import { reserveCart } from './src/cart.js';

test('oculto: reservas concorrentes não vendem além do estoque', async () => {
  for (let round = 0; round < 20; round++) {
    store.seed('X', 3);
    const ok = (await Promise.all(Array.from({ length: 10 }, () => reserve('X', 1)))).filter(Boolean).length;
    assert.strictEqual(ok, 3);
    assert.deepStrictEqual(store.peek('X'), { sku: 'X', available: 0, reserved: 3 });
  }
});

test('oculto: reserva, release e confirm concorrentes mantêm o total', async () => {
  for (let round = 0; round < 20; round++) {
    store.seed('Y', 10);
    await reserve('Y', 5);
    await Promise.all([release('Y', 2), reserve('Y', 1), release('Y', 1), reserve('Y', 3), confirm('Y', 1)]);
    const r = store.peek('Y');
    assert.strictEqual(r.available + r.reserved, 9); // 10 - 1 confirmado
  }
});

test('oculto: carrinhos concorrentes', async () => {
  for (let round = 0; round < 20; round++) {
    store.seed('P', 1);
    store.seed('Q', 1);
    const res = await Promise.all([
      reserveCart([{ sku: 'P', qty: 1 }, { sku: 'Q', qty: 1 }]),
      reserveCart([{ sku: 'Q', qty: 1 }, { sku: 'P', qty: 1 }]),
    ]);
    const p = store.peek('P');
    const q = store.peek('Q');
    assert.ok(res.filter(Boolean).length <= 1);
    assert.strictEqual(p.available + p.reserved, 1);
    assert.strictEqual(q.available + q.reserved, 1);
  }
});

test('oculto: falha do banco não trava o SKU', async () => {
  store.seed('Z', 5);
  store.failNextWrite();
  await assert.rejects(reserve('Z', 1));
  const r = await Promise.race([reserve('Z', 1), new Promise((res) => setTimeout(() => res('travou'), 1000))]);
  assert.strictEqual(r, true);
  assert.strictEqual(store.peek('Z').available, 4);
});

test('oculto: SKUs diferentes não se bloqueiam', async () => {
  store.seed('M', 1);
  store.seed('N', 1);
  const [a, b] = await Promise.all([reserve('M', 1), reserve('N', 1)]);
  assert.ok(a && b);
});
