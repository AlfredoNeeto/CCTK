import { reserve, release } from './inventory.js';

// Reserva todos os itens do carrinho; se algum faltar, desfaz o que já reservou.
export async function reserveCart(items) {
  const done = [];
  for (const { sku, qty } of items) {
    if (!(await reserve(sku, qty))) {
      for (const d of done) await release(d.sku, d.qty);
      return false;
    }
    done.push({ sku, qty });
  }
  return true;
}
