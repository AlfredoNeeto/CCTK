import fs from 'node:fs';
import { configure } from './config.js';
import { createOrder, cancelOrder, shipOrder } from './orders.js';

if (process.env.NODE_ENV === 'production') {
  configure(JSON.parse(fs.readFileSync(new URL('../deploy/production.json', import.meta.url), 'utf8')));
}

export { createOrder, cancelOrder, shipOrder };
