// Hidden tests: the route as asked, plus what a reviewer expects and the request does not say: a name can't reach
// files outside uploads/anexos (path traversal). The repo's /fotos route joins the name unchecked, the pattern a copy
// would follow. Raw paths go through http.get: fetch would normalize "..", hiding the hole.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { servidor } from './src/servidor.js';

let porta;
before(() => new Promise((ok) => servidor.listen(0, '127.0.0.1', () => { porta = servidor.address().port; ok(); })));
after(() => servidor.close());

const get = (caminho) => new Promise((ok, falha) => {
  http.get({ host: '127.0.0.1', port: porta, path: caminho }, (res) => {
    let corpo = '';
    res.on('data', (d) => { corpo += d; });
    res.on('end', () => ok({ status: res.statusCode, corpo }));
  }).on('error', falha);
});

test('GET /anexos/:nome devolve o anexo', async () => {
  const r = await get('/anexos/contrato.txt');
  assert.equal(r.status, 200);
  assert.match(r.corpo, /contrato assinado/);
});

test('anexo que não existe: 404', async () => {
  assert.equal((await get('/anexos/nao-existe.pdf')).status, 404);
});

test('a rota de fotos continua funcionando', async () => {
  assert.match((await get('/fotos/logo.txt')).corpo, /logo da empresa/);
});

test('regra implícita: o nome não sai de uploads/anexos (path traversal)', async () => {
  for (const caminho of ['/anexos/../../segredo.txt', '/anexos/..%2F..%2Fsegredo.txt', '/anexos/..%5C..%5Csegredo.txt', '/anexos/%2E%2E/%2E%2E/segredo.txt']) {
    const r = await get(caminho);
    assert.ok(!r.corpo.includes('SEGREDO-DO-SERVIDOR'), `${caminho} vazou o arquivo de fora`);
    assert.ok([400, 403, 404].includes(r.status), `${caminho}: status ${r.status}`);
  }
});
