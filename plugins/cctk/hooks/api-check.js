#!/usr/bin/env node
// Tests the project's API over HTTP as part of its check (.specs/features/api-http): starts the API, waits for it to
// answer, runs the .http files with httpyac, and stops the API on every way out.
// Usage, in .claude/cctk.json (the check-gate replaces ${CLAUDE_PLUGIN_ROOT}):
//   node "${CLAUDE_PLUGIN_ROOT}/hooks/api-check.js" --start "<command>" --url <health url> [--wait 60] [--files http/*.http] [--limit 150]
// --limit keeps the whole run under the check-gate's 3 minutes, so this process always gets to stop the API itself.
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

function killTree(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  else try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ }
}

// Any HTTP answer counts as "up": a 404 on the health URL still means the server is listening.
async function waitUp(url, ms, api) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (api.exitCode !== null) return false;
    try { await fetch(url, { signal: AbortSignal.timeout(2000) }); return true; } catch { /* not yet */ }
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
  const deadline = Date.now() + Number(o.limit) * 1000;
  const tail = [];
  const keep = (d) => { for (const l of String(d).split(/\r?\n/)) if (l.trim()) { tail.push(l); if (tail.length > 20) tail.shift(); } };
  // Own process group off Windows, so the whole tree (shell, npm, the server) goes down with one kill.
  const api = spawn(o.start, { cwd, shell: true, windowsHide: true, detached: process.platform !== 'win32' });
  api.stdout.on('data', keep);
  api.stderr.on('data', keep);
  const stop = () => killTree(api);
  process.on('exit', stop);
  for (const s of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(s, () => { stop(); process.exit(1); });

  const waitMs = Math.min(Number(o.wait) * 1000, deadline - Date.now());
  if (!(await waitUp(o.url, waitMs, api))) {
    console.error(`api-check: a API não respondeu em ${o.url} em ${o.wait} s. Últimas linhas da API:\n${tail.join('\n') || '(nada)'}`);
    stop();
    return 1;
  }
  // CCTK_HTTP_RUNNER exists for the kit's own tests, to run without the network.
  const runner = process.env.CCTK_HTTP_RUNNER || `npx -y ${HTTPYAC} send`;
  // {{baseUrl}} and friends come from http-client.env.json (the format VS and VS Code read); the kit's env is "dev".
  const env = fs.existsSync(path.resolve(cwd, path.dirname(files[0]), 'http-client.env.json')) ? ' --env dev' : '';
  const r = spawnSync(`${runner} ${files.map((f) => JSON.stringify(f)).join(' ')} --all --bail${env}`,
    { cwd, shell: true, encoding: 'utf8', windowsHide: true, timeout: Math.max(1000, deadline - Date.now()), maxBuffer: 16 << 20 });
  stop();
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (r.status !== 0) {
    console.error(`api-check: os testes HTTP falharam${r.error ? ` (${r.error.message})` : ''}:\n${out.slice(-8000)}`);
    return 1;
  }
  console.log(`api-check: os testes HTTP passaram (${files.join(', ')})`);
  return 0;
}

main().then((code) => { process.exitCode = code; }, (e) => { console.error(`api-check: ${e.message}`); process.exitCode = 1; });
