#!/usr/bin/env node
// cctk <install [--yes] [--dry-run] | update | restore [backup] | doctor | trust | secret set|list|rm NAME | ado add URL | stats [dias]>
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createRequire } from 'node:module';
import * as tk from './lib/toolkit.mjs';
import { stats, format } from './lib/stats.mjs';

const require = createRequire(import.meta.url);
const { setCred, getCred } = require('./runtime/creds.js');
const { trust, isTrusted, readCheck } = require('./plugins/cctk/hooks/trust.js');
const p = tk.paths();
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));

let piped; // one reader for piped stdin: a readline per question would drop answers sent together
function ask(q) {
  if (!process.stdin.isTTY) {
    piped ??= readline.createInterface({ input: process.stdin })[Symbol.asyncIterator]();
    process.stdout.write(q);
    return piped.next().then((r) => (r.value ?? '').trim());
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((r) => rl.question(q, (a) => { rl.close(); r(a.trim()); }));
}

// Reads a line without echoing it. Falls back to a plain read when stdin is piped.
function askHidden(q) {
  if (!process.stdin.isTTY) return ask(q);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // Readline redraws prompt + typed text in one write: keep the prompt, drop the text.
  rl._writeToOutput = (s) => rl.output.write(s.startsWith(q) ? q : ''); // shortcut: private readline hook; replace if Node removes it
  return new Promise((r) => rl.question(q, (a) => { rl.close(); process.stdout.write('\n'); r(a.trim()); }));
}

const yes = async (q) => {
  if (flags.has('--yes')) { console.log(`${q} [s/N] s`); return true; }
  return /^s(im)?$/i.test(await ask(`${q} [s/N] `));
};

function checkPrereqs() {
  const missing = [];
  const [maj, min] = process.versions.node.split('.').map(Number);
  if (maj < 22 || (maj === 22 && min < 20)) missing.push(`Node 22.20 ou mais novo (você tem ${process.versions.node}): https://nodejs.org`);
  const has = (bin) => tk.run(bin, ['--version'], { timeout: 15000 }).status === 0;
  if (!has('claude')) missing.push('Claude Code: https://code.claude.com');
  if (!has('git')) missing.push('git: https://git-scm.com');
  // The kit ships whole: without uv, /cctk:convert (MarkItDown/Docling via uvx) would only fail when needed.
  if (!has('uv')) missing.push('uv (para o /cctk:convert): https://docs.astral.sh/uv/getting-started/installation/');
  return missing;
}

// The uv installer puts it in ~/.local/bin and fixes PATH only for new terminals: add it here to re-check.
async function offerUv(missing) {
  if (!missing.some((m) => m.startsWith('uv')) || !(await yes('O uv não está instalado. Instalar agora com o instalador oficial (astral.sh)?'))) return missing;
  const opts = { timeout: 300000, stdio: 'inherit' };
  if (process.platform === 'win32') tk.run('powershell', ['-NoProfile', '-ExecutionPolicy', 'ByPass', '-Command', 'irm https://astral.sh/uv/install.ps1 | iex'], opts);
  else tk.run('sh', ['-c', 'curl -LsSf https://astral.sh/uv/install.sh | sh'], opts);
  process.env.PATH = [path.join(p.home, '.local', 'bin'), process.env.PATH].join(path.delimiter);
  return checkPrereqs();
}

async function adoAdd(firstUrl) {
  let lastPat;
  for (let url = firstUrl; ; url = undefined) {
    url = url || (await ask('URL da collection (ex.: https://servidor/tfs/DefaultCollection). Vazio para terminar: '));
    if (!url) return;
    try { new URL(url); } catch { console.log('URL inválida.'); continue; }
    let pat = lastPat && (await tk.testPat(url, lastPat)) ? lastPat : await askHidden(`PAT para ${url} (não aparece na tela): `);
    if (!(await tk.testPat(url, pat)) && !(await yes('Não consegui validar o PAT nessa URL (rede, certificado ou permissão). Salvar mesmo assim?'))) continue;
    const name = tk.adoName(url);
    setCred(name, pat);
    tk.addAdoServer(p, url, name);
    lastPat = pat;
    console.log(`✔ ${name} configurado. PAT guardado no cofre do sistema.`);
    if (firstUrl) return;
  }
}

// Approves the project's check for this folder. Never from inside Claude Code: the repository picks the command.
async function trustCheck() {
  if (process.env.CLAUDECODE) throw new Error('Aprove o check num terminal comum, fora do Claude Code.');
  const check = readCheck(process.cwd());
  if (!check) throw new Error('Nenhum check em .claude/cctk.json nesta pasta. Rode na raiz do projeto.');
  console.log(`O kit vai rodar este comando em ${process.cwd()} sempre que o Claude editar código:\n\n  ${check}\n`);
  if (!(await yes('Aprovar?'))) return;
  trust(process.cwd(), check);
  console.log('✔ Check aprovado. Se o comando mudar, o kit pede aprovação de novo.');
}

const newer = (a, b) => { // 'v1.10.0' > 'v1.9.2'
  const [x, y] = [a, b].map((v) => v.replace(/^v/, '').split('.').map(Number));
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};

// One line per item, each with what to do; every probe has a time limit.
async function doctor() {
  let bad = 0;
  const line = (good, label, fix) => { if (!good) bad++; console.log(`${good ? '✔' : '✖'} ${label}${good ? '' : `\n    → ${fix}`}`); };
  const missing = checkPrereqs();
  line(!missing.length, 'Pré-requisitos (Node, Claude Code, git, uv)', `Instale: ${missing.join('; ')}`);
  let settings = {};
  try { settings = JSON.parse(fs.readFileSync(path.join(p.claude, 'settings.json'), 'utf8')); } catch {}
  const update = 'cctk install';
  line(tk.isKit(settings) && fs.existsSync(path.join(p.runtime, 'statusline.js')), 'Configuração do kit e statusline', `Rode: ${update}`);
  let installed = {};
  try { installed = JSON.parse(fs.readFileSync(path.join(p.claude, 'plugins', 'installed_plugins.json'), 'utf8')).plugins || {}; } catch {}
  const kitVersion = installed[tk.PLUGIN_ID]?.[0]?.version;
  line(kitVersion === tk.VERSION, `Plugin cctk ${kitVersion || 'não instalado'} (esperado ${tk.VERSION})`, `Rode: ${update}`);
  line(settings.enabledPlugins?.[tk.PLUGIN_ID] === true, 'Plugin cctk habilitado', `Rode: claude plugin enable ${tk.PLUGIN_ID}`);
  line(!!installed[tk.SECURITY_PLUGIN], 'Plugin security-guidance', `Rode: claude plugin install ${tk.SECURITY_PLUGIN}`);
  for (const [bin, pkg] of [['openspec', tk.OPENSPEC], ['playwright-cli', tk.PLAYWRIGHT_CLI]]) {
    line(tk.run(bin, ['--version'], { timeout: 15000 }).status === 0, bin, `Rode: npm install -g ${pkg}`);
  }
  let servers = {};
  try { servers = JSON.parse(fs.readFileSync(p.claudeJson, 'utf8')).mcpServers || {}; } catch {}
  for (const s of Object.values(servers).filter(tk.kitMcp)) {
    const [, url, name] = s.args;
    const pat = getCred(name);
    line(pat && (await tk.testPat(url, pat)), `Azure DevOps ${name}: PAT no cofre e aceito pelo servidor`,
      `Confira a rede e a validade do PAT; para trocar: cctk ado add ${url}`);
  }
  const check = readCheck(process.cwd());
  if (check) line(isTrusted(process.cwd(), check), `Check deste projeto aprovado (${check})`, 'Rode nesta pasta: cctk trust');
  else console.log('– Nenhum check nesta pasta (rode o doctor na raiz de um projeto para conferir o dele)');
  // fail-open: offline, proxy or a slow npm just skip the hint
  const latest = tk.run('npm', ['view', 'cctk', 'version'], { timeout: 5000 }).stdout.trim();
  if (/^\d+\.\d+\.\d+$/.test(latest) && newer(latest, tk.VERSION)) console.log(`↑ Versão nova: ${latest}. Rode: cctk update`);
  if (bad) process.exitCode = 1;
}

async function install() {
  if (process.env.CLAUDECODE) {
    console.error('Rode o instalador num terminal comum, com todas as sessões do Claude Code fechadas.');
    process.exit(1);
  }
  let missing = checkPrereqs();
  if (missing.length) missing = await offerUv(missing);
  if (missing.length) {
    console.error(`Falta instalar:\n- ${missing.join('\n- ')}`);
    process.exit(1);
  }
  const readSettings = () => { try { return JSON.parse(fs.readFileSync(path.join(p.claude, 'settings.json'), 'utf8')); } catch { return {}; } };
  const update = tk.isKit(readSettings());
  const s = tk.snapshot(p);
  console.log(update
    ? `Isto vai atualizar o Claude Code Toolkit para a versão ${tk.VERSION}:
  1. Fazer backup da sua configuração atual em ${p.backups}
  2. Regravar só os ajustes do kit no settings.json: seus plugins, MCPs, permissões e variáveis ficam
  3. Atualizar o OpenSpec, o Playwright CLI e os plugins do kit
  Para voltar: cctk restore`
    : `Isto vai:
  1. Fazer backup da sua configuração atual em ${p.backups}
  2. Remover plugins (${s.plugins.join(', ') || 'nenhum'}), MCPs de usuário (${s.mcpServers.join(', ') || 'nenhum'}),
     skills (${s.dirs.skills}), agents (${s.dirs.agents}), commands (${s.dirs.commands}), output styles (${s.dirs['output-styles']})
  3. Instalar o Claude Code Toolkit
  Histórico de conversas, memória e login NÃO são tocados. Para voltar: cctk restore`);
  if (flags.has('--dry-run')) return console.log('\n(--dry-run: nada foi alterado)');
  if (!(await yes('Continuar?'))) return;

  console.log(`✔ Backup em ${tk.backup(p)}`);
  tk.migrate(p);
  if (!update) tk.clean(p);
  tk.writeConfig(p, readSettings(), update); // read after migrate: it may have dropped the old plugin
  console.log(update ? '✔ Ajustes do kit gravados; o resto do seu settings.json ficou como estava' : '✔ Configuração limpa gravada');
  const failed = tk.installTools(tk.run, { update, log: (m) => process.stdout.write(m) });
  if (failed.length) {
    console.error(`\n⚠ Etapas que falharam. Corrija e rode cctk install de novo:\n${failed.join('\n\n')}`);
    process.exitCode = 1;
  }

  if (!update && !flags.has('--yes') && (await yes('Você usa Azure DevOps Server (on-premises)?'))) await adoAdd();
  console.log(`\n${failed.length ? 'Terminou com falhas' : 'Pronto'} (Claude Code Toolkit ${tk.VERSION}). Próximos passos:
  1. Abra o Claude Code dentro de um projeto (cd meu-projeto && claude).
  2. Rode /cctk:init-project para preparar o repositório.
  3. Depois de alguns dias, veja o seu uso com: cctk stats`);
}

// The installer must be the new version's: a second process, after npm replaced the package.
function selfUpdate() {
  const r = tk.run('npm', ['install', '-g', 'cctk@latest'], { timeout: 300000, stdio: 'inherit' });
  if (r.status !== 0) throw new Error('npm install -g cctk@latest falhou. Confira a rede, o proxy e as permissões do npm.');
  process.exitCode = tk.run('cctk', ['install', '--yes'], { stdio: 'inherit' }).status;
}

const [cmd, sub, arg] = argv.filter((a) => !a.startsWith('--'));
try {
  if (cmd === 'install') await install();
  else if (cmd === 'update') selfUpdate();
  else if (cmd === 'restore') {
    const stamp = sub || tk.latestBackup(p);
    if (!stamp) throw new Error('Nenhum backup encontrado.');
    if (!(await yes(`Voltar à configuração do backup ${stamp}? O kit sai e seus plugins e MCPs de antes voltam.`))) process.exit(0);
    const m = tk.restore(p, stamp);
    console.log(`✔ Restaurado o backup ${m.stamp}. Plugins reinstalados: ${m.plugins.join(', ') || 'nenhum'}.`);
  } else if (cmd === 'ado' && sub === 'add') await adoAdd(arg);
  else if (cmd === 'secret' && sub === 'set' && arg) { tk.vaultSet(p, arg, await askHidden(`Valor de ${arg} (não aparece na tela): `)); console.log(`✔ ${arg} gravado. Rode /clear no Claude Code para carregar.`); }
  else if (cmd === 'secret' && sub === 'list') console.log(tk.vaultList(p).join('\n') || '(cofre vazio)');
  else if (cmd === 'secret' && sub === 'rm' && arg) { tk.vaultRm(p, arg); console.log(`✔ ${arg} removido.`); }
  else if (cmd === 'stats') { const days = Number(sub) || 28; console.log(format(stats(p, days), days)); }
  else if (cmd === 'trust') await trustCheck();
  else if (cmd === 'doctor') await doctor();
  else console.log('Uso: install [--yes] [--dry-run] | update | restore [backup] | doctor | trust | secret set|list|rm NOME | ado add URL | stats [dias]');
} catch (e) {
  console.error(`Erro: ${e.message}`);
  process.exit(1);
}
