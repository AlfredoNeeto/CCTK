import { Invalido } from './erros.js';

// Pedidos em memória, na ordem de criação.
let pedidos = [];
let seq = 0;

export function reiniciar() {
  pedidos = [];
  seq = 0;
  for (const [cliente, total] of [['Ana', 120.5], ['Bruno', 89.9], ['Carla', 310]]) criar({ cliente, total });
}

export function criar({ cliente, total }) {
  if (typeof cliente !== 'string' || !cliente.trim()) throw new Invalido('cliente é obrigatório');
  if (typeof total !== 'number' || !(total > 0)) throw new Invalido('total deve ser maior que zero');
  const p = { id: ++seq, cliente: cliente.trim(), total, status: 'aberto' };
  pedidos.push(p);
  return p;
}

export const listar = () => [...pedidos];

// null quando não existe.
export const buscar = (id) => pedidos.find((p) => p.id === id) ?? null;

reiniciar();
