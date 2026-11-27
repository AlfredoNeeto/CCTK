// Entry rule over a real round (.specs/features/api-http/checks.md, C10).
// Outside `npm test`: needs BENCH_ROUND=<bench/results/...> from a round of api-contrato with the toolkit and sem-http arms.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../lib/toolkit.mjs';

const ROUND = process.env.BENCH_ROUND;

test('C10 toolkit (HTTP tests in the check) passes more than sem-http for at most +15% per pass, or the step leaves init-project', () => {
  assert.ok(ROUND && fs.existsSync(path.join(ROUND, 'runs.jsonl')), 'defina BENCH_ROUND com a pasta da rodada');
  const runs = fs.readFileSync(path.join(ROUND, 'runs.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    .filter((r) => r.task === 'api-contrato' && !r.error && r.models?.length);
  const stats = (arm) => {
    const c = runs.filter((r) => r.arm === arm);
    assert.ok(c.length, `a rodada não tem o lado ${arm}`);
    const passes = c.filter((r) => r.quality.pass).length;
    return { passes, cpp: passes ? c.reduce((s, r) => s + r.cost + (r.sgCost || 0), 0) / passes : Infinity };
  };
  const [t, s] = ['toolkit', 'sem-http'].map(stats);
  const entra = t.passes > s.passes && t.cpp <= 1.15 * s.cpp;
  const init = fs.readFileSync(path.join(REPO_ROOT, 'plugins', 'cctk', 'skills', 'init-project', 'SKILL.md'), 'utf8');
  assert.equal(init.includes('**Testes HTTP'), entra,
    `regra ${entra ? 'passou' : 'não passou'} (toolkit ${t.passes} acertos, US$ ${t.cpp.toFixed(3)}/acerto; sem-http ${s.passes}, US$ ${s.cpp.toFixed(3)})`);
});
