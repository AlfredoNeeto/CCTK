import { db } from './db.js';
import { refundAmount } from './pricing.js';
import { notifyCustomer } from './notify.js';

export async function createOrder(customerId, items) {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  return db.insert('orders', { customerId, items, total, status: 'aberto', createdAt: new Date() });
}

export async function cancelOrder(orderId, now = new Date()) {
  const order = await db.find('orders', orderId);
  if (!order || order.status === 'cancelado') return null;
  const refund = refundAmount(order, now);
  await db.update('orders', orderId, { status: 'cancelado', refund });
  if (refund > 0) await notifyCustomer(order.customerId, 'cancelamento', { refund });
  return refund;
}

export async function shipOrder(orderId) {
  await db.update('orders', orderId, { status: 'enviado' });
  const order = await db.find('orders', orderId);
  await notifyCustomer(order.customerId, 'envio', {});
}
