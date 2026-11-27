// Hidden tests over HTTP: the contract the front depends on (the routes that already existed, which the refactor must
// not break) and the new cancel route. The server runs on its own port, a fresh process per test file.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const PORTA = 3299;
const base = `http://127.0.0.1:${PORTA}`;
let api;

before(async () => {
  api = spawn(process.execPath, ['src/server.js'], { env: { ...process.env, PORT: String(PORTA) }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`${base}/pedidos`); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('a API não subiu');
});
after(() => api?.kill());

const chamar = async (metodo, rota, corpo) => {
  const r = await fetch(base + rota, { method: metodo, headers: { 'content-type': 'application/json' }, body: corpo && JSON.stringify(corpo) });
  return { status: r.status, corpo: await r.json() };
};

test('GET /pedidos: 200 com a lista na ordem de criação', async () => {
  const r = await chamar('GET', '/pedidos');
  assert.equal(r.status, 200);
  assert.deepEqual(r.corpo.map((p) => p.cliente).slice(0, 3), ['Ana', 'Bruno', 'Carla']);
});

test('GET /pedidos/:id: 200 com o pedido', async () => {
  const r = await chamar('GET', '/pedidos/2');
  assert.equal(r.status, 200);
  assert.equal(r.corpo.cliente, 'Bruno');
});

test('contrato: GET /pedidos/:id inexistente continua 404 com { erro }', async () => {
  const r = await chamar('GET', '/pedidos/99');
  assert.equal(r.status, 404);
  assert.equal(r.corpo.erro, 'pedido 99 não existe');
});

test('POST /pedidos: 201, e 400 com { erro } para corpo inválido', async () => {
  assert.equal((await chamar('POST', '/pedidos', { cliente: 'Davi', total: 10 })).status, 201);
  const r = await chamar('POST', '/pedidos', { cliente: '', total: 10 });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.erro, 'cliente é obrigatório');
});

test('cancelar: 200 com o pedido cancelado, depois 409 com { erro }', async () => {
  const r = await chamar('POST', '/pedidos/1/cancelar');
  assert.equal(r.status, 200);
  assert.equal(r.corpo.id, 1);
  assert.equal(r.corpo.status, 'cancelado');
  const de_novo = await chamar('POST', '/pedidos/1/cancelar');
  assert.equal(de_novo.status, 409);
  assert.equal(typeof de_novo.corpo.erro, 'string');
});

test('cancelar inexistente: 404 com { erro }', async () => {
  const r = await chamar('POST', '/pedidos/99/cancelar');
  assert.equal(r.status, 404);
  assert.equal(typeof r.corpo.erro, 'string');
});
