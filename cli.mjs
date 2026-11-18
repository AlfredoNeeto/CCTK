#!/usr/bin/env node
// npx github:AlfredoNeeto/claude-toolkit <install | restore [backup] | secret set|list|rm NAME | ado add URL>
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createRequire } from 'node:module';
import * as tk from './lib/toolkit.mjs';

const require = createRequire(import.meta.url);
const { setCred } = require('./runtime/creds.js');
const p = tk.paths();

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
  process.stdout.write(q);
  rl._writeToOutput = () => {}; // shortcut: private readline hook to mute echo; replace if Node removes it
  return new Promise((r) => rl.question('', (a) => { rl.close(); process.stdout.write('\n'); r(a.trim()); }));
}

const yes = async (q) => /^s(im)?$/i.test(await ask(`${q} [s/N] `));

function checkPrereqs() {
  const missing = [];
  const [maj, min] = process.versions.node.split('.').map(Number);
  if (maj < 22 || (maj === 22 && min < 20)) missing.push(`Node 22.20 ou mais novo (você tem ${process.versions.node}): https://nodejs.org`);
  if (tk.run('claude', ['--version']).status !== 0) missing.push('Claude Code: https://code.claude.com');
  if (tk.run('git', ['--version']).status !== 0) missing.push('git: https://git-scm.com');
  if (tk.run('uv', ['--version']).status !== 0) missing.push('uv: https://docs.astral.sh/uv/getting-started/installation/');
  return missing;
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

async function install() {
  if (process.env.CLAUDECODE) {
    console.error('Rode o instalador num terminal comum, com todas as sessões do Claude Code fechadas.');
    process.exit(1);
  }
  const missing = checkPrereqs();
  if (missing.length) {
    console.error(`Falta instalar:\n- ${missing.join('\n- ')}`);
    process.exit(1);
  }
  const s = tk.snapshot(p);
  console.log(`Isto vai:
  1. Fazer backup da sua configuração atual em ${p.backups}
  2. Remover plugins (${s.plugins.join(', ') || 'nenhum'}), MCPs de usuário (${s.mcpServers.join(', ') || 'nenhum'}),
     skills (${s.dirs.skills}), agents (${s.dirs.agents}), commands (${s.dirs.commands}), output styles (${s.dirs['output-styles']})
  3. Instalar o Claude Toolkit Dev
  Histórico de conversas, memória e login NÃO são tocados. Para voltar: npx github:AlfredoNeeto/claude-toolkit restore`);
  if (!(await yes('Continuar?'))) return;

  let previous = {};
  try { previous = JSON.parse(fs.readFileSync(path.join(p.claude, 'settings.json'), 'utf8')); } catch {}
  const dir = tk.backup(p);
  console.log(`✔ Backup em ${dir}`);
  tk.clean(p);
  tk.writeConfig(p, previous);
  console.log('✔ Configuração limpa gravada');
  const failed = tk.installTools();
  if (failed.length) console.error(`\n⚠ Etapas que falharam (rode de novo à mão):\n${failed.join('\n\n')}`);
  else console.log('✔ OpenSpec e plugin instalados');

  if (await yes('Você usa Azure DevOps Server (on-premises)?')) await adoAdd();
  console.log('\nPronto. Abra o Claude Code dentro de um projeto e rode /toolkit-dev:init-project.');
}

const [cmd, sub, arg] = process.argv.slice(2);
try {
  if (cmd === 'install') await install();
  else if (cmd === 'restore') {
    const m = tk.restore(p, sub);
    console.log(`✔ Restaurado o backup ${m.stamp}. Plugins reinstalados: ${m.plugins.join(', ') || 'nenhum'}.`);
  } else if (cmd === 'ado' && sub === 'add') await adoAdd(arg);
  else if (cmd === 'secret' && sub === 'set' && arg) { tk.vaultSet(p, arg, await askHidden(`Valor de ${arg} (não aparece na tela): `)); console.log(`✔ ${arg} gravado. Rode /clear no Claude Code para carregar.`); }
  else if (cmd === 'secret' && sub === 'list') console.log(tk.vaultList(p).join('\n') || '(cofre vazio)');
  else if (cmd === 'secret' && sub === 'rm' && arg) { tk.vaultRm(p, arg); console.log(`✔ ${arg} removido.`); }
  else console.log('Uso: install | restore [backup] | secret set|list|rm NOME | ado add URL');
} catch (e) {
  console.error(`Erro: ${e.message}`);
  process.exit(1);
}
