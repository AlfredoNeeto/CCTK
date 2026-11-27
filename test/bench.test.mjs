// Bench checks that spend no quota (.specs/features/subagente-busca/checks.md), one test per check, named C<n>.
// The report is exercised through `node bench/run.mjs --report <dir>` over synthetic rounds.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../lib/toolkit.mjs';

const run = (o) => ({
  task: 'node-question', arm: 'busca', rep: 1, models: ['claude-sonnet-5-5'],
  tokens: { input: 1, cacheWrite: 1, cacheRead: 1, output: 1 }, total: 4, fresh: 3, cost: 0.1, turns: 2, seconds: 10,
  answerChars: 10, denials: 0, lookups: 1, quality: { pass: true, passed: 1, total: 1 }, ...o,
});
const assistant = (...uses) => JSON.stringify({ type: 'assistant', message: { content: uses.map(([name, subagent_type]) => ({ type: 'tool_use', name, input: { subagent_type } })) } });

function report(runs, transcripts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-fixture-'));
  fs.writeFileSync(path.join(dir, 'runs.jsonl'), runs.map((r) => JSON.stringify(r)).join('\n') + '\n');
  for (const [name, lines] of Object.entries(transcripts)) {
    fs.mkdirSync(path.join(dir, 'transcripts'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'transcripts', `${name}.jsonl`), lines.join('\n'));
  }
  const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'bench', 'run.mjs'), '--report', dir], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const md = fs.readFileSync(path.join(dir, 'report.md'), 'utf8');
  fs.rmSync(dir, { recursive: true, force: true });
  return md;
}
// The cell of `arm` in the table row named `name`, inside the section of `task`.
function cell(md, task, name, arm) {
  const sec = md.split(/^## /m).find((s) => s.startsWith(task));
  const head = sec.split('\n').find((l) => l.startsWith('| Métrica')).split('|').map((c) => c.trim());
  const line = sec.split('\n').find((l) => l.startsWith(`| ${name} |`));
  assert.ok(line, `row ${name}`);
  return line.split('|').map((c) => c.trim())[head.indexOf(arm)];
}

test('C3 busca.md declares haiku, read-only tools and the arquivo:linha answer', () => {
  const md = fs.readFileSync(path.join(REPO_ROOT, 'bench', 'agents', 'busca.md'), 'utf8');
  const [, front, body] = md.split(/^---$/m);
  assert.match(front, /^name: busca$/m);
  assert.match(front, /^model: haiku$/m);
  assert.match(front, /^tools: Read, Grep, Glob$/m);
  assert.ok(body.includes('arquivo:linha'));
  assert.ok(body.includes('Não copie arquivos inteiros'));
});

test('C13 turns add up across result segments; cost comes from the last one', () => {
  const result = (turns, cost) => JSON.stringify({ type: 'result', num_turns: turns, total_cost_usd: cost, permission_denials: [] });
  const md = report([run({ delegations: { Explore: 1 }, turns: 1 })], {
    'node-question-busca-1': [result(2, 0.2), '{"type":"system","subtype":"init"}', result(1, 0.2)],
  });
  assert.equal(cell(md, 'node-question', 'Turnos', 'busca'), '3');
});

test('C5 Agent and Task calls in a transcript are counted by subagent type', () => {
  const md = report([run({ delegations: undefined })], {
    'node-question-busca-1': ['{"type":"system","subtype":"init"}', assistant(['Agent', 'Explore'], ['Read', undefined]), assistant(['Agent', 'Explore']), assistant(['Task', 'busca']), 'not json'],
  });
  assert.match(md, /- \*\*busca\*\*: .*subagentes chamados: Explore 2, busca 1$/m);
  assert.equal(cell(md, 'node-question', 'Delegações por execução', 'busca'), '3');
});

test('C6 the task section has the median of delegations per arm', () => {
  const md = report([1, 2, 5].map((k, i) => run({ rep: i + 1, delegations: { busca: k } })));
  assert.equal(cell(md, 'node-question', 'Delegações por execução', 'busca'), '2');
});

test('C7 the report warns when no busca run used Haiku, and only then', () => {
  const warn = /Atenção:\*\* nenhuma execução do lado `busca` registrou Haiku/;
  assert.match(report([run({ delegations: {} })]), warn);
  assert.doesNotMatch(report([run({ delegations: { busca: 1 }, models: ['claude-sonnet-5-5', 'claude-haiku-5-5'] })]), warn);
});

test('C8 an old run with no delegations field and no transcript reports 0', () => {
  const { delegations, ...old } = run({});
  const md = report([old]);
  assert.equal(cell(md, 'node-question', 'Delegações por execução', 'busca'), '0');
});
