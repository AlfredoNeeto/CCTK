// Entry rule over a real round (.specs/features/prototipo-codigo/checks.md, C9).
// Outside `npm test`: needs BENCH_ROUND=<bench/results/...> from a round of proto-react with the toolkit and proto-codigo arms.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../lib/toolkit.mjs';

const ROUND = process.env.BENCH_ROUND;

test('C9 proto-codigo passes at least as often as toolkit for at least 15% less per pass, or the step leaves SKILL.md', () => {
  assert.ok(ROUND && fs.existsSync(path.join(ROUND, 'runs.jsonl')), 'defina BENCH_ROUND com a pasta da rodada');
  const runs = fs.readFileSync(path.join(ROUND, 'runs.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    .filter((r) => r.task === 'proto-react' && !r.error && r.models?.length);
  const stats = (arm) => {
    const c = runs.filter((r) => r.arm === arm);
    assert.ok(c.length, `a rodada não tem o lado ${arm}`);
    const passes = c.filter((r) => r.quality.pass).length;
    // Cost with the plugin: the security-guidance review is part of what the arm spends.
    return { passes, cpp: passes ? c.reduce((s, r) => s + r.cost + (r.sgCost || 0), 0) / passes : Infinity };
  };
  const [t, p] = ['toolkit', 'proto-codigo'].map(stats);
  const entra = p.passes >= t.passes && p.cpp <= 0.85 * t.cpp;
  const skill = fs.readFileSync(path.join(REPO_ROOT, 'plugins', 'cctk', 'skills', 'prototipo', 'SKILL.md'), 'utf8');
  assert.equal(skill.includes('## 6. Levar ao código'), entra,
    `regra ${entra ? 'passou' : 'não passou'} (proto-codigo ${p.passes} acertos, US$ ${p.cpp.toFixed(3)}/acerto; toolkit ${t.passes}, US$ ${t.cpp.toFixed(3)})`);
});
