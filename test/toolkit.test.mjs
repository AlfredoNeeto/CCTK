// node --test test/
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as tk from '../lib/toolkit.mjs';

const require = createRequire(import.meta.url);
process.env.CCTK_CRED_SERVICE = 'cctk-test'; // never the user's Keychain/libsecret entries
const noStore = process.platform === 'linux' && !process.env.DBUS_SESSION_BUS_ADDRESS;

// The credential store and ~/.cctk follow HOME (USERPROFILE on Windows): point both at a fake home while fn runs.
function withHome(home, fn) {
  const prev = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = process.env.USERPROFILE = home;
  try { return fn(); } finally { Object.assign(process.env, prev); }
}

function fakeHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-home-'));
  const c = path.join(home, '.claude');
  const w = (rel, s) => { fs.mkdirSync(path.dirname(path.join(c, rel)), { recursive: true }); fs.writeFileSync(path.join(c, rel), s); };
  w('settings.json', JSON.stringify({ model: 'opus', theme: 'dark', enabledPlugins: { 'ponytail@ponytail': true, 'old@x': false } }));
  w('CLAUDE.md', 'meu claude.md');
  w('skills/minha/SKILL.md', 'skill');
  w('agents/a.md', 'agent');
  w('plugins/known_marketplaces.json', JSON.stringify({ ponytail: { source: { source: 'github', repo: 'DietrichGebert/ponytail' } } }));
  w('projects/p1/conversa.jsonl', 'historico');
  w('.credentials.json', 'login');
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ oauthAccount: { id: 1 }, mcpServers: { context7: { url: 'x' } } }));
  return tk.paths(home);
}

const recorder = () => { const calls = []; const exec = (cmd, args) => { calls.push([cmd, ...args].join(' ')); return { status: 0, stdout: '', stderr: '' }; }; return { calls, exec }; };
const read = (f) => fs.readFileSync(f, 'utf8');

test('backup → clean → writeConfig → restore round trip', () => {
  const p = fakeHome();
  const before = read(path.join(p.claude, 'settings.json'));

  const dir = tk.backup(p, 'b1');
  const manifest = JSON.parse(read(path.join(dir, 'manifest.json')));
  assert.deepStrictEqual(manifest.plugins, ['ponytail@ponytail']);
  assert.deepStrictEqual(manifest.mcpServers, ['context7']);

  const r1 = recorder();
  tk.clean(p, r1.exec);
  tk.writeConfig(p, JSON.parse(before));
  assert.deepStrictEqual(r1.calls, ['claude plugin uninstall ponytail@ponytail']);
  assert.ok(!fs.existsSync(path.join(p.claude, 'skills')));
  assert.ok(!fs.existsSync(path.join(p.claude, 'agents')));
  const cj = JSON.parse(read(p.claudeJson));
  assert.deepStrictEqual(cj.mcpServers, {});
  assert.deepStrictEqual(cj.oauthAccount, { id: 1 }, 'login in ~/.claude.json untouched');
  assert.strictEqual(read(path.join(p.claude, 'projects/p1/conversa.jsonl')), 'historico');
  assert.strictEqual(read(path.join(p.claude, '.credentials.json')), 'login');
  const s = JSON.parse(read(path.join(p.claude, 'settings.json')));
  assert.strictEqual(s.model, 'sonnet');
  assert.strictEqual(s.advisorModel, 'opus');
  assert.strictEqual(s.env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION, 'false');
  assert.strictEqual(s.theme, 'dark');
  assert.ok(s.permissions.deny.includes('Read(**/.env)'));
  assert.strictEqual(s.permissions.blockWritesOutsideWorkingDirectories, true);
  assert.strictEqual(s.env.CLAUDE_CODE_MCP_ALLOWLIST_ENV, '1');
  // security-guidance reviews on Sonnet (bench 27/11/2026), by full id: the plugin calls the API, which takes no alias.
  assert.strictEqual(s.env.SECURITY_REVIEW_MODEL, 'claude-sonnet-5-5');
  assert.strictEqual(s.env.SG_AGENTIC_MODEL, 'claude-sonnet-5-5');
  assert.match(s.statusLine.command, /statusline\.js/);
  assert.ok(fs.existsSync(path.join(p.runtime, 'ado-mcp.js')));

  tk.addAdoServer(p, 'https://tfs.local/tfs/DefaultCollection/');
  const r2 = recorder();
  const m = tk.restore(p, undefined, r2.exec);
  assert.strictEqual(m.stamp, 'b1');
  assert.strictEqual(read(path.join(p.claude, 'settings.json')), before);
  assert.strictEqual(read(path.join(p.claude, 'CLAUDE.md')), 'meu claude.md');
  assert.strictEqual(read(path.join(p.claude, 'skills/minha/SKILL.md')), 'skill');
  assert.deepStrictEqual(JSON.parse(read(p.claudeJson)).mcpServers, { context7: { url: 'x' } });
  assert.deepStrictEqual(r2.calls, [
    'claude plugin uninstall cctk@cctk',
    'claude plugin uninstall security-guidance@claude-plugins-official',
    'claude plugin marketplace add DietrichGebert/ponytail',
    'claude plugin install ponytail@ponytail',
  ]);
});

test('restore removes the toolkit CLAUDE.md when the user had none', () => {
  const p = fakeHome();
  fs.rmSync(path.join(p.claude, 'CLAUDE.md'));
  tk.backup(p, 'b1');
  tk.writeConfig(p, {});
  tk.restore(p, 'b1', recorder().exec);
  assert.ok(!fs.existsSync(path.join(p.claude, 'CLAUDE.md')));
});

test('ado: one entry per collection, PAT never in the config', () => {
  const p = fakeHome();
  assert.strictEqual(tk.adoName('https://tfs.local/tfs/Default Collection'), 'ado-default-collection');
  tk.addAdoServer(p, 'https://tfs.local/tfs/ColA');
  tk.addAdoServer(p, 'https://tfs.local/tfs/ColB/');
  const servers = JSON.parse(read(p.claudeJson)).mcpServers;
  assert.deepStrictEqual(servers['ado-colb'].args.slice(1), ['https://tfs.local/tfs/ColB', 'ado-colb']);
  assert.ok(servers['ado-cola'] && servers.context7);
  assert.doesNotMatch(JSON.stringify(servers), /PAT/);
});

test('vault set/list/rm: values only in the credential store, names on disk', { skip: noStore }, () => withHome(fakeHome().home, () => {
  tk.vaultSet('API_TOKEN', 'a=b');
  tk.vaultSet('DB', 'x');
  tk.vaultSet('API_TOKEN', 'novo');
  assert.deepStrictEqual(tk.vaultList(), ['API_TOKEN', 'DB']);
  const vault = require('../plugins/cctk/hooks/vault.js');
  assert.deepStrictEqual(vault.readVault(), { API_TOKEN: 'novo', DB: 'x' });
  const disk = fs.readdirSync(path.join(os.homedir(), '.cctk'), { recursive: true })
    .map((f) => path.join(os.homedir(), '.cctk', f)).filter((f) => fs.statSync(f).isFile()).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(disk, /novo|=x/);
  tk.vaultRm('DB');
  assert.deepStrictEqual(tk.vaultList(), ['API_TOKEN']);
  assert.throws(() => tk.vaultSet('bad name', 'x'));
  assert.throws(() => tk.vaultSet('OK', 'a\nb'));

  // 1.2.0 kept plain NAME=value lines: the migration moves them in, keeps what the store has, deletes the file
  fs.writeFileSync(path.join(os.homedir(), '.cctk', 'secrets.env'), 'API_TOKEN=velho\nNOVA=y\n');
  vault.migrateVault();
  assert.deepStrictEqual(vault.readVault(), { API_TOKEN: 'novo', NOVA: 'y' });
  assert.ok(!fs.existsSync(path.join(os.homedir(), '.cctk', 'secrets.env')));
}));

test('setWorkDir: saves the repos folder, refuses the home, a drive root or a missing folder', () => {
  const p = fakeHome();
  const settings = () => JSON.parse(read(path.join(p.claude, 'settings.json')));
  const repos = path.join(p.home, 'repos');
  fs.mkdirSync(repos);
  assert.match(tk.setWorkDir(p, p.home), /ampla demais/);
  assert.match(tk.setWorkDir(p, path.parse(p.home).root), /ampla demais/);
  assert.match(tk.setWorkDir(p, path.dirname(p.home)), /ampla demais/);
  assert.match(tk.setWorkDir(p, path.join(p.home, 'nao-existe')), /não existe/);
  assert.strictEqual(settings().permissions?.additionalDirectories, undefined, 'nothing saved on refusal');
  assert.strictEqual(tk.setWorkDir(p, '~/repos'), null);
  assert.deepStrictEqual(settings().permissions.additionalDirectories, [repos]);
  assert.strictEqual(settings().model, 'opus', 'the rest of settings.json stays');
  assert.strictEqual(tk.setWorkDir(p, ''), null, 'empty = asked, nothing added');
  assert.deepStrictEqual(settings().permissions.additionalDirectories, [repos]);
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-repos-')); // outside the home (another drive on many PCs)
  assert.strictEqual(tk.setWorkDir(p, other), null);
  assert.deepStrictEqual(settings().permissions.additionalDirectories, [repos, other]);

  const q = fakeHome();
  tk.setWorkDir(q, '');
  assert.deepStrictEqual(JSON.parse(read(path.join(q.claude, 'settings.json'))).permissions.additionalDirectories, [], 'skipping is remembered');
});

test('run() keeps JSON and spaces intact through the shell', () => {
  const r = tk.run(process.execPath, ['-e', 'console.log(JSON.stringify(process.argv.slice(1)))', '["propose","verify"]', 'a b']);
  assert.deepStrictEqual(JSON.parse(r.stdout), ['["propose","verify"]', 'a b']);
});

test('creds: OS store round trip', { skip: noStore }, () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-cred-'));
  const prev = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = process.env.USERPROFILE = home;
  try {
    const { setCred, getCred } = require('../plugins/cctk/hooks/creds.js');
    const name = `tk-test-${process.pid}`;
    setCred(name, 'p@t$ "x"');
    assert.strictEqual(getCred(name), 'p@t$ "x"');
    assert.strictEqual(getCred('nao-existe-xyz'), null);
  } finally {
    Object.assign(process.env, prev);
  }
});

test('stats: dedupes messages, ignores subagents for switches, counts gate catches', async () => {
  const { stats } = await import('../lib/stats.mjs');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-stats-'));
  const p = tk.paths(home);
  const now = Date.now();
  const ts = (h) => new Date(now - h * 3600000).toISOString();
  const msg = (id, model, h, session = 'S1') => JSON.stringify({ type: 'assistant', timestamp: ts(h), sessionId: session,
    message: { id, model, usage: { input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 5 } } });
  const proj = path.join(p.claude, 'projects', 'D--repo');
  fs.mkdirSync(path.join(proj, 'S1', 'subagents'), { recursive: true });
  // m1 spans two lines (same id): counted once. S1 switches sonnet → opus; S2 stays on sonnet.
  fs.writeFileSync(path.join(proj, 'S1.jsonl'), [msg('m1', 'claude-sonnet-5-5', 3), msg('m1', 'claude-sonnet-5-5', 3),
    msg('m2', 'claude-opus-5-5', 2), '{"type":"user"}', 'linha parcial {'].join('\n'));
  fs.writeFileSync(path.join(proj, 'S2.jsonl'), msg('m3', 'claude-sonnet-5-5', 2, 'S2'));
  // A subagent on haiku inside S2 is not a switch.
  fs.writeFileSync(path.join(proj, 'S1', 'subagents', 'agent-x.jsonl'), msg('m4', 'claude-haiku-5-5', 2, 'S2'));
  const gate = path.join(p.claude, 'plugins', 'data', 'cctk-cctk', 'gate.log');
  fs.mkdirSync(path.dirname(gate), { recursive: true });
  fs.writeFileSync(gate, [['S1', 'fail', 3], ['S1', 'pass', 2], ['S2', 'fail', 2], ['S2', 'giveup', 1]]
    .map(([session, result, h]) => JSON.stringify({ ts: ts(h), session, result })).join('\n'));

  // 3h ago may fall in the previous week right after Monday 00:00 UTC: sum across weeks.
  const weeks = stats(p, 7);
  const sum = (f) => weeks.reduce((s, w) => s + f(w), 0);
  assert.strictEqual(sum((w) => w.fresh), 4 * 115);
  assert.strictEqual(sum((w) => w.cacheRead), 4 * 1000);
  assert.strictEqual(sum((w) => w.switches), weeks.length === 1 ? 1 : 0); // a switch split across weeks isn't seen as one
  assert.deepStrictEqual([sum((w) => w.gate.fail), sum((w) => w.gate.caught), sum((w) => w.gate.giveup)], [2, 1, 1]);
  assert.ok(Object.keys(weeks.at(-1).models).includes('claude-haiku-5-5'));
});

test('stats: warns when Opus is over 30% of the week', async () => {
  const { format } = await import('../lib/stats.mjs');
  const week = (models) => [{ week: '2026-11-16', sessions: 1, fresh: 100, cacheRead: 0, cacheHit: 0, models, switches: 0, gate: { fail: 0, caught: 0, giveup: 0 } }];
  assert.match(format(week({ 'claude-opus-5-5': 80, 'claude-sonnet-5-5': 20 }), 7), /80% no Opus/);
  assert.doesNotMatch(format(week({ 'claude-opus-5-5': 20, 'claude-sonnet-5-5': 80 }), 7), /no Opus/);
});

test('release: package, plugin and the ref init-project writes share one version', () => {
  const plugin = JSON.parse(fs.readFileSync(path.join(tk.REPO_ROOT, 'plugins/cctk/.claude-plugin/plugin.json'), 'utf8'));
  assert.strictEqual(plugin.version, tk.VERSION);
  const skill = fs.readFileSync(path.join(tk.REPO_ROOT, 'plugins/cctk/skills/init-project/SKILL.md'), 'utf8');
  assert.ok(skill.includes(`"ref": "v${tk.VERSION}"`), 'init-project must pin the team marketplace to this version');
  if (!process.env.CCTK_MARKETPLACE) assert.strictEqual(tk.MARKETPLACE_SOURCE, `AlfredoNeeto/cctk#v${tk.VERSION}`);
});

test('release: README and guide use the npm package and their relative links exist', () => {
  for (const doc of ['README.md', 'docs/GUIA.md', 'docs/PROMPTS.md', 'bench/README.md']) {
    const text = fs.readFileSync(path.join(tk.REPO_ROOT, doc), 'utf8');
    if (!doc.includes('/') || doc.endsWith('GUIA.md')) {
      assert.match(text, /npm i -g @alfredoneeto\/cctk/, `${doc}: install command`);
      assert.doesNotMatch(text, /npx github:/, `${doc}: the github: install is gone since 1.2.0`);
    }
    const links = [...text.matchAll(/\]\(((?!https?:|#)[^)#]+)[^)]*\)|\b(?:src|srcset)="((?!https?:)[^"]+)"/g)];
    for (const [, md, html] of links) {
      const link = md || html;
      assert.ok(fs.existsSync(path.join(tk.REPO_ROOT, path.dirname(doc), link)), `${doc} links to missing ${link}`);
    }
  }
  assert.match(fs.readFileSync(path.join(tk.REPO_ROOT, 'README.md'), 'utf8'), new RegExp(`vers%C3%A3o-${tk.VERSION}-`), 'version badge');
});
