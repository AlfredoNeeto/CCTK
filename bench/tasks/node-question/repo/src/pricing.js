const DAY = 24 * 60 * 60 * 1000;
export const CANCEL_FEE = 0.1;
export const FREE_CANCEL_DAYS = 7;

export function shipping(total) {
  return total >= 200 ? 0 : 19.9;
}

// Reembolso: integral até FREE_CANCEL_DAYS dias da compra; depois, desconta a taxa de cancelamento.
// Pedido já enviado não tem reembolso.
export function refundAmount(order, now) {
  if (order.status === 'enviado') return 0;
  const days = (now - order.createdAt) / DAY;
  const fee = days > FREE_CANCEL_DAYS ? order.total * CANCEL_FEE : 0;
  return Math.round((order.total - fee) * 100) / 100;
}
