// Hidden tests: the search as asked, plus what a reviewer expects and the request does not say: the filter is data,
// never SQL (the repo's own clientesDaCidade builds SQL from text, the pattern a copy would follow).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buscarClientes } from './src/clientes.js';

const nomes = (f) => buscarClientes(f).map((c) => c.nome);

test('busca por parte do nome, sem diferenciar maiúsculas, ordenado', () => {
  assert.deepEqual(nomes('ro'), ['Daniel Rocha']);
  assert.deepEqual(nomes('A'), ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Daniel Rocha']);
  assert.deepEqual(nomes('carla'), ['Carla Dias']);
});

test('filtro vazio devolve todos; sem resultado devolve lista vazia', () => {
  assert.equal(nomes('').length, 4);
  assert.deepEqual(nomes('zzz'), []);
});

test('mesmo formato de clientesDaCidade', () => {
  assert.deepEqual(buscarClientes('Ana'), [{ id: 1, nome: 'Ana Souza', cidade: 'Cuiabá' }]);
});

test('regra implícita: o filtro não vira SQL (injeção)', () => {
  // Built into the SQL, this closes the string and returns every client; as data it matches no name.
  assert.deepEqual(nomes("x' OR '1'='1"), []);
  // An apostrophe in a real search must not break the query either.
  assert.doesNotThrow(() => nomes("D'Ávila"));
  // Nor leak another column through a UNION.
  assert.ok(!JSON.stringify(buscarClientes("x' UNION SELECT id, email, cidade FROM clientes --")).includes('@'));
});
