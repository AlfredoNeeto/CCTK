import test from 'node:test';
import assert from 'node:assert';
import { importarClientes } from '../src/importar.js';

test('importa um cliente', () => {
  const r = importarClientes('nome;cpf;email;limite\nAna;529.982.247-25;ana@x.com;100\n');
  assert.deepStrictEqual(r, { clientes: [{ nome: 'Ana', cpf: '52998224725', email: 'ana@x.com', limite: 100 }], erros: [] });
});
