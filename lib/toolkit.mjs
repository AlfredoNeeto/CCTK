// Installer building blocks. Every function takes the paths object so tests can point it at a fake home.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const VERSION = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version;
// Pinned to the tag of this package's version, so the plugin matches the CLI that installed it (the main branch
// may already be ahead). CCTK_MARKETPLACE lets you install from a local clone while testing.
export const MARKETPLACE_SOURCE = process.env.CCTK_MARKETPLACE || `AlfredoNeeto/cctk#v${VERSION}`;
export const PLUGIN_ID = 'cctk@cctk';
export const OLD_PLUGIN_ID = 'toolkit-dev@claude-toolkit'; // before 1.2.0 the kit was "Claude Toolkit Dev"
export const SECURITY_PLUGIN = 'security-guidance@claude-plugins-official';
// A fresh Claude Code only ships 'anthropic-plugin-directory'; SECURITY_PLUGIN needs this marketplace added first.
export const OFFICIAL_MARKETPLACE = 'anthropics/claude-plugins-official';
export const OPENSPEC = '@fission-ai/openspec@2.1.0';
export const PLAYWRIGHT_CLI = '@playwright/cli@0.1.25';
export const OPENSPEC_WORKFLOWS = ['propose', 'explore', 'apply', 'update', 'sync', 'archive', 'verify'];

const FILES = ['settings.json', 'CLAUDE.md', 'keybindings.json', 'plugins/installed_plugins.json', 'plugins/known_marketplaces.json'];
const DIRS = ['skills', 'agents', 'commands', 'output-styles'];
// Runtime copied to ~/.claude/cctk: the status line and the ADO MCP launcher, which reads PATs through the plugin's creds.js.
const RUNTIME = ['runtime/statusline.js', 'runtime/ado-mcp.js', 'plugins/cctk/hooks/creds.js'];

export const DENY = [
  'Read(**/.env)', 'Read(**/.env.*)', 'Read(**/secrets/**)', 'Read(**/*.pfx)', 'Read(**/*.pem)', 'Read(**/*.key)',
  'Read(**/dbhub.toml)', 'Read(~/.ssh/**)', 'Read(~/.cctk/**)', 'Edit(~/.cctk/**)',
  'Read(~/AppData/Roaming/Microsoft/UserSecrets/**)', 'Read(~/.microsoft/usersecrets/**)',
];

const GLOBAL_CLAUDE_MD = `# Preferências pessoais
- Responda em português do Brasil.
- Ao dizer que algo está pronto, mostre o comando de verificação que rodou e a saída dele.
`;

export function paths(home = os.homedir()) {
  const claude = path.join(home, '.claude');
  const toolkit = path.join(home, '.cctk');
  return { home, claude, claudeJson: path.join(home, '.claude.json'), toolkit, backups: path.join(toolkit, 'backups'), runtime: path.join(claude, 'cctk') };
}

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n'); };

// Windows needs a shell for .cmd shims (claude/npm/openspec); quote args so JSON and spaces survive cmd.exe.
// GIT_TERMINAL_PROMPT=0: a marketplace clone that asks for a password fails instead of hanging the installer.
export function run(cmd, args = [], opts = {}) {
  const win = process.platform === 'win32';
  const q = (a) => (win ? `"${String(a).replace(/"/g, '\\"')}"` : a);
  const o = { encoding: 'utf8', windowsHide: true, ...opts, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...opts.env } };
  const r = win
    ? spawnSync([/\s/.test(cmd) ? q(cmd) : cmd, ...args.map(q)].join(' '), { shell: true, ...o })
    : spawnSync(cmd, args, o);
  const err = r.error?.code === 'ETIMEDOUT' ? `tempo esgotado (${Math.round(opts.timeout / 1000)} s)` : r.error?.message;
  return { status: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || err || '' };
}

// The kit's settings point the status line at its runtime copy: that tells an update from a first install.
// toolkit/ is the runtime folder before 1.2.0.
export const isKit = (settings) => /(toolkit|cctk)\/statusline\.js/.test(String(settings?.statusLine?.command || ''));
// MCP entries the kit wrote itself (ado add): an update keeps them.
export const kitMcp = (server) => /(toolkit|cctk)\/ado-mcp\.js$/.test(String(server?.args?.[0] || ''));

export function snapshot(p) {
  const settings = readJson(path.join(p.claude, 'settings.json')) || {};
  const kit = isKit(settings);
  const count = (d) => { try { return fs.readdirSync(path.join(p.claude, d)).length; } catch { return 0; } };
  const mcp = readJson(p.claudeJson)?.mcpServers || {};
  return {
    kit,
    plugins: Object.keys(settings.enabledPlugins || {})
      .filter((k) => settings.enabledPlugins[k] && k !== PLUGIN_ID && k !== OLD_PLUGIN_ID && !(kit && k === SECURITY_PLUGIN)),
    mcpServers: Object.keys(mcp).filter((k) => !kitMcp(mcp[k])),
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
  if (cj) { // the rest of ~/.claude.json (login, projects) stays
    cj.mcpServers = Object.fromEntries(Object.entries(cj.mcpServers || {}).filter(([, v]) => kitMcp(v)));
    writeJson(p.claudeJson, cj);
  }
}

// Before 1.2.0 the kit lived in ~/.claude-toolkit and ~/.claude/toolkit as plugin toolkit-dev@claude-toolkit.
// Moves its data (backups, creds, trusted checks, vault), drops the old plugin and repoints the ado-* MCPs.
export function migrate(p, exec = run) {
  const oldData = path.join(p.home, '.claude-toolkit');
  if (fs.existsSync(oldData)) {
    fs.cpSync(oldData, p.toolkit, { recursive: true, force: false }); // never overwrite what ~/.cctk already has
    fs.rmSync(oldData, { recursive: true, force: true });
  }
  const settings = readJson(path.join(p.claude, 'settings.json')) || {};
  if (settings.enabledPlugins?.[OLD_PLUGIN_ID] !== undefined) {
    exec('claude', ['plugin', 'uninstall', OLD_PLUGIN_ID], { timeout: 120000 });
    exec('claude', ['plugin', 'marketplace', 'remove', 'claude-toolkit'], { timeout: 120000 });
  }
  fs.rmSync(path.join(p.claude, 'toolkit'), { recursive: true, force: true });
  const cj = readJson(p.claudeJson);
  const ado = path.join(p.runtime, 'ado-mcp.js').replace(/\\/g, '/');
  if (cj?.mcpServers) {
    for (const s of Object.values(cj.mcpServers)) if (kitMcp(s)) Object.assign(s, { args: [ado, ...s.args.slice(1)], env: { ...ADO_ENV, ...s.env } });
    writeJson(p.claudeJson, cj);
  }
}

// merge (an update): keep the user's settings and overwrite only the kit's keys; a first install starts clean.
export function writeConfig(p, previous = {}, merge = false) {
  fs.mkdirSync(p.runtime, { recursive: true });
  for (const f of RUNTIME) fs.copyFileSync(path.join(REPO_ROOT, f), path.join(p.runtime, path.basename(f)));
  const fwd = (f) => path.join(p.runtime, f).replace(/\\/g, '/');
  const kit = {
    model: 'sonnet',
    modelSettings: { 'claude-sonnet-5-5': { effortLevel: 'medium' } },
    outputStyle: 'Concise',
    // Prompt suggestions send an extra request after every reply (code.claude.com/docs/en/costs).
    // MCP_ALLOWLIST_ENV: stdio MCPs (npm code) get only a safe baseline (PATH, USERPROFILE, APPDATA, TEMP...) plus their own
    // env, not the shell's tokens. Checked with Claude Code 2.1.329 on Windows.
    env: { CLAUDE_CODE_SUBAGENT_MODEL: 'sonnet', CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION: 'false', CLAUDE_CODE_MCP_ALLOWLIST_ENV: '1' },
    // blockWrites...: Edit/Write refuse paths outside the project (and /add-dir) in every mode, auto included. On native
    // Windows there is no sandbox, so this is the only write fence. Claude Code's own plan/memory files stay writable.
    permissions: { deny: DENY, blockWritesOutsideWorkingDirectories: true },
    statusLine: { type: 'command', command: `node "${fwd('statusline.js')}"` },
    disableSkillShellExecution: true,
  };
  const base = merge ? previous : previous.theme ? { theme: previous.theme } : {};
  const settings = {
    ...base,
    ...kit,
    env: { ...(merge && previous.env), ...kit.env },
    permissions: { ...(merge && previous.permissions), ...kit.permissions, deny: [...new Set([...((merge && previous.permissions?.deny) || []), ...DENY])] },
  };
  if (settings.enabledPlugins) delete settings.enabledPlugins[OLD_PLUGIN_ID];
  if (settings.extraKnownMarketplaces) delete settings.extraKnownMarketplaces['claude-toolkit']; // or Claude Code re-adds it
  // `marketplace add` with the new tag fails while this entry still names the old one.
  const market = settings.extraKnownMarketplaces?.cctk?.source;
  if (market?.ref) market.ref = `v${VERSION}`;
  // Sandbox only where it works: macOS out of the box, Linux/WSL2 when bubblewrap and socat are installed.
  const linuxSandbox = () => run('sh', ['-c', 'command -v bwrap && command -v socat'], { timeout: 15000 }).status === 0;
  if (process.platform === 'darwin' || (process.platform === 'linux' && linuxSandbox())) settings.sandbox = { enabled: true };
  writeJson(path.join(p.claude, 'settings.json'), settings);
  const md = path.join(p.claude, 'CLAUDE.md');
  if (!merge || !fs.existsSync(md)) fs.writeFileSync(md, GLOBAL_CLAUDE_MD); // an update keeps what the user added
}

// The folder that holds the user's repositories: with blockWritesOutsideWorkingDirectories, folders in the user's
// additionalDirectories count as working directories, so Claude edits sibling repos without /add-dir. [] = asked, none.
// Returns an error message, or null when saved.
export function setWorkDir(p, dir) {
  const f = path.join(p.claude, 'settings.json');
  const s = readJson(f) || {};
  let dirs = [];
  if (dir) {
    const abs = path.resolve(dir.replace(/^~(?=$|[\\/])/, p.home));
    if (!fs.statSync(abs, { throwIfNoEntry: false })?.isDirectory()) return `${abs} não existe ou não é uma pasta.`;
    // The home or a drive root would open ~/.ssh, ~/.claude and everything else to edits.
    const rel = path.relative(abs, p.home); // '' or 'Users/x' when abs holds the home; absolute across drives
    if (abs === path.parse(abs).root || rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
      return `${abs} é ampla demais (contém a sua pasta de usuário ou é a raiz do disco). Use a pasta dos repositórios.`;
    }
    dirs = [abs];
  }
  s.permissions = { ...s.permissions, additionalDirectories: [...new Set([...(s.permissions?.additionalDirectories || []), ...dirs])] };
  writeJson(f, s);
  return null;
}

// update: `plugin install` leaves an installed plugin at its old version, so `plugin update` follows it. The
// marketplace re-add only works because writeConfig already moved the ref in extraKnownMarketplaces (Claude Code
// 2.1.329, checked by hand). Removing the marketplace instead would also delete the plugin's data (gate log).
export function installTools(exec = run, { update = false, log = () => {} } = {}) {
  const steps = [
    ['Instalando o OpenSpec', 'npm', ['install', '-g', OPENSPEC]],
    ['Instalando o Playwright CLI', 'npm', ['install', '-g', PLAYWRIGHT_CLI]],
    ['Configurando o OpenSpec', 'openspec', ['config', 'set', 'profile', 'custom']],
    ['Configurando os workflows do OpenSpec', 'openspec', ['config', 'set', 'workflows', JSON.stringify(OPENSPEC_WORKFLOWS)]],
    ['Adicionando o marketplace do cctk', 'claude', ['plugin', 'marketplace', 'add', MARKETPLACE_SOURCE]],
    ['Instalando o plugin cctk', 'claude', ['plugin', 'install', PLUGIN_ID]],
    ...(update ? [['Atualizando o plugin cctk', 'claude', ['plugin', 'update', PLUGIN_ID]]] : []),
    // Separate step, not a plugin.json dependency: an unmet dependency disables the whole toolkit plugin.
    ['Adicionando o marketplace oficial', 'claude', ['plugin', 'marketplace', 'add', OFFICIAL_MARKETPLACE]],
    ['Instalando o security-guidance', 'claude', ['plugin', 'install', SECURITY_PLUGIN]],
  ];
  const failed = [];
  steps.forEach(([label, cmd, args, optional], i) => {
    log(`[${i + 1}/${steps.length}] ${label}… `);
    const r = exec(cmd, args, { timeout: cmd === 'npm' ? 300000 : 120000 });
    const ok = r.status === 0 || optional;
    log(ok ? '✔\n' : '✖\n');
    if (!ok) failed.push(`${cmd} ${args.join(' ')}\n${r.stderr.trim()}`);
  });
  return failed;
}

// The newest backup taken before the kit was installed: one taken during an update holds the kit itself.
export function latestBackup(p) {
  const all = fs.existsSync(p.backups) ? fs.readdirSync(p.backups).sort() : [];
  return all.findLast((b) => !isKit(readJson(path.join(p.backups, b, 'claude', 'settings.json')))) ?? all.pop();
}

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
    if (src) exec('claude', ['plugin', 'marketplace', 'add', s.ref && !s.path ? `${src}#${s.ref}` : src]);
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
      signal: AbortSignal.timeout(10000), // an unreachable server must not hang ado add or doctor
    });
    return res.ok;
  } catch {
    return false;
  }
}

// With MCP_ALLOWLIST_ENV the ADO MCP no longer inherits the shell: forward what an on-prem server behind a corporate
// proxy or internal CA needs. ${X:-} expands to empty when X is unset (checked with the real claude mcp list).
export const ADO_ENV = Object.fromEntries(['HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY', 'NODE_EXTRA_CA_CERTS'].map((k) => [k, `\${${k}:-}`]));

export function addAdoServer(p, url, name = adoName(url)) {
  const cj = readJson(p.claudeJson) || {};
  cj.mcpServers = cj.mcpServers || {};
  cj.mcpServers[name] = { type: 'stdio', command: 'node', args: [path.join(p.runtime, 'ado-mcp.js').replace(/\\/g, '/'), url.replace(/\/+$/, ''), name], env: ADO_ENV };
  writeJson(p.claudeJson, cj);
  return name;
}

// --- Vault: values in the OS credential store, names in ~/.cctk/secrets.names (plugins/cctk/hooks/vault.js) ---

const vault = createRequire(import.meta.url)('../plugins/cctk/hooks/vault.js');

export const vaultList = () => vault.listNames();

export function vaultSet(name, value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error('Nome inválido: use letras, números e _ (ex.: API_TOKEN).');
  if (/[\r\n]/.test(value)) throw new Error('O valor não pode ter quebra de linha.');
  vault.writeVault({ ...vault.loadVault(), [name]: value });
}

export function vaultRm(name) {
  const { [name]: _, ...rest } = vault.loadVault();
  vault.writeVault(rest);
}
