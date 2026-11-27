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

// The entry rule of AC 9, computed from the round.
function rule() {
  const all = runs();
  const arm = (a) => all.filter((r) => r.arm === a);
  const passes = (a) => arm(a).filter((r) => r.quality.pass).length;
  const cpp = (a) => (passes(a) ? arm(a).reduce((s, r) => s + r.cost, 0) / passes(a) : Infinity);
  for (const a of ['toolkit', 'explore', 'busca', 'busca-livre']) assert.ok(arm(a).length, `a rodada não tem o lado ${a}`);
  const sorted = (xs) => [...xs].sort((a, b) => a - b);
  const median = (xs) => { const s = sorted(xs); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
  const delegated = (r) => Object.values(r.delegations || {}).reduce((s, n) => s + n, 0);
  return {
    passes: cpp('busca') <= 0.85 * Math.min(cpp('toolkit'), cpp('explore')) && passes('busca') >= Math.max(passes('toolkit'), passes('explore')),
    livreDelegates: median(arm('busca-livre').map(delegated)),
  };
}

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
  for (const r of runs()) assert.equal(typeof r.delegations, 'object', `${r.task}/${r.arm}#${r.rep}`);
});

test('C9 if the entry rule passes, the plugin ships the same busca.md', () => {
  need();
  if (!rule().passes) return; // C12 covers the other outcome
  assert.equal(fs.readFileSync(SHIPPED, 'utf8'), read('bench/agents/busca.md'));
});

test('C10 bench/README records the round in the section the rule picks', () => {
  need();
  const md = read('bench/README.md');
  const at = md.indexOf('busca-livre');
  assert.ok(at > 0, 'cita busca-livre');
  const section = rule().passes ? '## Resultados' : '**O que não mostrou ganho:**';
  const start = md.indexOf(section);
  assert.ok(start >= 0 && at > start, `busca-livre dentro de ${section}`);
  const block = md.slice(at - 2000, at + 2000);
  assert.match(block, /Explore[^\n]*(haiku|sonnet|opus)/i, 'modelo do Explore');
  assert.match(block, /custo por acerto/i);
});

test('C11 if it entered and busca-livre never delegates, the GUIA tells to ask for it', () => {
  need();
  const { passes, livreDelegates } = rule();
  if (!passes || livreDelegates !== 0) return; // nothing to say in the GUIA
  assert.ok(read('docs/GUIA.md').includes('use o subagente busca'));
});

test('C12 if the rule fails, the plugin has no busca agent', () => {
  need();
  if (rule().passes) return; // C9 covers the other outcome
  assert.equal(fs.existsSync(SHIPPED), false);
});
