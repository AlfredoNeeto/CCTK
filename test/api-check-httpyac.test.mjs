// api-check.js with the real httpyac (.specs/features/api-http/checks.md, second proof of C1).
// Outside `npm test`: the first run downloads httpyac through npx.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../lib/toolkit.mjs';

const API_CHECK = path.join(REPO_ROOT, 'plugins', 'cctk', 'hooks', 'api-check.js');
const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

// /pedidos/1 answers 200 with { id: 1 }; everything else 404. The .http uses {{baseUrl}} from http-client.env.json.
function project(port, http) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-httpyac-'));
  fs.writeFileSync(path.join(dir, 'server.js'),
    "require('http').createServer((q, s) => { s.setHeader('content-type', 'application/json');" +
    " if (q.url === '/pedidos/1') { s.end(JSON.stringify({ id: 1 })); } else { s.statusCode = 404; s.end('{}'); } })" +
    `.listen(${port}, '127.0.0.1');\n`);
  fs.mkdirSync(path.join(dir, 'http'));
  fs.writeFileSync(path.join(dir, 'http', 'http-client.env.json'), JSON.stringify({ dev: { baseUrl: `http://127.0.0.1:${port}` } }));
  fs.writeFileSync(path.join(dir, 'http', 'pedidos.http'), http);
  return dir;
}
const run = (dir, port) => spawnSync(process.execPath, [API_CHECK, '--start', 'node server.js', '--url', `http://127.0.0.1:${port}/pedidos/1`],
  { cwd: dir, encoding: 'utf8', timeout: 170000 });

test('C1 real httpyac: a matching contract passes, a broken one fails', async () => {
  let port = await freePort();
  const ok = run(project(port, 'GET {{baseUrl}}/pedidos/1\n\n?? status == 200\n?? js response.parsedBody.id == 1\n'), port);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  port = await freePort();
  // The contract says 404 for this route, and the API answers 200: the check must fail.
  const bad = run(project(port, 'GET {{baseUrl}}/pedidos/1\n\n?? status == 404\n'), port);
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  assert.match(bad.stderr, /os testes HTTP falharam/);
});
