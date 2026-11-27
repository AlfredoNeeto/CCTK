// Catálogo: preço em centavos, peso em gramas.
const produtos = new Map([
  ['CAM-01', { nome: 'Camiseta', preco: 4990, peso: 200 }],
  ['CAL-02', { nome: 'Calça', preco: 12990, peso: 600 }],
  ['TEN-03', { nome: 'Tênis', preco: 29990, peso: 1100 }],
  ['MEI-04', { nome: 'Meia', preco: 1990, peso: 80 }],
]);

export function produto(sku) {
  const p = produtos.get(sku);
  if (!p) throw new Error(`Produto ${sku} não existe`);
  return { sku, ...p };
}
