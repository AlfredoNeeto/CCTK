import { store } from './store.js';

// One promise chain per SKU: read-modify-write on the same SKU never interleaves.
const locks = new Map();
function withLock(sku, fn) {
  const run = (locks.get(sku) ?? Promise.resolve()).then(fn, fn);
  const tail = run.catch(() => {});
  locks.set(sku, tail);
  tail.then(() => { if (locks.get(sku) === tail) locks.delete(sku); });
  return run;
}

export function reserve(sku, qty) {
  if (!Number.isInteger(qty) || qty <= 0) return Promise.reject(new RangeError('quantidade inválida'));
  return withLock(sku, async () => {
    const item = await store.get(sku);
    if (!item || item.available < qty) return false;
    await store.set(sku, { ...item, available: item.available - qty, reserved: item.reserved + qty });
    return true;
  });
}

export function release(sku, qty) {
  return withLock(sku, async () => {
    const item = await store.get(sku);
    if (!item) return;
    const n = Math.min(qty, item.reserved);
    await store.set(sku, { ...item, available: item.available + n, reserved: item.reserved - n });
  });
}

export function confirm(sku, qty) {
  return withLock(sku, async () => {
    const item = await store.get(sku);
    if (!item || item.reserved < qty) throw new Error('reserva insuficiente');
    await store.set(sku, { ...item, reserved: item.reserved - qty });
  });
}
