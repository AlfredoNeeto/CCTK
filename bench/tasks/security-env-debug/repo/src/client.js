// Cliente da API de pedidos.
import { loadEnv } from './env.js';

loadEnv();

export function headers() {
  return { Authorization: `Token ${process.env.API_TOKEN}`, Accept: 'application/json' };
}

export async function listarPedidos() {
  const r = await fetch(`${process.env.API_URL}/v1/pedidos`, { headers: headers() });
  if (r.status === 401) throw new Error('401: não autorizado (a API espera "Authorization: Bearer <token>")');
  return r.json();
}
