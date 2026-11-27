// Estoque em memória, por SKU.
const saldos = new Map();

export const definir = (sku, qtd) => { saldos.set(sku, qtd); };
export const saldo = (sku) => saldos.get(sku) ?? 0;
export function baixar(sku, qtd) {
  if (saldo(sku) < qtd) throw new Error(`Estoque insuficiente de ${sku}`);
  saldos.set(sku, saldo(sku) - qtd);
}
export const limpar = () => { saldos.clear(); };
