import { sendMail } from './mailer.js';
import { db } from './db.js';
import { getConfig } from './config.js';

const TEMPLATES = {
  envio: 'Seu pedido foi enviado!',
  cancelamento: 'Seu pedido foi cancelado. Reembolso: R$ {refund}',
};

export async function notifyCustomer(customerId, kind, data) {
  if (!getConfig().notifications.includes(kind)) return;
  const customer = await db.find('customers', customerId);
  if (!customer?.email || customer.optOut) return;
  const body = TEMPLATES[kind].replace(/\{(\w+)\}/g, (_, k) => data[k]);
  await sendMail(customer.email, body);
}
