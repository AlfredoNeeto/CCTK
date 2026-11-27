// Checks over a real bench round (.specs/features/subagente-busca/checks.md), one test per check, named C<n>.
// Outside `npm test`: needs BENCH_ROUND=<bench/results/...> from the full round of toolkit, explore, busca and busca-livre.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../lib/toolkit.mjs';

const ROUND = process.env.BENCH_ROUND;
const need = () => assert.ok(ROUND && fs.existsSync(path.join(ROUND, 'runs.jsonl')), 'defina BENCH_ROUND com a pasta da rodada');
const runs = () => fs.readFileSync(path.join(ROUND, 'runs.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => !r.error && r.models?.length);
const init = (r) => fs.readFileSync(path.join(ROUND, 'transcripts', `${r.task}-${r.arm}-${r.rep}.jsonl`), 'utf8').split(/\r?\n/)
  .map((l) => { try { return JSON.parse(l); } catch { return null; } }).find((e) => e?.subtype === 'init');
const taskPrompt = (id) => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'bench', 'tasks', id, 'task.json'), 'utf8')).prompt;
const read = (f) => fs.readFileSync(path.join(REPO_ROOT, f), 'utf8');
const SHIPPED = path.join(REPO_ROOT, 'plugins', 'cctk', 'agents', 'busca.md');

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const delegated = (r) => Object.values(r.delegations || {}).reduce((s, n) => s + n, 0);

// Per arm: runs, passes, cost per pass and median delegations, as the report's Total rows compute them.
function stats(all, a) {
  const c = all.filter((r) => r.arm === a);
  assert.ok(c.length, `a rodada não tem o lado ${a}`);
  const passes = c.filter((r) => r.quality.pass).length;
  return { n: c.length, passes, cpp: passes ? c.reduce((s, r) => s + r.cost, 0) / passes : Infinity, delegations: median(c.map(delegated)) };
}

// The entry rule of AC 9.
function rule(all) {
  const [t, e, b, l] = ['toolkit', 'explore', 'busca', 'busca-livre'].map((a) => stats(all, a));
  return {
    passes: b.cpp <= 0.85 * Math.min(t.cpp, e.cpp) && b.passes >= Math.max(t.passes, e.passes),
    livreDelegates: l.delegations,
  };
}

test('C9 the entry rule: 15% cheaper per pass with no fewer passes', () => {
  // cost per run for toolkit, explore, busca, busca-livre; pass = all pass unless listed in `fail`
  const round = (costs, fail = {}) => ['toolkit', 'explore', 'busca', 'busca-livre'].flatMap((arm, i) =>
    [1, 2].map((rep) => ({ arm, rep, cost: costs[i], quality: { pass: !(fail[arm] >= rep) }, delegations: {} })));
  assert.equal(rule(round([0.1, 0.2, 0.085, 0.1])).passes, true, 'exactly 15% cheaper');
  assert.equal(rule(round([0.1, 0.2, 0.086, 0.1])).passes, false, 'only 14% cheaper');
  assert.equal(rule(round([0.2, 0.1, 0.085, 0.1])).passes, true, 'against explore when it is the cheaper one');
  assert.equal(rule(round([0.1, 0.2, 0.01, 0.1], { busca: 1 })).passes, false, 'cheaper but fewer passes');
  assert.equal(rule(round([0.1, 0.2, 0.08, 0.1], { toolkit: 1 })).passes, true, 'more passes than the baseline');
});

test('C1 the new arms run as the toolkit, with the cctk plugin', () => {
  need();
  for (const r of runs().filter((x) => ['explore', 'busca', 'busca-livre'].includes(x.arm))) {
    assert.ok(init(r).plugins.some((p) => /cctk/.test(p.name ?? p)), `${r.task}/${r.arm}#${r.rep}`);
  }
});

test('C2 only busca and busca-livre have the busca agent', () => {
  need();
  for (const r of runs().filter((x) => ['toolkit', 'explore', 'busca', 'busca-livre'].includes(x.arm))) {
    assert.equal(init(r).agents.includes('busca'), r.arm.startsWith('busca'), `${r.task}/${r.arm}#${r.rep}`);
  }
});

test('C4 explore and busca ask for their subagent; busca-livre sends the task prompt as is', () => {
  need();
  for (const r of runs()) {
    const p = taskPrompt(r.task);
    if (r.arm === 'explore') assert.ok(r.prompt.includes('Explore') && r.prompt.endsWith(p), r.task);
    if (r.arm === 'busca') assert.ok(r.prompt.includes('subagente busca') && r.prompt.endsWith(p), r.task);
    if (r.arm === 'busca-livre') assert.equal(r.prompt, p, r.task);
  }
});

test('C5 every run of the round has delegations', () => {
  need();
  for (const r of runs()) {
    const d = r.delegations;
    assert.ok(d && typeof d === 'object' && !Array.isArray(d) && Object.values(d).every(Number.isInteger), `${r.task}/${r.arm}#${r.rep}`);
  }
});


test('C9 if the entry rule passes in the round, the plugin ships the same busca.md', () => {
  need();
  if (!rule(runs()).passes) return; // C12 covers the other outcome; the rule itself is proven on fixtures above
  assert.equal(fs.readFileSync(SHIPPED, 'utf8'), read('bench/agents/busca.md'));
});

test('C10 bench/README records the 4 arms of the round in the section the rule picks', () => {
  need();
  const md = read('bench/README.md');
  const between = (from, to) => {
    const a = md.indexOf(from);
    assert.ok(a >= 0, from);
    const b = md.indexOf(to, a + from.length);
    return md.slice(a, b < 0 ? undefined : b);
  };
  const semGanho = between('**O que não mostrou ganho:**', '\n**');
  const all = runs();
  const block = rule(all).passes ? between('## Resultados', '\n## ').replace(semGanho, '') : semGanho;
  assert.ok(block.includes('busca-livre'), 'busca-livre na seção certa');
  for (const arm of ['toolkit', 'explore', 'busca', 'busca-livre']) {
    const { n, passes, cpp, delegations } = stats(all, arm);
    const line = block.split('\n').find((l) => l.trim().startsWith('| `' + arm + '`'));
    assert.ok(line, `linha do lado ${arm}`);
    const cells = line.split('|').map((c) => c.trim());
    assert.equal(cells[2], `US$ ${cpp.toFixed(3).replace('.', ',')}`, `${arm}: custo por acerto`);
    assert.equal(cells[3], `${passes}/${n}`, `${arm}: acertos`);
    assert.equal(cells[4], String(delegations), `${arm}: delegações`);
  }
  assert.match(block, /Explore rodou em Sonnet \(claude-sonnet/, 'modelo do Explore');
});

test('C11 if it entered and busca-livre never delegates, the GUIA tells to ask for it', () => {
  need();
  const { passes, livreDelegates } = rule(runs());
  if (!passes || livreDelegates !== 0) return; // nothing to say in the GUIA; the rule is proven on fixtures in C9
  assert.ok(read('docs/GUIA.md').includes('use o subagente busca'));
});

test('C12 if the rule fails in the round, the plugin has no busca agent', () => {
  need();
  if (rule(runs()).passes) return; // C9 covers the other outcome
  assert.equal(fs.existsSync(SHIPPED), false);
});

test('C14 the GUIA warns that asking for the Explore costs more, with the round figure', () => {
  need();
  const all = runs();
  const pct = Math.round((stats(all, 'explore').cpp / stats(all, 'toolkit').cpp - 1) * 100);
  const g = read('docs/GUIA.md');
  const item = g.slice(g.indexOf('## Economizar cota'), g.indexOf('\n## ', g.indexOf('## Economizar cota') + 1));
  assert.ok(item.includes('o Explore roda em Sonnet'), 'diz em que modelo o Explore roda');
  assert.ok(item.includes(`~${pct}% mais por acerto`), `cita ~${pct}%`);
  assert.ok(item.includes('../bench/README.md#'), 'linka o benchmark');
});
