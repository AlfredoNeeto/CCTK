// Regras de desconto da loja:
// - 5% para pedidos a partir de R$ 100,00; 10% a partir de R$ 500,00; 15% a partir de R$ 1.000,00.
// - O cupom (valor fixo em reais) é abatido depois do percentual.
// - O valor final nunca é negativo.
// - O resultado é arredondado em centavos.
export function applyDiscount(total, coupon = 0) {
  let pct = 0;
  if (total > 1000) pct = 0.15;
  else if (total > 500) pct = 0.1;
  else if (total > 100) pct = 0.05;
  const result = total * (1 - pct) - coupon;
  return Math.round(result * 100) / 100;
}
