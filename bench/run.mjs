#!/usr/bin/env node
// Benchmark real: Claude Code de fábrica ("padrao") vs. instalação do toolkit ("toolkit"), cada um num HOME
// temporário isolado do ~/.claude do usuário. Mede tokens, custo, turnos, tempo e qualidade (testes ocultos).
// Uso: node bench/run.mjs [--reps 3] [--tasks a,b] [--dry]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as tk from '../lib/toolkit.mjs';

const BENCH = path.join(tk.REPO_ROOT, 'bench');
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(`--${name}`); return i < 0 ? def : argv[i + 1]; };
const REPS = Number(opt('reps', 3));
const ONLY = opt('tasks')?.split(',');
// padrao: de fábrica · config: só settings/CLAUDE.md do toolkit (sem plugin) · toolkit: instalação completa
const ALL_ARMS = ['padrao', 'config', 'toolkit'];
const ARMS = opt('arms', 'padrao,toolkit').split(',');
if (!ARMS.every((a) => ALL_ARMS.includes(a))) throw new Error(`--arms aceita: ${ALL_ARMS.join(', ')}`);
const HOUR = 3600 * 1000;

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2)); };
const tmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));
const sh = (cmd, cwd, extra = {}) => {
  const r = spawnSync(cmd, { cwd, shell: true, encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024, ...extra });
  return { status: r.status ?? 1, out: `${r.stdout || ''}\n${r.stderr || ''}${r.error ? `\n${r.error.message}` : ''}` };
};

const tasks = fs.readdirSync(path.join(BENCH, 'tasks'))
  .filter((id) => !ONLY || ONLY.includes(id))
  .map((id) => ({ id, dir: path.join(BENCH, 'tasks', id), ...readJson(path.join(BENCH, 'tasks', id, 'task.json')) }));

// Copy of the fixture repo as a fresh git repo, so the diff of what Claude changed is measurable.
function workspace(task, overlay) {
  const dir = tmp(`bench-${task.id}-`);
  fs.cpSync(path.join(task.dir, 'repo'), dir, { recursive: true });
  if (overlay) fs.cpSync(overlay, dir, { recursive: true });
  sh('git init -q && git add -A && git -c user.name=bench -c user.email=bench@localhost commit -qm inicial', dir);
  return dir;
}

function grade(task, dir, answer = '') {
  if (task.kind === 'question') {
    const passed = task.answer.filter((re) => new RegExp(re, 'i').test(answer)).length;
    return { pass: passed === task.answer.length, passed, total: task.answer.length };
  }
  fs.cpSync(path.join(task.dir, 'hidden'), dir, { recursive: true });
  const r = sh(task.grade, dir, { env: { ...process.env, DOTNET_CLI_UI_LANGUAGE: 'en' } }); // stable summary to parse
  const tap = [/# pass (\d+)/, /# fail (\d+)/].map((re) => Number(r.out.match(re)?.[1] ?? NaN));
  const net = r.out.match(/Failed:\s*(\d+),\s*Passed:\s*(\d+)/) || r.out.match(/failed:\s*(\d+),\s*succeeded:\s*(\d+)/i);
  const [passed, failed] = net ? [Number(net[2]), Number(net[1])] : tap;
  return { pass: r.status === 0, passed, total: passed + failed, ...(r.status && !(passed + failed) ? { log: r.out.slice(-2000) } : {}) };
}

// --- dry: proves each grader fails on untouched work and passes on the reference solution, no quota spent ---
function dry() {
  let ok = true;
  for (const t of tasks) {
    const before = t.kind === 'question' ? grade(t, null, '') : grade(t, workspace(t));
    const sol = t.kind === 'question' ? null : workspace(t, path.join(t.dir, 'solution'));
    const check = sol ? sh(t.check, sol).status === 0 : true;
    const after = sol ? grade(t, sol) : grade(t, null, fs.readFileSync(path.join(t.dir, 'solution.txt'), 'utf8'));
    const good = !before.pass && after.pass && check;
    ok &&= good;
    console.log(`${good ? 'ok  ' : 'FALHA'} ${t.id}: sem solução ${before.passed}/${before.total}, com solução ${after.passed}/${after.total}, check ${check ? 'passa' : 'falha'}`);
    if (!good) console.log(after.log || before.log || '');
  }
  process.exit(ok ? 0 : 1);
}

// --- isolated homes ---
function env(home) {
  const e = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^claude/i.test(k) || k === 'CLAUDE_CODE_OAUTH_TOKEN') e[k] = v;
  e.HOME = e.USERPROFILE = home;
  return e;
}

function login() {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.ANTHROPIC_API_KEY) return null;
  const real = tk.paths();
  const oauth = readJson(path.join(real.claude, '.credentials.json')).claudeAiOauth;
  if (!oauth?.accessToken) throw new Error('Sem login do Claude Code. Rode `claude` e faça login, ou defina CLAUDE_CODE_OAUTH_TOKEN (claude setup-token).');
  if (oauth.expiresAt - Date.now() < 3 * HOUR) {
    throw new Error(`O token de acesso vence às ${new Date(oauth.expiresAt).toLocaleTimeString()}, cedo demais para o benchmark.\n` +
      'Rode `claude setup-token` e defina CLAUDE_CODE_OAUTH_TOKEN com o token gerado.');
  }
  // No refreshToken in the copy: a temp home can never rotate (and so invalidate) the user's real login.
  const { refreshToken, ...access } = oauth;
  return { creds: { claudeAiOauth: access }, account: readJson(real.claudeJson).oauthAccount, expiresAt: oauth.expiresAt };
}

function makeHome(arm, auth) {
  const home = tmp(`bench-home-${arm}-`);
  const p = tk.paths(home);
  if (auth) writeJson(path.join(p.claude, '.credentials.json'), auth.creds);
  writeJson(p.claudeJson, { hasCompletedOnboarding: true, ...(auth ? { oauthAccount: auth.account } : {}) });
  if (arm !== 'padrao') tk.writeConfig(p);
  if (arm === 'toolkit') {
    for (const args of [['plugin', 'marketplace', 'add', tk.REPO_ROOT], ['plugin', 'install', tk.PLUGIN_ID],
      ['plugin', 'marketplace', 'add', tk.OFFICIAL_MARKETPLACE], ['plugin', 'install', tk.SECURITY_PLUGIN]]) {
      const r = tk.run('claude', args, { env: env(home), timeout: 300000 });
      if (r.status) throw new Error(`claude ${args.join(' ')} falhou:\n${r.stdout}\n${r.stderr}`);
    }
  }
  return home;
}

// --- one real run ---
function runOnce(task, arm, home, rep) {
  const dir = workspace(task);
  const started = Date.now();
  // Prompt via stdin: cmd.exe would mangle % and quotes in an argument.
  const r = tk.run('claude', ['-p', '--output-format', 'json', '--permission-mode', 'bypassPermissions', '--no-session-persistence', '--strict-mcp-config'],
    { cwd: dir, env: env(home), input: task.prompt, timeout: 20 * 60000, maxBuffer: 64 * 1024 * 1024 });
  let res = {};
  try { res = JSON.parse(r.stdout.trim().split(/\r?\n/).pop()); } catch { /* recorded as error below */ }
  const models = Object.values(res.modelUsage || {});
  const sum = (k) => models.reduce((s, m) => s + (m[k] || 0), 0);
  const tokens = { input: sum('inputTokens'), cacheWrite: sum('cacheCreationInputTokens'), cacheRead: sum('cacheReadInputTokens'), output: sum('outputTokens') };
  const run = {
    task: task.id, arm, rep,
    error: res.is_error || !res.type ? (res.result || r.stderr || r.stdout).slice(-1500) : undefined,
    models: Object.keys(res.modelUsage || {}),
    tokens, total: tokens.input + tokens.cacheWrite + tokens.cacheRead + tokens.output,
    fresh: tokens.input + tokens.cacheWrite + tokens.output, // what cache reads don't discount
    cost: res.total_cost_usd ?? 0, turns: res.num_turns ?? 0, seconds: Math.round((res.duration_ms ?? Date.now() - started) / 1000),
    answerChars: (res.result || '').length,
  };
  if (task.kind === 'edit') {
    run.check = sh(task.check, dir).status === 0;
    run.diff = sh('git add -A && git diff --cached --numstat', dir).out.trim().split(/\r?\n/).filter(Boolean)
      .reduce((s, l) => s + (Number(l.split('\t')[0]) || 0) + (Number(l.split('\t')[1]) || 0), 0);
  }
  run.quality = grade(task, dir, res.result || '');
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  return run;
}

// --- report ---
const median = (xs) => { const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
const fmt = (n, d = 0) => (Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d }) : '–');
const delta = (a, b) => (a ? `${b <= a ? '' : '+'}${fmt(((b - a) / a) * 100)}%` : '–');

// Cost and uncached tokens first: cache re-reads dominate the raw total but cost ~10% on the API.
const METRICS = [
  ['**Custo equiv. (US$)**', (r) => r.cost, 3],
  ['**Tokens sem cache**', (r) => r.fresh, 0],
  ['Tokens de saída', (r) => r.tokens.output, 0],
  ['Releitura de cache', (r) => r.tokens.cacheRead, 0],
  ['Tokens totais (com cache)', (r) => r.total, 0],
  ['Turnos', (r) => r.turns, 0],
  ['Tempo (s)', (r) => r.seconds, 0],
  ['Qualidade (testes ocultos)', (r) => (r.quality.total ? r.quality.passed / r.quality.total : 0) * 100, 0],
];

function report(runs) {
  const arms = ALL_ARMS.filter((a) => runs.some((r) => r.arm === a)); // from the data, so merged runs work
  const cell = (task, arm) => runs.filter((r) => r.task === task && r.arm === arm && !r.error);
  const okRate = (c) => (c.length ? `${c.filter((r) => r.quality.pass).length}/${c.length}` : '–');
  // Each non-baseline arm shows its value and the change vs. padrao.
  const row = (name, vals, d = 0, withDelta = true) =>
    `| ${name} | ${vals.map((v, i) => (typeof v === 'string' ? v : `${fmt(v, d)}${i && withDelta && arms[0] === 'padrao' ? ` (${delta(vals[0], v)})` : ''}`)).join(' | ')} |`;
  const head = [`| Métrica | ${arms.join(' | ')} |`, `|---|${arms.map(() => '---:').join('|')}|`];

  const lines = [`# Benchmark: ${arms.join(' vs. ')}`, '',
    `${new Date().toLocaleString('pt-BR')} · ${runs.length} execuções · mediana por tarefa · Δ em relação ao padrão`, ''];
  const models = (arm) => [...new Set(runs.filter((r) => r.arm === arm).flatMap((r) => r.models))];
  for (const arm of arms) lines.push(`- **${arm}**: modelos usados: ${models(arm).join(', ') || '–'}`);
  if (new Set(arms.map((a) => models(a).sort().join())).size > 1) {
    lines.push('', '> **Atenção:** os lados usaram modelos diferentes. Parte (ou quase toda) a diferença de custo pode vir só da troca de modelo. ' +
      'O lado `config` (mesmas configurações, sem o plugin) separa esse efeito do efeito dos hooks.');
  }
  const errors = runs.filter((r) => r.error);
  if (errors.length) lines.push(`- **${errors.length} execuções com erro** (fora das medianas): ${errors.map((r) => `${r.task}/${r.arm}#${r.rep}`).join(', ')}`);
  lines.push('');

  const ids = [...new Set(runs.map((r) => r.task))];
  for (const id of ids) {
    lines.push(`## ${id}`, '', ...head);
    for (const [name, f, d] of METRICS) lines.push(row(name, arms.map((arm) => median(cell(id, arm).map(f))), d));
    lines.push(row('Execuções 100% corretas', arms.map((arm) => okRate(cell(id, arm)))));
    if (runs.some((r) => r.task === id && 'diff' in r)) lines.push(row('Linhas alteradas', arms.map((arm) => median(cell(id, arm).map((r) => r.diff)))));
    lines.push('');
  }

  lines.push('## Total (soma das medianas das tarefas)', '', ...head);
  for (const [name, f, d] of METRICS.slice(0, -1)) {
    lines.push(row(name, arms.map((arm) => ids.reduce((s, id) => s + (median(cell(id, arm).map(f)) || 0), 0)), d));
  }
  const reps = Math.max(...runs.map((r) => r.rep));
  lines.push(row('Execuções 100% corretas', arms.map((arm) => okRate(runs.filter((r) => r.arm === arm && !r.error)))), '',
    '**Como ler:** compare primeiro **custo** e **tokens sem cache**. A cada turno o Claude relê a conversa do cache, que na API custa ~10% do preço normal; ',
    'por isso "tokens totais" cresce com o número de turnos sem refletir o gasto. Não há documentação de como o plano Pro pesa a releitura de cache na cota. ',
    '**Limites:** no plano Pro, o custo é o equivalente na API (o que conta de verdade é a cota). ',
    'Todos os lados rodam sem MCP (`--strict-mcp-config`), sem AGENTS.md e com o mesmo prompt. ',
    `n=${reps} por célula: mostra direção e ordem de grandeza, não significância estatística.`, '');
  return lines.join('\n');
}

// --- main ---
if (argv.includes('--dry')) dry();
if (argv.includes('--report')) { // regenerate report.md from runs.jsonl; "dirA,dirB" merges runs, written to dirA
  const dirs = opt('report').split(',');
  const runs = dirs.flatMap((d) => fs.readFileSync(path.join(d, 'runs.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)));
  fs.writeFileSync(path.join(dirs[0], 'report.md'), report(runs));
  console.log(path.join(dirs[0], 'report.md'));
  process.exit(0);
}

const auth = login();
const out = path.join(BENCH, 'results', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(out, { recursive: true });
const runs = [];
const homes = {};
try {
  for (const arm of ARMS) { console.log(`Preparando o lado ${arm}...`); homes[arm] = makeHome(arm, auth); }
  const total = REPS * tasks.length * ARMS.length;
  for (let rep = 1; rep <= REPS; rep++) {
    for (const task of tasks) {
      const order = ARMS.map((_, i) => ARMS[(i + rep - 1) % ARMS.length]); // rotate who goes first
      for (const arm of order) {
        if (auth && auth.expiresAt - Date.now() < 0.5 * HOUR) throw new Error('O token de acesso está perto de vencer; parei para não falhar no meio. Rode de novo com CLAUDE_CODE_OAUTH_TOKEN.');
        process.stdout.write(`[${runs.length + 1}/${total}] ${task.id} · ${arm} · rep ${rep}... `);
        const r = runOnce(task, arm, homes[arm], rep);
        runs.push(r);
        fs.appendFileSync(path.join(out, 'runs.jsonl'), JSON.stringify(r) + '\n');
        console.log(r.error ? `ERRO: ${r.error.split('\n')[0]}` : `${fmt(r.total)} tokens, US$ ${fmt(r.cost, 3)}, ${r.turns} turnos, ${r.seconds}s, ocultos ${r.quality.passed}/${r.quality.total}`);
      }
    }
  }
} finally {
  for (const h of Object.values(homes)) fs.rmSync(h, { recursive: true, force: true, maxRetries: 3 }); // removes the copied token
  if (runs.length) {
    fs.writeFileSync(path.join(out, 'report.md'), report(runs));
    console.log(`\nRelatório: ${path.join(out, 'report.md')}`);
  }
}
