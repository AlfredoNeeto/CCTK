#!/usr/bin/env node
// Tests the project's API over HTTP as part of its check (.specs/features/api-http): starts the API, waits for it to
// answer, runs the .http files with httpyac, and stops the API on every way out.
// Usage, in .claude/cctk.json (the check-gate replaces ${CLAUDE_PLUGIN_ROOT}):
//   node "${CLAUDE_PLUGIN_ROOT}/hooks/api-check.js" --start "<command>" --url <health url> [--wait 60] [--files http/*.http] [--limit 150]
// --limit bounds this process; when the whole check runs past the check-gate's 3 minutes, the gate kills the check's
// process group and the API goes with it (the API is not detached). Known limit: a --start that forks a daemon and
// exits is not followed.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HTTPYAC = 'httpyac@6.16.7';

function options(argv) {
  const o = { wait: '60', files: 'http/*.http', limit: '150' };
  for (let i = 0; i < argv.length; i++) {
    const m = argv[i].match(/^--(\w+)$/);
    if (m) o[m[1]] = argv[++i];
  }
  return o;
}

// "dir/*.http" (one level, * only) or a single file.
function expand(pattern, cwd) {
  if (!pattern.includes('*')) return fs.existsSync(path.resolve(cwd, pattern)) ? [pattern] : [];
  const dir = path.dirname(pattern);
  const re = new RegExp(`^${path.basename(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
  try {
    return fs.readdirSync(path.resolve(cwd, dir)).filter((f) => re.test(f)).sort().map((f) => path.join(dir, f));
  } catch { return []; }
}

// The API stays in the check's own process group (no `detached`): when the check-gate kills that group at its time
// limit, the API goes with it. To stop it ourselves we kill the child and every descendant (shell, npm, the server).
// pid -> ppid pairs from `ps`, or from /proc where there is no ps (slim Linux containers such as node:*-slim).
function parents() {
  const r = spawnSync('ps', ['-A', '-o', 'pid=,ppid='], { encoding: 'utf8' });
  if (!r.error && r.status === 0) return (r.stdout || '').split('\n').map((l) => l.trim().split(/\s+/).map(Number));
  try {
    return fs.readdirSync('/proc').filter((d) => /^\d+$/.test(d)).map((d) => {
      try { // /proc/<pid>/stat: "pid (comm) state ppid ..."; comm may hold spaces, so read after the last ")"
        const stat = fs.readFileSync(`/proc/${d}/stat`, 'utf8');
        return [Number(d), Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1])];
      } catch { return []; }
    });
  } catch { return []; }
}

function descendants(pid) {
  const kids = new Map();
  for (const [p, pp] of parents()) if (p && pp) kids.set(pp, [...(kids.get(pp) || []), p]);
  const all = [];
  for (const queue = [pid]; queue.length;) for (const k of kids.get(queue.shift()) || []) { all.push(k); queue.push(k); }
  return all;
}

function killTree(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') { spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }); return; }
  for (const pid of [...descendants(child.pid), child.pid]) try { process.kill(pid, 'SIGKILL'); } catch { /* already gone */ }
}

// A child process run to the end, killed with its whole tree at `ms` (spawnSync's timeout would only kill the shell,
// and on Windows its children keep the pipes open).
function runWithin(cmd, cwd, ms) {
  return new Promise((resolve) => {
    const child = spawn(cmd, { cwd, shell: true, windowsHide: true });
    let out = '';
    const keep = (d) => { out = (out + d).slice(-64 * 1024); };
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    const timer = setTimeout(() => { out += `\n(passou de ${Math.round(ms / 1000)} s e foi interrompido)`; killTree(child); }, ms);
    child.on('error', (e) => { clearTimeout(timer); resolve({ status: 1, out: `${out}\n${e.message}` }); });
    child.on('close', (status) => { clearTimeout(timer); resolve({ status: status ?? 1, out }); });
  });
}

const answers = async (url) => {
  try { await fetch(url, { signal: AbortSignal.timeout(2000) }); return true; } catch { return false; }
};

// Any HTTP answer counts as "up": a 404 on the health URL still means the server is listening.
async function waitUp(url, ms, api) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (api.exitCode !== null) return false;
    if (await answers(url)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  const o = options(process.argv.slice(2));
  const cwd = process.cwd();
  const files = expand(o.files, cwd);
  if (!files.length) {
    console.log(`api-check: nenhum arquivo em ${o.files}; não há teste HTTP para rodar`);
    return 0;
  }
  if (!o.start || !o.url) {
    console.error('api-check: faltou --start "<comando que sobe a API>" ou --url <endereço que responde quando ela está no ar>');
    return 1;
  }
  // Something already answering there (the developer's own instance, a leftover) would be tested instead of the
  // fresh API, which then dies on a busy port: stop and say so.
  if (await answers(o.url)) {
    console.error(`api-check: já tem um servidor respondendo em ${o.url}. Pare-o antes, para o check testar a API deste código.`);
    return 1;
  }
  const deadline = Date.now() + Number(o.limit) * 1000;
  const tail = [];
  const keep = (d) => { for (const l of String(d).split(/\r?\n/)) if (l.trim()) { tail.push(l); if (tail.length > 20) tail.shift(); } };
  const api = spawn(o.start, { cwd, shell: true, windowsHide: true });
  api.stdout.on('data', keep);
  api.stderr.on('data', keep);
  const stop = () => killTree(api);
  process.on('exit', stop);
  for (const s of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(s, () => { stop(); process.exit(1); });

  const waitMs = Math.min(Number(o.wait) * 1000, deadline - Date.now());
  if (!(await waitUp(o.url, waitMs, api))) {
    console.error(`api-check: a API não respondeu em ${o.url} em ${Math.round(waitMs / 1000)} s. Últimas linhas da API:\n${tail.join('\n') || '(nada)'}`);
    stop();
    return 1;
  }
  // CCTK_HTTP_RUNNER exists for the kit's own tests, to run without the network.
  const runner = process.env.CCTK_HTTP_RUNNER || `npx -y ${HTTPYAC} send`;
  // {{baseUrl}} and friends come from http-client.env.json (the format VS and VS Code read); the kit's env is "dev".
  const env = fs.existsSync(path.resolve(cwd, path.dirname(files[0]), 'http-client.env.json')) ? ' --env dev' : '';
  const r = await runWithin(`${runner} ${files.map((f) => JSON.stringify(f)).join(' ')} --all --bail${env}`, cwd, Math.max(1000, deadline - Date.now()));
  stop();
  const out = r.out.trim();
  if (r.status !== 0) {
    console.error(`api-check: os testes HTTP falharam:\n${out.slice(-8000)}`);
    return 1;
  }
  console.log(`api-check: os testes HTTP passaram (${files.join(', ')})`);
  return 0;
}

main().then((code) => { process.exitCode = code; }, (e) => { console.error(`api-check: ${e.message}`); process.exitCode = 1; });
