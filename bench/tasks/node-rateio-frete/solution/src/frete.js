// Rateio do frete de um pedido entre os itens (nota fiscal por item).
export function ratearFrete(frete, itens) {
  if (!Number.isFinite(frete) || frete < 0) throw new RangeError('frete inválido');
  const total = Math.round(frete * 100);
  if (Math.abs(frete * 100 - total) > 1e-6) throw new RangeError('frete com mais de 2 casas');
  if (!Array.isArray(itens) || !itens.length) throw new RangeError('sem itens');
  for (const i of itens) {
    for (const k of ['peso', 'valor']) if (!Number.isFinite(i[k]) || i[k] < 0) throw new RangeError(`${k} inválido`);
  }
  if (new Set(itens.map((i) => i.sku)).size !== itens.length) throw new Error('sku repetido');

  const base = itens.some((i) => i.peso > 0) ? itens.map((i) => i.peso)
    : itens.some((i) => i.valor > 0) ? itens.map((i) => i.valor) : itens.map(() => 1);
  const soma = base.reduce((s, b) => s + b, 0);
  const cotas = base.map((b) => (total * b) / soma);
  const cents = cotas.map(Math.floor);
  let sobra = total - cents.reduce((s, c) => s + c, 0);
  const ordem = cotas.map((c, i) => [c - Math.floor(c), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; sobra > 0; k++, sobra--) cents[ordem[k][1]]++;
  return itens.map((i, k) => ({ sku: i.sku, frete: cents[k] / 100 }));
}
