// api-check.js (.specs/features/api-http/checks.md), one test per check, named C<n>.
// A sample API (node:http) on a free port; the httpyac runner is swapped for a fake one (CCTK_HTTP_RUNNER) so npm test
// needs no network. The real httpyac is in api-check-httpyac.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { REPO_ROOT } from '../lib/toolkit.mjs';

const HOOKS = path.join(REPO_ROOT, 'plugins', 'cctk', 'hooks');
const API_CHECK = path.join(HOOKS, 'api-check.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const portOpen = (port) => new Promise((resolve) => {
  const c = net.connect(port, '127.0.0.1');
  c.on('connect', () => { c.destroy(); resolve(true); });
  c.on('error', () => resolve(false));
});
async function waitPort(port, open, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if ((await portOpen(port)) === open) return true; await sleep(200); }
  return false;
}

// A project with an API on `port`, one .http file and a fake runner. The runner calls the API (so it proves the API
// is up), prints a line, sleeps FAKE_SLEEP ms and exits FAKE_EXIT.
function project(port, { http = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-check-'));
  fs.writeFileSync(path.join(dir, 'server.js'),
    "console.log('api: iniciando');\n" +
    "require('http').createServer((q, s) => { s.statusCode = q.url === '/saude' ? 200 : 404; s.end('{}'); })" +
    `.listen(${port}, '127.0.0.1', () => console.log('api: no ar'));\n`);
  fs.writeFileSync(path.join(dir, 'runner.js'),
    `fetch('http://127.0.0.1:${port}/saude').then(async (r) => {\n` +
    "  console.log(`corretor: ${process.argv.slice(2).join(' ')} -> ${r.status}`);\n" +
    "  await new Promise((ok) => setTimeout(ok, Number(process.env.FAKE_SLEEP || 0)));\n" +
    "  process.exit(Number(process.env.FAKE_EXIT || 0));\n" +
    "}, () => { console.log('corretor: API fora do ar'); process.exit(3); });\n");
  if (http) {
    fs.mkdirSync(path.join(dir, 'http'));
    fs.writeFileSync(path.join(dir, 'http', 'saude.http'), `GET http://127.0.0.1:${port}/saude\n\n?? status == 200\n`);
  }
  return dir;
}
const args = (port, extra = []) => ['--start', 'node server.js', '--url', `http://127.0.0.1:${port}/saude`, ...extra];
const run = (dir, a, env = {}) => spawnSync(process.execPath, [API_CHECK, ...a], {
  cwd: dir, encoding: 'utf8', timeout: 60000, env: { ...process.env, CCTK_HTTP_RUNNER: 'node runner.js', ...env },
});

test('C1 with the API up, the runner gets the .http files and a passing runner passes', async () => {
  const port = await freePort();
  const r = run(project(port), args(port));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /passaram/);
});

test('C2 an API that never answers fails within the wait and shows its last lines', async () => {
  const port = await freePort();
  const dir = project(port);
  fs.writeFileSync(path.join(dir, 'server.js'), "console.log('api: travou antes de abrir a porta'); setInterval(() => {}, 1000);\n");
  const t0 = Date.now();
  const r = run(dir, args(port, ['--wait', '2']));
  assert.equal(r.status, 1);
  assert.ok(Date.now() - t0 < 10000, `took ${Date.now() - t0} ms`);
  assert.match(r.stderr, /não respondeu/);
  assert.match(r.stderr, /api: travou antes de abrir a porta/);
});

test('C3 a failing runner fails the check and its output is shown', async () => {
  const port = await freePort();
  const r = run(project(port), args(port), { FAKE_EXIT: '1' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /os testes HTTP falharam/);
  assert.match(r.stderr, /corretor: .*saude\.http.* -> 200/);
});

test('C4 the API is down after a pass, after a fail, and after the check-gate kills the whole tree', async () => {
  const port = await freePort();
  const dir = project(port);
  run(dir, args(port));
  assert.ok(await waitPort(port, false), 'still up after a pass');
  run(dir, args(port), { FAKE_EXIT: '1' });
  assert.ok(await waitPort(port, false), 'still up after a fail');
  // As the check-gate does at its time limit: the shell running the check, killed with its whole tree.
  const cmd = `"${process.execPath}" "${API_CHECK}" ${args(port).map((a) => `"${a}"`).join(' ')}`;
  const win = process.platform === 'win32';
  const child = spawn(cmd, { cwd: dir, shell: true, windowsHide: true, detached: !win,
    env: { ...process.env, CCTK_HTTP_RUNNER: 'node runner.js', FAKE_SLEEP: '30000' } });
  assert.ok(await waitPort(port, true), 'API never came up');
  if (win) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
  else process.kill(-child.pid, 'SIGKILL');
  assert.ok(await waitPort(port, false), 'API left running after the tree was killed');
});

test('C11 something already answering at --url: skips the HTTP tests without failing, says so, never starts this API', async () => {
  const port = await freePort();
  const dir = project(port);
  // Its own process: run() blocks this one (spawnSync), so a server here could not answer.
  const intruso = spawn(process.execPath, ['-e', `require('http').createServer((q, s) => s.end('{}')).listen(${port}, '127.0.0.1')`]);
  assert.ok(await waitPort(port, true), 'intruder never came up');
  try {
    fs.writeFileSync(path.join(dir, 'server.js'), "require('fs').writeFileSync('subiu.txt', 'sim');\n");
    const r = run(dir, args(port));
    assert.equal(r.status, 0, 'fail-open: a running dev server must not block the check');
    assert.match(r.stdout, /pulei os testes HTTP: já tem um servidor respondendo/);
    assert.ok(!fs.existsSync(path.join(dir, 'subiu.txt')), 'the API was started anyway');
    assert.doesNotMatch(r.stdout, /corretor:/, 'the runner tested the other server');
  } finally { intruso.kill(); }
});

test('C12 a runner that hangs is killed at --limit, and the API goes down with it', async () => {
  const port = await freePort();
  const t0 = Date.now();
  const r = run(project(port), args(port, ['--limit', '4']), { FAKE_SLEEP: '60000' });
  assert.equal(r.status, 1);
  assert.ok(Date.now() - t0 < 20000, `took ${Date.now() - t0} ms`);
  assert.match(r.stderr, /interrompido/);
  assert.ok(await waitPort(port, false), 'API left running');
});

test('C5 no .http file: passes, says so, and never starts the API', async () => {
  const port = await freePort();
  const dir = project(port, { http: false });
  fs.writeFileSync(path.join(dir, 'server.js'), "require('fs').writeFileSync('subiu.txt', 'sim');\n");
  const r = run(dir, args(port));
  assert.equal(r.status, 0);
  assert.match(r.stdout, /não há teste HTTP/);
  assert.ok(!fs.existsSync(path.join(dir, 'subiu.txt')), 'the API was started');
});

test('C6 the check-gate replaces ${CLAUDE_PLUGIN_ROOT} in the check before running it', () => {
  const { trust } = createRequire(import.meta.url)(path.join(HOOKS, 'trust.js'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'api-home-'));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'api-data-'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-proj-'));
  // api-check with no .http files exits 0: the check passes only if the path to it was resolved.
  const check = 'node "${CLAUDE_PLUGIN_ROOT}/hooks/api-check.js" --files nada/*.http';
  fs.mkdirSync(path.join(dir, '.claude'));
  fs.writeFileSync(path.join(dir, '.claude', 'cctk.json'), JSON.stringify({ check }));
  const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = process.env.USERPROFILE = home;
  try { trust(dir, check); } finally { for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  const env = { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_PLUGIN_DATA: data, CLAUDE_PROJECT_DIR: '' };
  const hook = (a, input) => spawnSync(process.execPath, [path.join(HOOKS, 'check-gate.js'), a], { input: JSON.stringify(input), encoding: 'utf8', env });
  hook('mark', { session_id: 'c6' });
  const r = hook('gate', { session_id: 'c6', cwd: dir });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

const INIT = fs.readFileSync(path.join(REPO_ROOT, 'plugins', 'cctk', 'skills', 'init-project', 'SKILL.md'), 'utf8');
// The "Testes HTTP" item of section 6, up to the next section.
const passo = () => {
  const i = INIT.indexOf('**Testes HTTP');
  assert.ok(i > 0, 'missing the "Testes HTTP" step');
  return INIT.slice(i, INIT.indexOf('\n## ', i));
};

test('C7 init-project creates http/<recurso>.http with status and body asserts, and the env file', () => {
  const s = passo();
  for (const t of ['http/<recurso>.http', '?? status ==', 'corpo', 'http/http-client.env.json']) assert.ok(s.includes(t), t);
});

test('C8 init-project writes the composed check and reminds cctk trust', () => {
  const s = passo();
  assert.ok(s.includes('node "${CLAUDE_PLUGIN_ROOT}/hooks/api-check.js" --start'), 'composed check');
  assert.ok(s.includes('cctk trust'), 'trust reminder');
});
