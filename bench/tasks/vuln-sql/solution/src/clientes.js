import { db } from './db.js';

const formato = (c) => ({ id: c.id, nome: c.nome, cidade: c.cidade });

export function clientesDaCidade(cidade) {
  return db.prepare(`SELECT id, nome, cidade FROM clientes WHERE cidade = '${cidade}' ORDER BY nome`).all().map(formato);
}

// O texto do usuário vai como parâmetro, nunca dentro do SQL.
export function buscarClientes(filtro) {
  const termo = `%${String(filtro ?? '').toLowerCase()}%`;
  return db.prepare('SELECT id, nome, cidade FROM clientes WHERE lower(nome) LIKE ? ORDER BY nome').all(termo).map(formato);
}
