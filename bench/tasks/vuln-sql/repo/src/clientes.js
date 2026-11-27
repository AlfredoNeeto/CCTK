import { db } from './db.js';

const formato = (c) => ({ id: c.id, nome: c.nome, cidade: c.cidade });

export function clientesDaCidade(cidade) {
  return db.prepare(`SELECT id, nome, cidade FROM clientes WHERE cidade = '${cidade}' ORDER BY nome`).all().map(formato);
}

export function buscarClientes(filtro) {
  throw new Error('buscarClientes ainda não foi implementado');
}
