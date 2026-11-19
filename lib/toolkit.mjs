// Installer building blocks. Every function takes the paths object so tests can point it at a fake home.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// TOOLKIT_MARKETPLACE lets you install from a local clone while testing.
export const MARKETPLACE_SOURCE = process.env.TOOLKIT_MARKETPLACE || 'AlfredoNeeto/claude-toolkit';
export const PLUGIN_ID = 'toolkit-dev@claude-toolkit';
export const SECURITY_PLUGIN = 'security-guidance@claude-plugins-official';
// A fresh Claude Code only ships 'anthropic-plugin-directory'; SECURITY_PLUGIN needs this marketplace added first.
export const OFFICIAL_MARKETPLACE = 'anthropics/claude-plugins-official';
export const OPENSPEC = '@fission-ai/openspec@2.1.0';
export const PLAYWRIGHT_CLI = '@playwright/cli@0.1.25';
export const OPENSPEC_WORKFLOWS = ['propose', 'explore', 'apply', 'update', 'sync', 'archive', 'verify'];

const FILES = ['settings.json', 'CLAUDE.md', 'keybindings.json', 'plugins/installed_plugins.json', 'plugins/known_marketplaces.json'];
const DIRS = ['skills', 'agents', 'commands', 'output-styles'];
const RUNTIME = ['statusline.js', 'ado-mcp.js', 'creds.js'];

export const DENY = [
  'Read(**/.env)', 'Read(**/.env.*)', 'Read(**/secrets/**)', 'Read(**/*.pfx)', 'Read(**/*.pem)', 'Read(**/*.key)',
  'Read(**/dbhub.toml)', 'Read(~/.ssh/**)', 'Read(~/.claude-toolkit/**)', 'Edit(~/.claude-toolkit/**)',
  'Read(~/AppData/Roaming/Microsoft/UserSecrets/**)', 'Read(~/.microsoft/usersecrets/**)',
];

const GLOBAL_CLAUDE_MD = `# Preferências pessoais
- Responda em português do Brasil.
- Ao dizer que algo está pronto, mostre o comando de verificação que rodou e a saída dele.
- Antes de implementar, liste as regras implícitas que o pedido não diz mas um especialista do domínio
  esperaria, incluindo entradas inválidas. Escreva um teste para cada uma, rode e veja falhar; só então implemente.
`;

export function paths(home = os.homedir()) {
  const claude = path.join(home, '.claude');
  const toolkit = path.join(home, '.claude-toolkit');
  return { home, claude, claudeJson: path.join(home, '.claude.json'), toolkit, backups: path.join(toolkit, 'backups'), runtime: path.join(claude, 'toolkit') };
}

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n'); };

// Windows needs a shell for .cmd shims (claude/npm/openspec); quote args so JSON and spaces survive cmd.exe.
export function run(cmd, args = [], opts = {}) {
  const win = process.platform === 'win32';
  const q = (a) => (win ? `"${String(a).replace(/"/g, '\\"')}"` : a);
  const r = win
    ? spawnSync([/\s/.test(cmd) ? q(cmd) : cmd, ...args.map(q)].join(' '), { shell: true, encoding: 'utf8', ...opts })
    : spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return { status: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || (r.error ? r.error.message : '') };
}

export function snapshot(p) {
  const settings = readJson(path.join(p.claude, 'settings.json')) || {};
  const count = (d) => { try { return fs.readdirSync(path.join(p.claude, d)).length; } catch { return 0; } };
  return {
    plugins: Object.keys(settings.enabledPlugins || {}).filter((k) => settings.enabledPlugins[k] && k !== PLUGIN_ID),
    mcpServers: Object.keys(readJson(p.claudeJson)?.mcpServers || {}),
    dirs: Object.fromEntries(DIRS.map((d) => [d, count(d)])),
  };
}

export function backup(p, stamp = new Date().toISOString().replace(/[:.]/g, '-')) {
  const dir = path.join(p.backups, stamp);
  const saved = [];
  for (const rel of [...FILES, ...DIRS]) {
    const src = path.join(p.claude, rel);
    if (!fs.existsSync(src)) continue;
    fs.cpSync(src, path.join(dir, 'claude', rel), { recursive: true });
    saved.push(rel);
  }
  writeJson(path.join(dir, 'mcpServers.json'), readJson(p.claudeJson)?.mcpServers || {});
  writeJson(path.join(dir, 'manifest.json'), { stamp, created: new Date().toISOString(), saved, ...snapshot(p) });
  return dir;
}

export function clean(p, exec = run) {
  for (const id of snapshot(p).plugins) exec('claude', ['plugin', 'uninstall', id]);
  for (const d of DIRS) fs.rmSync(path.join(p.claude, d), { recursive: true, force: true });
  const cj = readJson(p.claudeJson);
  if (cj) { cj.mcpServers = {}; writeJson(p.claudeJson, cj); } // the rest of ~/.claude.json (login, projects) stays
}

export function writeConfig(p, previous = {}) {
  fs.mkdirSync(p.runtime, { recursive: true });
  for (const f of RUNTIME) fs.copyFileSync(path.join(REPO_ROOT, 'runtime', f), path.join(p.runtime, f));
  const fwd = (f) => path.join(p.runtime, f).replace(/\\/g, '/');
  const settings = {
    model: 'sonnet',
    modelSettings: { 'claude-sonnet-5-5': { effortLevel: 'medium' } },
    outputStyle: 'Concise',
    // Prompt suggestions send an extra request after every reply (code.claude.com/docs/en/costs).
    env: { CLAUDE_CODE_SUBAGENT_MODEL: 'sonnet', CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION: 'false' },
    permissions: { deny: DENY },
    statusLine: { type: 'command', command: `node "${fwd('statusline.js')}"` },
    disableSkillShellExecution: true,
  };
  if (previous.theme) settings.theme = previous.theme;
  // shortcut: sandbox only where it works out of the box (macOS); Linux/WSL2 need bubblewrap+socat, enable by hand.
  if (process.platform === 'darwin') settings.sandbox = { enabled: true };
  writeJson(path.join(p.claude, 'settings.json'), settings);
  fs.writeFileSync(path.join(p.claude, 'CLAUDE.md'), GLOBAL_CLAUDE_MD);
}

export function installTools(exec = run) {
  const steps = [
    ['npm', ['install', '-g', OPENSPEC]],
    ['npm', ['install', '-g', PLAYWRIGHT_CLI]],
    ['openspec', ['config', 'set', 'profile', 'custom']],
    ['openspec', ['config', 'set', 'workflows', JSON.stringify(OPENSPEC_WORKFLOWS)]],
    ['claude', ['plugin', 'marketplace', 'add', MARKETPLACE_SOURCE]],
    ['claude', ['plugin', 'install', PLUGIN_ID]],
    // Separate step, not a plugin.json dependency: an unmet dependency disables the whole toolkit plugin.
    ['claude', ['plugin', 'marketplace', 'add', OFFICIAL_MARKETPLACE]],
    ['claude', ['plugin', 'install', SECURITY_PLUGIN]],
  ];
  const failed = [];
  for (const [cmd, args] of steps) {
    const r = exec(cmd, args);
    if (r.status !== 0) failed.push(`${cmd} ${args.join(' ')}\n${r.stderr.trim()}`);
  }
  return failed;
}

export const latestBackup = (p) => (fs.existsSync(p.backups) ? fs.readdirSync(p.backups).sort().pop() : undefined);

export function restore(p, stamp = latestBackup(p), exec = run) {
  if (!stamp) throw new Error('Nenhum backup encontrado.');
  const dir = path.join(p.backups, stamp);
  const manifest = readJson(path.join(dir, 'manifest.json'));
  if (!manifest) throw new Error(`Backup inválido: ${dir}`);

  exec('claude', ['plugin', 'uninstall', PLUGIN_ID]);
  if (!manifest.plugins.includes(SECURITY_PLUGIN)) exec('claude', ['plugin', 'uninstall', SECURITY_PLUGIN]);
  for (const d of DIRS) fs.rmSync(path.join(p.claude, d), { recursive: true, force: true });
  if (!manifest.saved.includes('CLAUDE.md')) fs.rmSync(path.join(p.claude, 'CLAUDE.md'), { force: true });
  for (const rel of manifest.saved) fs.cpSync(path.join(dir, 'claude', rel), path.join(p.claude, rel), { recursive: true, force: true });

  const cj = readJson(p.claudeJson) || {};
  cj.mcpServers = readJson(path.join(dir, 'mcpServers.json')) || {};
  writeJson(p.claudeJson, cj);

  const known = readJson(path.join(dir, 'claude', 'plugins', 'known_marketplaces.json')) || {};
  for (const m of Object.values(known)) {
    const s = m.source || {};
    const src = s.repo || s.url || s.path;
    if (src) exec('claude', ['plugin', 'marketplace', 'add', src]);
  }
  for (const id of manifest.plugins) exec('claude', ['plugin', 'install', id]);
  return manifest;
}

// --- Azure DevOps on-prem ---

export function adoName(url) {
  const seg = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || 'default');
  return `ado-${seg.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export async function testPat(url, pat) {
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/_apis/projects?api-version=5.0&$top=1`, {
      headers: { Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function addAdoServer(p, url, name = adoName(url)) {
  const cj = readJson(p.claudeJson) || {};
  cj.mcpServers = cj.mcpServers || {};
  cj.mcpServers[name] = { type: 'stdio', command: 'node', args: [path.join(p.runtime, 'ado-mcp.js').replace(/\\/g, '/'), url.replace(/\/+$/, ''), name] };
  writeJson(p.claudeJson, cj);
  return name;
}

// --- Vault (~/.claude-toolkit/secrets.env) ---

const vaultFile = (p) => path.join(p.toolkit, 'secrets.env');

export function vaultList(p) {
  if (!fs.existsSync(vaultFile(p))) return [];
  return fs.readFileSync(vaultFile(p), 'utf8').split(/\r?\n/).map((l) => l.split('=')[0]).filter(Boolean);
}

export function vaultSet(p, name, value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error('Nome inválido: use letras, números e _ (ex.: API_TOKEN).');
  if (/[\r\n]/.test(value)) throw new Error('O valor não pode ter quebra de linha.');
  vaultWrite(p, [...vaultLines(p).filter((l) => !l.startsWith(`${name}=`)), `${name}=${value}`]);
}

export function vaultRm(p, name) {
  vaultWrite(p, vaultLines(p).filter((l) => !l.startsWith(`${name}=`)));
}

const vaultLines = (p) => (fs.existsSync(vaultFile(p)) ? fs.readFileSync(vaultFile(p), 'utf8').split(/\r?\n/).filter(Boolean) : []);
function vaultWrite(p, lines) {
  fs.mkdirSync(p.toolkit, { recursive: true });
  fs.writeFileSync(vaultFile(p), lines.join('\n') + '\n', { mode: 0o600 });
}
