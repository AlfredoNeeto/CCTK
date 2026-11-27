import { Invalido, NaoEncontrado, Conflito } from './erros.js';

// Pedidos em memória, por id; o Map guarda a ordem de criação.
let pedidos = new Map();
let seq = 0;

export function reiniciar() {
  pedidos = new Map();
  seq = 0;
  for (const [cliente, total] of [['Ana', 120.5], ['Bruno', 89.9], ['Carla', 310]]) criar({ cliente, total });
}

export function criar({ cliente, total }) {
  if (typeof cliente !== 'string' || !cliente.trim()) throw new Invalido('cliente é obrigatório');
  if (typeof total !== 'number' || !(total > 0)) throw new Invalido('total deve ser maior que zero');
  const p = { id: ++seq, cliente: cliente.trim(), total, status: 'aberto' };
  pedidos.set(p.id, p);
  return p;
}

export const listar = () => [...pedidos.values()];

// null quando não existe (as rotas comparam com null).
export const buscar = (id) => pedidos.get(id) ?? null;

export function cancelar(id) {
  const p = buscar(id);
  if (p === null) throw new NaoEncontrado(`pedido ${id} não existe`);
  if (p.status === 'cancelado') throw new Conflito(`pedido ${id} já está cancelado`);
  p.status = 'cancelado';
  return p;
}

reiniciar();
