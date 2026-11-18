import test from 'node:test';
import assert from 'node:assert';
import { importarClientes } from './src/importar.js';

const H = 'nome;cpf;email;limite';

test('oculto: BOM, CRLF e limite no formato brasileiro', () => {
  const r = importarClientes(`﻿${H}\r\nAna;529.982.247-25;ana@x.com;1.234,56\r\nBia;11144477735;bia@y.com.br;1234,5\r\n`);
  assert.deepStrictEqual(r.erros, []);
  assert.deepStrictEqual(r.clientes.map((c) => [c.nome, c.cpf, c.limite]), [['Ana', '52998224725', 1234.56], ['Bia', '11144477735', 1234.5]]);
});

test('oculto: cabeçalho em outra ordem, caixa e espaços', () => {
  const r = importarClientes('Email; NOME ;Limite;CPF\nana@x.com;Ana;0;529.982.247-25\n');
  assert.deepStrictEqual(r.clientes, [{ nome: 'Ana', cpf: '52998224725', email: 'ana@x.com', limite: 0 }]);
});

test('oculto: coluna obrigatória faltando', () => {
  assert.throws(() => importarClientes('nome;cpf;email\nAna;52998224725;ana@x.com\n'));
});

test('oculto: aspas com separador, aspas escapadas e quebra de linha', () => {
  const r = importarClientes(`${H}\n"Silva; João ""JJ""\nFilho";529.982.247-25;  j@x.com  ;10\n`);
  assert.deepStrictEqual(r.erros, []);
  assert.strictEqual(r.clientes[0].nome, 'Silva; João "JJ"\nFilho');
  assert.strictEqual(r.clientes[0].email, 'j@x.com');
});

test('oculto: número da linha física, com linha em branco e registro de várias linhas', () => {
  const csv = [
    H, // 1
    'Ana;529.982.247-25;ana@x.com;10', // 2
    '', // 3
    '"Bia', // 4
    'Souza";111.444.777-35;bia-sem-arroba.com;10', // 5
    'Caio;123.456.789-00;caio@x.com;10', // 6
  ].join('\n');
  const r = importarClientes(csv);
  assert.deepStrictEqual(r.clientes.map((c) => c.nome), ['Ana']);
  assert.deepStrictEqual(r.erros.map((e) => [e.linha, e.campo]), [[4, 'email'], [6, 'cpf']]);
  assert.ok(r.erros.every((e) => typeof e.mensagem === 'string' && e.mensagem.length > 0));
});

test('oculto: um erro por campo e registro inválido fica de fora', () => {
  const r = importarClientes(`${H}\n;111;x@;-5\n`);
  assert.deepStrictEqual(r.clientes, []);
  assert.deepStrictEqual(r.erros.map((e) => e.campo).sort(), ['cpf', 'email', 'limite', 'nome']);
  assert.ok(r.erros.every((e) => e.linha === 2));
});

test('oculto: limites inválidos', () => {
  for (const lim of ['abc', '1.23,45', '12,345', '', '-1']) {
    const r = importarClientes(`${H}\nAna;529.982.247-25;ana@x.com;${lim}\n`);
    assert.deepStrictEqual(r.erros.map((e) => e.campo), ['limite'], `limite "${lim}"`);
  }
});

test('oculto: CPF duplicado', () => {
  const r = importarClientes(`${H}\nAna;529.982.247-25;ana@x.com;1\nAna2;52998224725;ana2@x.com;1\n`);
  assert.strictEqual(r.clientes.length, 1);
  assert.deepStrictEqual(r.erros.map((e) => [e.linha, e.campo]), [[3, 'cpf']]);
});
