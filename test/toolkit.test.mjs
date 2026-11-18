// node --test test/
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as tk from '../lib/toolkit.mjs';

const require = createRequire(import.meta.url);

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
  assert.strictEqual(s.theme, 'dark');
  assert.ok(s.permissions.deny.includes('Read(**/.env)'));
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
    'claude plugin uninstall toolkit-dev@claude-toolkit',
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

test('vault set/list/rm', () => {
  const p = fakeHome();
  tk.vaultSet(p, 'API_TOKEN', 'a=b');
  tk.vaultSet(p, 'DB', 'x');
  tk.vaultSet(p, 'API_TOKEN', 'novo');
  assert.deepStrictEqual(tk.vaultList(p), ['DB', 'API_TOKEN']);
  assert.match(read(path.join(p.toolkit, 'secrets.env')), /^DB=x\nAPI_TOKEN=novo\n$/);
  tk.vaultRm(p, 'DB');
  assert.deepStrictEqual(tk.vaultList(p), ['API_TOKEN']);
  assert.throws(() => tk.vaultSet(p, 'bad name', 'x'));
  assert.throws(() => tk.vaultSet(p, 'OK', 'a\nb'));
});

test('run() keeps JSON and spaces intact through the shell', () => {
  const r = tk.run(process.execPath, ['-e', 'console.log(JSON.stringify(process.argv.slice(1)))', '["propose","verify"]', 'a b']);
  assert.deepStrictEqual(JSON.parse(r.stdout), ['["propose","verify"]', 'a b']);
});

test('creds: OS store round trip', { skip: process.platform === 'linux' && !process.env.DBUS_SESSION_BUS_ADDRESS }, () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-cred-'));
  const prev = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = process.env.USERPROFILE = home;
  try {
    const { setCred, getCred } = require('../runtime/creds.js');
    const name = `tk-test-${process.pid}`;
    setCred(name, 'p@t$ "x"');
    assert.strictEqual(getCred(name), 'p@t$ "x"');
    assert.strictEqual(getCred('nao-existe-xyz'), null);
  } finally {
    Object.assign(process.env, prev);
  }
});
