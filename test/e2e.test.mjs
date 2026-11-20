// End-to-end: runs cli.mjs, the runtime scripts and the hooks.json commands as real processes,
// against a fake HOME with fake claude/npm/openspec/git/uv/npx on PATH. Never touches the real ~/.claude.
// E2E_REAL=1 also runs the real `claude` CLI (validate + install the local plugin in an isolated HOME).
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import * as tk from '../lib/toolkit.mjs';

const CLI = path.join(tk.REPO_ROOT, 'cli.mjs');
const PLUGIN = path.join(tk.REPO_ROOT, 'plugins', 'cctk');
const win = process.platform === 'win32';
const read = (f) => fs.readFileSync(f, 'utf8');
const tmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

function fakeHome() {
  const home = tmp('tk-e2e-home-');
  const c = path.join(home, '.claude');
  const w = (rel, s) => { fs.mkdirSync(path.dirname(path.join(c, rel)), { recursive: true }); fs.writeFileSync(path.join(c, rel), s); };
  w('settings.json', JSON.stringify({ model: 'opus', theme: 'dark', enabledPlugins: { 'ponytail@ponytail': true } }));
  w('CLAUDE.md', 'meu claude.md');
  w('skills/minha/SKILL.md', 'skill');
  w('plugins/known_marketplaces.json', JSON.stringify({ ponytail: { source: { source: 'github', repo: 'DietrichGebert/ponytail' } } }));
  w('projects/p1/conversa.jsonl', 'historico');
  w('.credentials.json', 'login');
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ oauthAccount: { id: 1 }, mcpServers: { context7: { url: 'x' } } }));
  return home;
}

// Fake binaries: each call is appended to $SHIM_LOG as JSON; names in $SHIM_FAIL exit 1.
const BIN = tmp('tk-e2e-bin-');
fs.writeFileSync(path.join(BIN, 'shim.cjs'), `
const fs = require('fs');
const [cmd, ...args] = process.argv.slice(2);
const rec = { cmd, args };
if (cmd === 'npm' && args[0] === 'view' && process.env.SHIM_NPM_VIEW) process.stdout.write(process.env.SHIM_NPM_VIEW);
if (cmd === 'npx') rec.env = { url: process.env.AZURE_DEVOPS_ORG_URL, pat: process.env.AZURE_DEVOPS_PAT, method: process.env.AZURE_DEVOPS_AUTH_METHOD };
if (process.env.SHIM_LOG) fs.appendFileSync(process.env.SHIM_LOG, JSON.stringify(rec) + '\\n');
process.exit((process.env.SHIM_FAIL || '').split(',').includes(cmd) ? 1 : 0);
`);
for (const name of ['claude', 'npm', 'openspec', 'git', 'uv', 'npx', 'playwright-cli']) {
  const shim = path.join(BIN, 'shim.cjs');
  if (win) fs.writeFileSync(path.join(BIN, `${name}.cmd`), `@"${process.execPath}" "${shim}" ${name} %*\r\n`);
  else fs.writeFileSync(path.join(BIN, name), `#!/bin/sh\nexec "${process.execPath}" "${shim}" ${name} "$@"\n`, { mode: 0o755 });
}

// Clean env for a child: no Claude Code session vars, fake HOME, optional shims first on PATH.
function env(home, extra = {}, shims = true) {
  const e = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^(path|claude.*)$/i.test(k)) e[k] = v;
  e.PATH = [...(shims ? [BIN] : []), path.dirname(process.execPath), process.env.PATH].join(path.delimiter);
  e.HOME = e.USERPROFILE = home;
  e.CCTK_MARKETPLACE = tk.REPO_ROOT;
  e.SHIM_LOG = path.join(home, 'shim.log');
  e.CCTK_CRED_SERVICE = 'cctk-test'; // never the user's Keychain/libsecret entries
  return { ...e, ...extra };
}
const shimLog = (home) => (fs.existsSync(path.join(home, 'shim.log')) ? read(path.join(home, 'shim.log')).trim().split('\n').map((l) => JSON.parse(l)) : []);
const calls = (home) => shimLog(home).filter((r) => r.args[0] !== '--version').map((r) => [r.cmd, ...r.args].join(' '));

// Answers each prompt only after it shows up: cli.mjs opens a new readline per question, so pre-piped input would get lost.
function drive(args, steps, e, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const c = spawn(process.execPath, [CLI, ...args], { env: e });
    let out = '', err = '', i = 0, from = 0;
    const timer = setTimeout(() => { c.kill(); reject(new Error(`timeout no passo ${i}\nstdout:\n${out}\nstderr:\n${err}`)); }, timeout);
    const pump = () => {
      while (i < steps.length) {
        const m = steps[i][0].exec(out.slice(from));
        if (!m) return;
        from += m.index + m[0].length;
        c.stdin.write(steps[i++][1] + '\n');
      }
      c.stdin.end();
    };
    c.stdout.on('data', (d) => { out += d; pump(); });
    c.stderr.on('data', (d) => (err += d));
    c.on('close', (code) => { clearTimeout(timer); resolve({ code, out, err, answered: i }); });
    pump();
  });
}

// Fake Azure DevOps Server: 200 only for the right PAT, like a real collection.
async function patServer(good) {
  const srv = http.createServer((req, res) => {
    const ok = req.url.startsWith('/tfs/ColA/_apis/projects') && req.headers.authorization === `Basic ${Buffer.from(`:${good}`).toString('base64')}`;
    res.writeHead(ok ? 200 : 401, { 'content-type': 'application/json' });
    res.end(ok ? '{"count":0,"value":[]}' : '');
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}/tfs/ColA`, close: () => srv.close() };
}

test('cli: usage, vault, restore without backup', async () => {
  const home = fakeHome();
  const e = env(home);
  assert.match((await drive([], [], e)).out, /Uso:/);

  const set = await drive(['secret', 'set', 'API_KEY'], [[/Valor de API_KEY/, 'abc 123']], e);
  assert.strictEqual(set.code, 0, set.err);
  assert.match(set.out, /API_KEY gravado/);
  assert.doesNotMatch(set.out, /abc 123/);
  assert.strictEqual((await drive(['secret', 'list'], [], e)).out.trim(), 'API_KEY');
  assert.strictEqual((await drive(['secret', 'rm', 'API_KEY'], [], e)).code, 0);
  assert.strictEqual((await drive(['secret', 'list'], [], e)).out.trim(), '(cofre vazio)');

  const bad = await drive(['secret', 'set', 'bad name'], [[/Valor de/, 'x']], e);
  assert.strictEqual(bad.code, 1);
  assert.match(bad.err, /Erro: Nome inválido/);

  const r = await drive(['restore'], [], e);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, /Nenhum backup/);
});

test('install refuses: inside Claude Code, missing prerequisite, user says no', async () => {
  const home = fakeHome();
  const before = read(path.join(home, '.claude', 'settings.json'));

  const inside = await drive(['install'], [], env(home, { CLAUDECODE: '1' }));
  assert.strictEqual(inside.code, 1);
  assert.match(inside.err, /terminal comum/);

  const noGit = await drive(['install'], [], env(home, { SHIM_FAIL: 'git' }));
  assert.strictEqual(noGit.code, 1);
  assert.match(noGit.err, /Falta instalar:[\s\S]*git:/);
  assert.doesNotMatch(noGit.err, /uv:|Claude Code:/);

  // uv is part of the kit (/cctk:convert): missing it blocks the install like the others
  const noUv = await drive(['install'], [], env(home, { SHIM_FAIL: 'uv' }));
  assert.strictEqual(noUv.code, 1);
  assert.match(noUv.err, /Falta instalar:[\s\S]*uv \(para o \/cctk:convert\):/);
  assert.doesNotMatch(noUv.err, /git:|Claude Code:/);

  const no = await drive(['install'], [[/Continuar\?/, 'n']], env(home));
  assert.strictEqual(no.code, 0, no.err);
  assert.match(no.out, /ponytail@ponytail/, 'shows what will be removed');
  assert.strictEqual(read(path.join(home, '.claude', 'settings.json')), before);
  assert.ok(!fs.existsSync(path.join(home, '.cctk', 'backups')));
  assert.deepStrictEqual(calls(home), [], 'nothing ran besides the prereq checks');
});

test('install → ado add → MCP launch → restore, full flow', async () => {
  const home = fakeHome();
  const c = path.join(home, '.claude');
  const original = { settings: read(path.join(c, 'settings.json')), claudeMd: read(path.join(c, 'CLAUDE.md')) };
  const pat = 'pat-certo-123';
  const srv = await patServer(pat);
  try {
    const e = env(home);
    const r = await drive(['install'], [
      [/Continuar\?/, 's'],
      [/Azure DevOps Server/, 's'],
      [/URL da collection/, srv.url],
      [/PAT para/, pat],
      [/URL da collection/, ''],
    ], e);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.answered, 5);
    assert.match(r.out, /Backup em/);
    assert.match(r.out, /\[1\/8\] Instalando o OpenSpec… ✔[\s\S]*\[8\/8\] Instalando o security-guidance… ✔/);
    assert.match(r.out, /ado-cola configurado/);
    assert.doesNotMatch(r.out + r.err, new RegExp(pat), 'PAT never printed');

    assert.deepStrictEqual(calls(home), [
      'claude plugin uninstall ponytail@ponytail',
      `npm install -g ${tk.OPENSPEC}`,
      `npm install -g ${tk.PLAYWRIGHT_CLI}`,
      'openspec config set profile custom',
      `openspec config set workflows ${JSON.stringify(tk.OPENSPEC_WORKFLOWS)}`,
      `claude plugin marketplace add ${tk.REPO_ROOT}`,
      `claude plugin install ${tk.PLUGIN_ID}`,
      `claude plugin marketplace add ${tk.OFFICIAL_MARKETPLACE}`,
      `claude plugin install ${tk.SECURITY_PLUGIN}`,
    ]);

    const backups = fs.readdirSync(path.join(home, '.cctk', 'backups'));
    assert.strictEqual(backups.length, 1);
    const s = JSON.parse(read(path.join(c, 'settings.json')));
    assert.strictEqual(s.model, 'sonnet');
    assert.strictEqual(s.theme, 'dark');
    assert.strictEqual(s.enabledPlugins, undefined);
    assert.ok(!fs.existsSync(path.join(c, 'skills')));
    for (const f of ['statusline.js', 'ado-mcp.js', 'creds.js']) assert.ok(fs.existsSync(path.join(c, 'cctk', f)), f);
    assert.strictEqual(read(path.join(c, 'projects/p1/conversa.jsonl')), 'historico');
    assert.strictEqual(read(path.join(c, '.credentials.json')), 'login');

    // The status line command written to settings.json works as Claude Code would run it.
    const sl = spawnSync(s.statusLine.command, { shell: true, encoding: 'utf8', input: JSON.stringify({ model: { display_name: 'Sonnet' } }) });
    assert.strictEqual(sl.stdout, 'Sonnet', sl.stderr);

    const cj = JSON.parse(read(path.join(home, '.claude.json')));
    assert.deepStrictEqual(cj.oauthAccount, { id: 1 });
    assert.deepStrictEqual(Object.keys(cj.mcpServers), ['ado-cola']);
    assert.doesNotMatch(read(path.join(home, '.claude.json')), new RegExp(pat));

    // Launch the MCP entry exactly as ~/.claude.json declares it: PAT reaches npx via env only.
    const mcp = cj.mcpServers['ado-cola'];
    const launch = (extra) => spawnSync(mcp.command, mcp.args, { encoding: 'utf8', env: env(home, extra) });
    const ok = launch();
    assert.strictEqual(ok.status, 0, ok.stderr);
    const npx = shimLog(home).filter((x) => x.cmd === 'npx').pop();
    assert.deepStrictEqual(npx.env, { url: srv.url, pat, method: 'pat' });
    assert.ok(!npx.args.includes(pat) && npx.args[0] === '-y');
    assert.strictEqual(launch({ SHIM_FAIL: 'npx' }).status, 1, 'child exit code is propagated');

    const before = calls(home).length;
    const back = await drive(['restore'], [[/Voltar à configuração/, 's']], e);
    assert.strictEqual(back.code, 0, back.err);
    assert.match(back.out, new RegExp(`Restaurado o backup ${backups[0]}`));
    assert.strictEqual(read(path.join(c, 'settings.json')), original.settings);
    assert.strictEqual(read(path.join(c, 'CLAUDE.md')), original.claudeMd);
    assert.strictEqual(read(path.join(c, 'skills/minha/SKILL.md')), 'skill');
    assert.deepStrictEqual(JSON.parse(read(path.join(home, '.claude.json'))).mcpServers, { context7: { url: 'x' } });
    assert.deepStrictEqual(calls(home).slice(before), [
      `claude plugin uninstall ${tk.PLUGIN_ID}`,
      `claude plugin uninstall ${tk.SECURITY_PLUGIN}`,
      'claude plugin marketplace add DietrichGebert/ponytail',
      'claude plugin install ponytail@ponytail',
    ]);
  } finally {
    srv.close();
  }
});

test('update (install over the kit) keeps ado-* MCPs, and restore still returns the original setup', async () => {
  const home = fakeHome();
  const c = path.join(home, '.claude');
  const original = read(path.join(c, 'settings.json'));
  const srv = await patServer('pat-ok');
  try {
    const e = env(home);
    const first = await drive(['install'], [[/Continuar\?/, 's'], [/Azure DevOps Server/, 's'], [/URL da collection/, srv.url], [/PAT para/, 'pat-ok'], [/URL da collection/, '']], e);
    assert.strictEqual(first.code, 0, first.err);
    // The fake claude doesn't write settings: mark both kit plugins enabled, as the real install would, and add
    // what a user changes after installing (proxy, an allow rule, another plugin): an update must keep it.
    const s = JSON.parse(read(path.join(c, 'settings.json')));
    fs.writeFileSync(path.join(c, 'settings.json'), JSON.stringify({ ...s, env: { ...s.env, HTTPS_PROXY: 'http://proxy:8080' },
      permissions: { ...s.permissions, allow: ['Bash(npm test)'] }, enabledPlugins: { [tk.PLUGIN_ID]: true, [tk.SECURITY_PLUGIN]: true, 'meu@plugin': true },
      extraKnownMarketplaces: { cctk: { source: { source: 'github', repo: 'AlfredoNeeto/cctk', ref: 'v1.0.0' } } } }));
    fs.writeFileSync(path.join(c, 'CLAUDE.md'), 'minhas regras');

    const before = calls(home).length;
    const update = await drive(['install'], [[/Continuar\?/, 's']], e);
    assert.strictEqual(update.code, 0, update.err);
    assert.match(update.out, /atualizar o Claude Code Toolkit/);
    assert.doesNotMatch(update.out, /Azure DevOps Server/, 'an update does not ask again');
    assert.ok(!calls(home).slice(before).some((x) => x.includes('uninstall')), 'an update uninstalls nothing');
    assert.ok(calls(home).slice(before).includes(`claude plugin update ${tk.PLUGIN_ID}`), 'install alone leaves the old version');
    assert.ok(!calls(home).slice(before).some((x) => x.includes('marketplace remove')), 'removing it would delete the plugin data');
    const kept = JSON.parse(read(path.join(c, 'settings.json')));
    assert.strictEqual(kept.extraKnownMarketplaces.cctk.source.ref, `v${tk.VERSION}`, 'marketplace add refuses a ref that differs from this entry');
    assert.strictEqual(kept.env.HTTPS_PROXY, 'http://proxy:8080');
    assert.strictEqual(kept.env.CLAUDE_CODE_SUBAGENT_MODEL, 'sonnet');
    assert.deepStrictEqual(kept.permissions.allow, ['Bash(npm test)']);
    assert.deepStrictEqual(kept.permissions.deny, tk.DENY);
    assert.strictEqual(kept.enabledPlugins['meu@plugin'], true);
    assert.strictEqual(read(path.join(c, 'CLAUDE.md')), 'minhas regras');
    assert.deepStrictEqual(Object.keys(JSON.parse(read(path.join(home, '.claude.json'))).mcpServers), ['ado-cola']);
    assert.strictEqual(fs.readdirSync(path.join(home, '.cctk', 'backups')).length, 2);

    const back = await drive(['restore'], [[/Voltar à configuração/, 's']], e);
    assert.strictEqual(back.code, 0, back.err);
    assert.strictEqual(read(path.join(c, 'settings.json')), original);
    assert.deepStrictEqual(JSON.parse(read(path.join(home, '.claude.json'))).mcpServers, { context7: { url: 'x' } });
  } finally {
    srv.close();
  }
});

test('install from the old kit (Claude Toolkit Dev ≤1.1.2) migrates its data, MCPs and plugin', async () => {
  const home = fakeHome();
  const c = path.join(home, '.claude');
  const old = path.join(home, '.claude-toolkit');
  fs.mkdirSync(path.join(old, 'creds'), { recursive: true });
  fs.writeFileSync(path.join(old, 'secrets.env'), 'API_KEY=abc\n');
  fs.writeFileSync(path.join(old, 'trusted-checks.json'), '["k"]\n');
  fs.writeFileSync(path.join(old, 'creds', 'ado-cola.dpapi'), 'x');
  fs.mkdirSync(path.join(c, 'toolkit'));
  fs.writeFileSync(path.join(c, 'settings.json'), JSON.stringify({ model: 'sonnet', statusLine: { type: 'command', command: `node "${c}/toolkit/statusline.js"` },
    env: { HTTPS_PROXY: 'http://proxy:8080' }, enabledPlugins: { [tk.OLD_PLUGIN_ID]: true, [tk.SECURITY_PLUGIN]: true },
    extraKnownMarketplaces: { 'claude-toolkit': { source: { source: 'github', repo: 'AlfredoNeeto/claude-toolkit', ref: 'v1.1.2' } } } }));
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ mcpServers: { 'ado-cola': { type: 'stdio', command: 'node', args: [`${c}/toolkit/ado-mcp.js`, 'https://tfs/ColA', 'ado-cola'] } } }));

  const r = await drive(['install'], [[/Continuar\?/, 's']], env(home));
  assert.strictEqual(r.code, 0, r.err);
  assert.match(r.out, /atualizar o Claude Code Toolkit/, 'the old kit counts as an install to update');
  assert.ok(!fs.existsSync(old) && !fs.existsSync(path.join(c, 'toolkit')));
  assert.ok(!fs.existsSync(path.join(home, '.cctk', 'secrets.env')), 'the plain-text vault is gone');
  assert.strictEqual(read(path.join(home, '.cctk', 'secrets.names')), 'API_KEY\n');
  const vault = spawnSync(process.execPath, ['-e', 'process.stdout.write(JSON.stringify(require(process.argv[1]).readVault()))',
    path.join(PLUGIN, 'hooks', 'vault.js')], { encoding: 'utf8', env: env(home) });
  assert.strictEqual(vault.stdout, '{"API_KEY":"abc"}', vault.stderr);
  assert.strictEqual(read(path.join(home, '.cctk', 'trusted-checks.json')), '["k"]\n');
  assert.ok(fs.existsSync(path.join(home, '.cctk', 'creds', 'ado-cola.dpapi')));
  assert.ok(calls(home).includes(`claude plugin uninstall ${tk.OLD_PLUGIN_ID}`));
  assert.ok(calls(home).includes('claude plugin marketplace remove claude-toolkit'));
  const s = JSON.parse(read(path.join(c, 'settings.json')));
  assert.match(s.statusLine.command, /cctk\/statusline\.js/);
  assert.strictEqual(s.env.HTTPS_PROXY, 'http://proxy:8080');
  assert.strictEqual(s.enabledPlugins[tk.OLD_PLUGIN_ID], undefined);
  assert.strictEqual(s.extraKnownMarketplaces['claude-toolkit'], undefined);
  const ado = JSON.parse(read(path.join(home, '.claude.json'))).mcpServers['ado-cola'];
  assert.strictEqual(ado.env.HTTPS_PROXY, '${HTTPS_PROXY:-}', 'the ADO MCP still sees the proxy with the env allowlist');
  assert.match(ado.args[0], /\.claude\/cctk\/ado-mcp\.js$/);
  assert.ok(fs.existsSync(ado.args[0]));
});

test('install --dry-run shows the plan and changes nothing', async () => {
  const home = fakeHome();
  const before = read(path.join(home, '.claude', 'settings.json'));
  const r = await drive(['install', '--dry-run'], [], env(home));
  assert.strictEqual(r.code, 0, r.err);
  assert.match(r.out, /ponytail@ponytail[\s\S]*--dry-run: nada foi alterado/);
  assert.strictEqual(read(path.join(home, '.claude', 'settings.json')), before);
  assert.ok(!fs.existsSync(path.join(home, '.cctk')));
  assert.deepStrictEqual(calls(home), []);
});

test('install --yes runs without questions and skips Azure DevOps', () => {
  const home = fakeHome();
  const r = spawnSync(process.execPath, [CLI, 'install', '--yes'], { input: '', encoding: 'utf8', env: env(home) });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /Continuar\? \[s\/N\] s/);
  assert.doesNotMatch(r.stdout, /Azure DevOps/);
  assert.strictEqual(JSON.parse(read(path.join(home, '.claude', 'settings.json'))).model, 'sonnet');
});

test('install with every answer piped at once (scripted use)', () => {
  const home = fakeHome();
  const r = spawnSync(process.execPath, [CLI, 'install'], { input: 's\nn\n', encoding: 'utf8', env: env(home) });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /Pronto/);
  const eof = spawnSync(process.execPath, [CLI, 'install'], { input: '', encoding: 'utf8', env: env(fakeHome()) });
  assert.strictEqual(eof.status, 0, 'EOF counts as "no", without hanging');
});

test('install keeps going when a tool step fails, reports it and exits 1', async () => {
  const home = fakeHome();
  const r = await drive(['install'], [[/Continuar\?/, 's'], [/Azure DevOps Server/, 'n']], env(home, { SHIM_FAIL: 'openspec' }));
  assert.strictEqual(r.code, 1, r.err);
  assert.match(r.err, /Etapas que falharam[\s\S]*openspec config set profile custom/);
  assert.match(r.out, /\[3\/8\] Configurando o OpenSpec… ✖/);
  assert.match(r.out, /Terminou com falhas/);
  assert.ok(calls(home).includes(`claude plugin install ${tk.PLUGIN_ID}`));
  assert.strictEqual(JSON.parse(read(path.join(home, '.claude', 'settings.json'))).model, 'sonnet');
});

test('ado add with a wrong PAT: declining saves nothing; MCP without PAT explains how to fix', async () => {
  const home = fakeHome();
  const srv = await patServer('certo');
  try {
    const r = await drive(['ado', 'add', srv.url], [
      [/PAT para/, 'errado'],
      [/Salvar mesmo assim\?/, 'n'],
      [/URL da collection/, ''],
    ], env(home));
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.answered, 3);
    assert.deepStrictEqual(Object.keys(JSON.parse(read(path.join(home, '.claude.json'))).mcpServers), ['context7']);
    assert.ok(!fs.existsSync(path.join(home, '.cctk', 'creds', 'ado-cola.dpapi')));

    const bad = await drive(['ado', 'add', 'nao-e-url'], [[/URL da collection/, '']], env(home));
    assert.match(bad.out, /URL inválida/);
  } finally {
    srv.close();
  }
  tk.writeConfig(tk.paths(home)); // the launcher runs from ~/.claude/cctk, next to the creds.js the installer copies
  const m = spawnSync(process.execPath, [path.join(home, '.claude', 'cctk', 'ado-mcp.js'), 'https://tfs.local/tfs/ColA', 'ado-cola'], { encoding: 'utf8', env: env(home) });
  assert.strictEqual(m.status, 1);
  assert.match(m.stderr, /ado add https:\/\/tfs\.local\/tfs\/ColA/);
});

test('hooks.json commands run as Claude Code runs them', async () => {
  const text = read(path.join(PLUGIN, 'hooks', 'hooks.json'));
  for (const [rel] of text.matchAll(/hooks\/[\w-]+\.js/g)) assert.ok(fs.existsSync(path.join(PLUGIN, rel)), rel);
  const all = JSON.parse(text).hooks;

  const home = tmp('tk-e2e-hooks-');
  const set = await drive(['secret', 'set', 'API_KEY'], [[/Valor de API_KEY/, 'abc123']], env(home));
  assert.strictEqual(set.code, 0, set.err);
  const envFile = path.join(home, 'envfile');
  const e = env(home, { CLAUDE_PLUGIN_ROOT: PLUGIN, CLAUDE_PLUGIN_DATA: path.join(home, 'data'), CLAUDE_ENV_FILE: envFile });
  // Exec form, like Claude Code: no shell, ${CLAUDE_PLUGIN_ROOT} substituted into each argument.
  const call = (h, input) => spawnSync(h.command, h.args.map((a) => a.replace('${CLAUDE_PLUGIN_ROOT}', PLUGIN)), { encoding: 'utf8', env: e, input: JSON.stringify(input) });
  const hook = (event, input) => call(all[event][0].hooks[0], input);

  const start = hook('SessionStart', { session_id: 'h1' });
  assert.strictEqual(start.status, 0, start.stderr);
  assert.strictEqual(read(envFile).trim(), 'API_KEY=abc123');
  assert.match(JSON.parse(start.stdout).hookSpecificOutput.additionalContext, /API_KEY/);
  assert.doesNotMatch(start.stdout, /abc123/);

  const deny = hook('PreToolUse', { tool_name: 'Bash', tool_input: { command: 'echo $API_KEY' } });
  assert.strictEqual(JSON.parse(deny.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const allow = hook('PreToolUse', { tool_name: 'Bash', tool_input: { command: 'git status' } });
  assert.strictEqual(allow.status, 0, allow.stderr);
  assert.strictEqual(allow.stdout, '');

  const proj = tmp('tk-e2e-proj-');
  fs.mkdirSync(path.join(proj, '.claude'));
  fs.writeFileSync(path.join(proj, '.claude', 'cctk.json'), JSON.stringify({ check: 'node -e "console.log(\'quebrou\');process.exit(1)"' }));
  const edit = () => assert.strictEqual(hook('PostToolUse', { session_id: 'h1', tool_name: 'Edit', tool_input: { file_path: path.join(proj, 'a.js') } }).status, 0);
  edit();
  const untrusted = hook('Stop', { session_id: 'h1', cwd: proj });
  assert.strictEqual(untrusted.status, 0, 'a check from the repository never runs before the user approves it');
  assert.match(JSON.parse(untrusted.stdout).systemMessage, /não foi aprovado/);

  const cli = (extra) => spawnSync(process.execPath, [CLI, 'trust'], { cwd: proj, input: 's\n', encoding: 'utf8', env: { ...env(home), ...extra } });
  const inside = cli({ CLAUDECODE: '1' });
  assert.strictEqual(inside.status, 1);
  assert.match(inside.stderr, /fora do Claude Code/);
  const ok = cli();
  assert.strictEqual(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /quebrou[\s\S]*Check aprovado/);

  edit();
  const gate = hook('Stop', { session_id: 'h1', cwd: proj });
  assert.strictEqual(gate.status, 2);
  assert.match(gate.stderr, /quebrou/);

  // An edit made through the shell (no Edit/Write): the snapshot taken at the prompt catches it.
  assert.strictEqual(spawnSync('git init -q && git add -A && git -c user.name=t -c user.email=t@t commit -qm i', { cwd: proj, shell: true }).status, 0);
  assert.strictEqual(hook('UserPromptSubmit', { session_id: 'h2', cwd: proj }).status, 0);
  fs.writeFileSync(path.join(proj, 'b.js'), 'x');
  const shellHook = all.PostToolUse.find((x) => x.matcher === 'Bash|PowerShell').hooks[0];
  assert.strictEqual(call(shellHook, { session_id: 'h2', tool_name: 'Bash', tool_input: { command: 'cat > b.js' } }).status, 0);
  const viaShell = hook('Stop', { session_id: 'h2', cwd: proj });
  assert.strictEqual(viaShell.status, 2, viaShell.stderr);
  assert.match(viaShell.stderr, /quebrou/);
});

test('doctor: lists what is missing, then all green after install, with the newer-version hint', async () => {
  const home = fakeHome();
  {
    const e = env(home, { SHIM_NPM_VIEW: '99.0.0\n' });
    const doctor = () => new Promise((resolve) => {
      const c = spawn(process.execPath, [CLI, 'doctor'], { env: e });
      let out = '';
      c.stdout.on('data', (d) => (out += d));
      c.on('close', (code) => resolve({ code, out }));
    });
    const before = await doctor();
    assert.strictEqual(before.code, 1);
    assert.match(before.out, /✖ Configuração do kit[\s\S]*→ Rode: cctk install/);
    assert.match(before.out, /✖ Plugin cctk não instalado/);

    assert.strictEqual(spawnSync(process.execPath, [CLI, 'install'], { input: 's\nn\n', encoding: 'utf8', env: e }).status, 0);
    const plugins = { [tk.PLUGIN_ID]: [{ version: tk.VERSION }], [tk.SECURITY_PLUGIN]: [{ version: '1.0.0' }] };
    fs.writeFileSync(path.join(home, '.claude', 'plugins', 'installed_plugins.json'), JSON.stringify({ version: 2, plugins }));
    const sp = path.join(home, '.claude', 'settings.json');
    fs.writeFileSync(sp, JSON.stringify({ ...JSON.parse(read(sp)), enabledPlugins: { [tk.PLUGIN_ID]: true } }));
    const after = await doctor();
    assert.strictEqual(after.code, 0, after.out);
    assert.doesNotMatch(after.out, /✖/);
    assert.match(after.out, /↑ Versão nova: 99\.0\.0\. Rode: cctk update/);
  }
});

test('statusline: full input and garbage input', () => {
  const sl = (input) => spawnSync(process.execPath, [path.join(tk.REPO_ROOT, 'runtime', 'statusline.js')], { encoding: 'utf8', input });
  const r = sl(JSON.stringify({
    model: { display_name: 'Sonnet' },
    context_window: { used_percentage: 85 },
    rate_limits: { five_hour: { used_percentage: 40, resets_at: 1763500000 }, seven_day: { used_percentage: 12.4, resets_at: '2026-11-20T10:00:00Z' } },
  }));
  assert.match(r.stdout, /^Sonnet \| ctx 85%! \| 5h 40% \(reset \d{2}:\d{2}\) \| 7d 12% \(reset \d{2}\/\d{2} \d{2}:\d{2}\)$/);
  assert.match(sl(JSON.stringify({ model: { id: 'claude-opus-5-5', display_name: 'Opus' } })).stdout, /^Opus ⚠ mais caro$/);
  const g = sl('isto não é json');
  assert.strictEqual(g.status, 0);
  assert.strictEqual(g.stdout, '');
});

test('plugin and package structure', () => {
  const front = (f) => Object.fromEntries([...(read(f).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '').matchAll(/^([\w-]+):\s*(.*)$/gm)].map((m) => [m[1], m[2]]));
  const skills = path.join(PLUGIN, 'skills');
  for (const s of fs.readdirSync(skills)) {
    const f = path.join(skills, s, 'SKILL.md');
    const fm = front(f);
    assert.strictEqual(fm.name, s, `${s}: name in frontmatter`);
    assert.ok(fm.description, `${s}: description`);
    for (const [ref] of read(f).matchAll(/references\/[\w.-]+/g)) assert.ok(fs.existsSync(path.join(skills, s, ref)), `${s}: ${ref}`);
  }
  for (const a of fs.readdirSync(path.join(PLUGIN, 'agents'))) {
    const fm = front(path.join(PLUGIN, 'agents', a));
    assert.strictEqual(fm.name, a.replace(/\.md$/, ''), a);
    assert.ok(fm.description, a);
  }
  const market = JSON.parse(read(path.join(tk.REPO_ROOT, '.claude-plugin', 'marketplace.json')));
  for (const pl of market.plugins) assert.ok(fs.existsSync(path.join(tk.REPO_ROOT, pl.source, '.claude-plugin', 'plugin.json')), pl.source);
  assert.strictEqual(`${market.plugins[0].name}@${market.name}`, tk.PLUGIN_ID);
  const pkg = JSON.parse(read(path.join(tk.REPO_ROOT, 'package.json')));
  assert.strictEqual(JSON.parse(read(path.join(PLUGIN, '.claude-plugin', 'plugin.json'))).version, pkg.version);

  const pack = tk.run('npm', ['pack', '--dry-run', '--json'], { cwd: tk.REPO_ROOT });
  assert.strictEqual(pack.status, 0, pack.stderr);
  const files = JSON.parse(pack.stdout)[0].files.map((f) => f.path.replace(/\\/g, '/'));
  for (const f of ['cli.mjs', 'lib/toolkit.mjs', 'runtime/statusline.js', 'runtime/ado-mcp.js', 'plugins/cctk/hooks/creds.js',
    'plugins/cctk/hooks/hooks.json', 'plugins/cctk/hooks/vault.js', 'plugins/cctk/.claude-plugin/plugin.json']) {
    assert.ok(files.includes(f), `pacote sem ${f}`);
  }
});

test('real claude: validate and install the local plugin in an isolated HOME', { skip: !process.env.E2E_REAL && 'defina E2E_REAL=1' }, () => {
  const home = tmp('tk-e2e-real-');
  const opts = { env: env(home, {}, false), timeout: 180000 };
  for (const target of [tk.REPO_ROOT, PLUGIN]) {
    const v = tk.run('claude', ['plugin', 'validate', target], opts);
    assert.strictEqual(v.status, 0, `${target}\n${v.stdout}\n${v.stderr}`);
  }
  for (const args of [['plugin', 'marketplace', 'add', tk.REPO_ROOT], ['plugin', 'install', tk.PLUGIN_ID]]) {
    const r = tk.run('claude', args, opts);
    assert.strictEqual(r.status, 0, `${args.join(' ')}\n${r.stdout}\n${r.stderr}`);
  }
  const list = tk.run('claude', ['plugin', 'list'], opts);
  assert.match(list.stdout, /cctk/);
});
