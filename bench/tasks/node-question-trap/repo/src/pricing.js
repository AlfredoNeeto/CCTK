import { getConfig } from './config.js';

const DAY = 24 * 60 * 60 * 1000;

export function shipping(total) {
  return total >= 200 ? 0 : 19.9;
}

// Reembolso: integral até 7 dias da compra; depois, desconta a taxa de cancelamento de 10%.
// Pedido já enviado não tem reembolso.
export function refundAmount(order, now) {
  const { cancelFee, freeCancelDays } = getConfig();
  if (order.status === 'enviado') return 0;
  const days = (now - order.createdAt) / DAY;
  const fee = days > freeCancelDays ? order.total * cancelFee : 0;
  return Math.round((order.total - fee) * 100) / 100;
}
