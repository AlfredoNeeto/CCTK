// Bench checks that spend no quota (.specs/features/bench-cota/checks.md), one test per check, named C<n>.
// The report is exercised through `node bench/run.mjs --report <dir>` over synthetic rounds.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../lib/toolkit.mjs';
import { sgUsage, parseUsage } from '../bench/medidas.mjs';

const RUN = path.join(REPO_ROOT, 'bench', 'run.mjs');
const run = (o) => ({
  task: 'node-bugfix', arm: 'toolkit', rep: 1, models: ['claude-sonnet-5-5'],
  tokens: { input: 1, cacheWrite: 1, cacheRead: 1, output: 1 }, total: 4, fresh: 3, cost: 0.1, turns: 2, seconds: 10,
  answerChars: 10, denials: 0, lookups: 1, delegations: {}, quality: { pass: true, passed: 1, total: 1 }, ...o,
});
function report(runs, cota) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-cota-'));
  fs.writeFileSync(path.join(dir, 'runs.jsonl'), runs.map((r) => JSON.stringify(r)).join('\n') + '\n');
  if (cota) fs.writeFileSync(path.join(dir, 'cota.json'), JSON.stringify(cota));
  const r = spawnSync(process.execPath, [RUN, '--report', dir], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const md = fs.readFileSync(path.join(dir, 'report.md'), 'utf8');
  fs.rmSync(dir, { recursive: true, force: true });
  return md;
}
// The cell of `arm` in the row named `name`, inside the section `sec` ("node-bugfix" or "Total").
function cell(md, sec, name, arm) {
  const body = md.split(/^## /m).find((s) => s.startsWith(sec));
  assert.ok(body, `section ${sec}`);
  const head = body.split('\n').find((l) => l.startsWith('| Métrica')).split('|').map((c) => c.trim());
  const line = body.split('\n').find((l) => l.startsWith(`| ${name} |`));
  assert.ok(line, `row ${name}`);
  return line.split('|').map((c) => c.trim())[head.indexOf(arm)];
}
const plan = (arm) => JSON.parse(spawnSync(process.execPath, [RUN, '--home-plan', arm], { encoding: 'utf8' }).stdout);
const USAGE = `You are currently using your subscription to power your Claude Code usage

Current session: 45% used · resets Nov 27, 3:19pm (America/Cuiaba)
Current week (all models): 34% used · resets Nov 27, 2:59pm (America/Cuiaba)
Current week (Fable): 0% used · resets Nov 27, 3pm (America/Cuiaba)`;

test('C1 sg-sonnet reviews on Sonnet; sem-sg installs the kit without security-guidance', () => {
  const s = plan('sg-sonnet');
  assert.deepEqual(s.env, { SECURITY_REVIEW_MODEL: 'claude-sonnet-5-5', SG_AGENTIC_MODEL: 'claude-sonnet-5-5' });
  assert.ok(s.plugins.includes('install security-guidance@claude-plugins-official'), 'sg-sonnet has the plugin');
  const n = plan('sem-sg');
  assert.ok(n.plugins.includes('install cctk@cctk'), 'sem-sg has the kit');
  assert.ok(!n.plugins.some((p) => /security-guidance/.test(p)), 'sem-sg has no security-guidance');
  assert.ok(plan('toolkit').plugins.includes('install security-guidance@claude-plugins-official'), 'toolkit keeps it');
});

test('C2 sgUsage adds the cost and models of every Review usage line', () => {
  const log = [
    '[t] Stop hook: reviewing 1 changed files (standard diff)',
    '[t] Review usage: review=stop session=s model=claude-opus-5-5 calls=1 in=1229 out=27 cache_read=14487 cache_write=0 est_cost_usd=0.0113',
    '[t] Review usage: review=commit session=s model=claude-sonnet-5-5 calls=1 in=10 out=2 cache_read=0 cache_write=0 est_cost_usd=0.0200',
  ].join('\n');
  const u = sgUsage(log);
  assert.equal(u.cost, 0.0313);
  assert.deepEqual(u.models, ['claude-opus-5-5', 'claude-sonnet-5-5']);
  assert.equal(u.reviews, 2);
});

test('C3 a Stop review that started and logged no usage is incomplete; no log is zero', () => {
  const log = [
    'Stop hook: reviewing 2 changed files (standard diff)',
    'Review usage: review=stop session=s model=claude-opus-5-5 calls=1 in=1 out=1 cache_read=0 cache_write=0 est_cost_usd=0.0100',
    'Stop hook: reviewing 1 changed files (standard diff)',
  ].join('\n');
  assert.equal(sgUsage(log).incomplete, 1);
  assert.deepEqual(sgUsage(''), { cost: 0, models: [], reviews: 0, incomplete: 0 });
  assert.deepEqual(sgUsage(), { cost: 0, models: [], reviews: 0, incomplete: 0 });
});

test('C4 the report shows the plugin cost, the total with it, and "não medido" for runs without the log', () => {
  const md = report([run({ arm: 'toolkit', cost: 0.1, sgCost: 0.02 }), run({ arm: 'sem-sg', cost: 0.1 })]);
  assert.equal(cell(md, 'node-bugfix', 'Custo do security-guidance (US$)', 'toolkit'), '0,020');
  assert.equal(cell(md, 'node-bugfix', 'Custo do security-guidance (US$)', 'sem-sg'), '–');
  assert.equal(cell(md, 'node-bugfix', '**Custo com o plugin (US$)**', 'toolkit'), '0,120');
  assert.equal(cell(md, 'node-bugfix', '**Custo com o plugin (US$)**', 'sem-sg'), '0,100');
  const old = report([run({ arm: 'toolkit', cost: 0.1 }), run({ arm: 'sem-sg', cost: 0.1 })]);
  assert.equal(cell(old, 'node-bugfix', '**Custo com o plugin (US$)**', 'toolkit'), 'não medido');
  // A run whose plugin left no log at all (sgCost null) is unmeasured too, not a measured zero.
  const semLog = report([run({ arm: 'toolkit', cost: 0.1, sgCost: null }), run({ arm: 'sem-sg', cost: 0.1 })]);
  assert.equal(cell(semLog, 'node-bugfix', 'Custo do security-guidance (US$)', 'toolkit'), 'não medido');
});

test('C5 at least two long tasks with 6+ code files, the prompt naming 3+ of them', () => {
  const tasks = path.join(REPO_ROOT, 'bench', 'tasks');
  const longs = fs.readdirSync(tasks).filter((d) => d.startsWith('long-'));
  assert.ok(longs.length >= 2, `only ${longs.length}`);
  for (const id of longs) {
    const repo = path.join(tasks, id, 'repo');
    const code = fs.readdirSync(repo, { recursive: true }).map((f) => f.replace(/\\/g, '/'))
      .filter((f) => /\.(js|mjs|cs)$/.test(f) && !/(^|\/)(test|tests|bin|obj)\//.test(f));
    assert.ok(code.length >= 6, `${id}: ${code.length} code files`);
    const prompt = JSON.parse(fs.readFileSync(path.join(tasks, id, 'task.json'), 'utf8')).prompt;
    const named = code.filter((f) => prompt.includes(f) || prompt.includes(path.basename(f)));
    assert.ok(named.length >= 3, `${id}: prompt names ${named.length}: ${named}`);
    // The request asks for changes in 3+ files: the reference solution changes at least 3 of the repo's code files.
    const changed = fs.readdirSync(path.join(tasks, id, 'solution'), { recursive: true }).map((f) => f.replace(/\\/g, '/')).filter((f) => code.includes(f));
    assert.ok(changed.length >= 3, `${id}: solution changes ${changed.length}: ${changed}`);
  }
});

test('C7 the report says, per arm, how many runs consulted Opus', () => {
  const md = report([
    run({ arm: 'toolkit', rep: 1, models: ['claude-sonnet-5-5', 'claude-opus-5-5'] }), run({ arm: 'toolkit', rep: 2 }),
    run({ arm: 'sem-advisor', rep: 1 }), run({ arm: 'sem-advisor', rep: 2 }),
  ]);
  assert.match(md, /\*\*toolkit\*\* consultou o Opus em 1 de 2 execuções/);
  assert.match(md, /\*\*sem-advisor\*\* consultou o Opus em 0 de 2 execuções/);
});

test('C8 parseUsage reads the session and week percentages and their resets', () => {
  const u = parseUsage(USAGE);
  assert.equal(u.session.pct, 45);
  assert.equal(u.week.pct, 34);
  assert.equal(u.session.resets, 'Nov 27, 3:19pm (America/Cuiaba)');
  assert.equal(u.week.resets, 'Nov 27, 2:59pm (America/Cuiaba)');
});

const w = (pct, resets) => ({ pct, resets });
const spent = [run({ cost: 2.5, sgCost: 0.5 }), run({ rep: 2, cost: 3.0 })]; // US$ 6,00 in all

test('C9 a window that reset during the round is invalid; the other is still computed', () => {
  const md = report(spent, { before: { session: w(40, 'A'), week: w(30, 'W') }, after: { session: w(50, 'B'), week: w(33, 'W') } });
  assert.match(md, /Sessão de 5 horas: 40% → 50%, inválida \(a janela reiniciou durante a rodada\)/);
  assert.match(md, /Semana \(todos os modelos\): 30% → 33% \(\+3 pontos\): \*\*US\$ 2,00 por 1%\*\*/);
});

test('C10 US$ per 1% is the round total, Claude plus plugin, over the points used', () => {
  const md = report(spent, { before: { session: w(40, 'A'), week: w(30, 'W') }, after: { session: w(50, 'A'), week: w(33, 'W') } });
  assert.match(md, /Custo total da rodada \(Claude e security-guidance\): US\$ 6,00/);
  assert.match(md, /Sessão de 5 horas: 40% → 50% \(\+10 pontos\): \*\*US\$ 0,60 por 1%\*\*/);
  assert.match(md, /\*\*US\$ 2,00 por 1%\*\*/);
});

test('C11 no percentages is null, and --cota stops before preparing any arm', () => {
  assert.equal(parseUsage('Current session: 45% used'), null);
  assert.equal(parseUsage('erro'), null);
  // Without claude on PATH the /usage reading fails: the bench must stop before "Preparando o lado".
  const env = { ...process.env, PATH: path.dirname(process.execPath), CLAUDE_CODE_OAUTH_TOKEN: 'x' };
  const r = spawnSync(process.execPath, [RUN, '--cota', '--arms', 'toolkit', '--tasks', 'node-bugfix', '--reps', '1'], { encoding: 'utf8', env, timeout: 120000 });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /--cota/);
  assert.doesNotMatch(r.stdout, /Preparando o lado/);
});
