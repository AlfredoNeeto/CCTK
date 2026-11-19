// Parcelamento de compras.
export function dividirEmParcelas(total, n) {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('número de parcelas inválido');
  if (!Number.isFinite(total) || total < 0) throw new RangeError('total inválido');
  const centavos = Math.round(total * 100);
  const base = Math.floor(centavos / n);
  const resto = centavos - base * n; // os centavos que sobram vão para as primeiras parcelas
  return Array.from({ length: n }, (_, i) => (base + (i < resto ? 1 : 0)) / 100);
}
