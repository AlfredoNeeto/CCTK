import { store } from './store.js';

// Reserva qty unidades do SKU para um carrinho. Retorna false se não houver estoque.
export async function reserve(sku, qty) {
  if (!Number.isInteger(qty) || qty <= 0) throw new RangeError('quantidade inválida');
  const item = await store.get(sku);
  if (!item || item.available < qty) return false;
  await store.set(sku, { ...item, available: item.available - qty, reserved: item.reserved + qty });
  return true;
}

// Devolve ao estoque unidades reservadas (carrinho abandonado).
export async function release(sku, qty) {
  const item = await store.get(sku);
  if (!item) return;
  await store.set(sku, { ...item, available: item.available + qty, reserved: item.reserved - qty });
}

// Confirma a venda das unidades reservadas.
export async function confirm(sku, qty) {
  const item = await store.get(sku);
  if (!item || item.reserved < qty) throw new Error('reserva insuficiente');
  await store.set(sku, { ...item, reserved: item.reserved - qty });
}
