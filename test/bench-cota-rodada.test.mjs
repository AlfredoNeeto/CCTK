// Checks over a real bench round (.specs/features/bench-cota/checks.md), one test per check, named C<n>.
// Outside `npm test`: needs BENCH_ROUND=<bench/results/...> from a round with the toolkit, sg-sonnet and sem-sg arms.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROUND = process.env.BENCH_ROUND;
const need = () => assert.ok(ROUND && fs.existsSync(path.join(ROUND, 'runs.jsonl')), 'defina BENCH_ROUND com a pasta da rodada');
const runs = () => fs.readFileSync(path.join(ROUND, 'runs.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => !r.error && r.models?.length);
const init = (r) => fs.readFileSync(path.join(ROUND, 'transcripts', `${r.task}-${r.arm}-${r.rep}.jsonl`), 'utf8').split(/\r?\n/)
  .map((l) => { try { return JSON.parse(l); } catch { return null; } }).find((e) => e?.subtype === 'init');
const hasSg = (r) => init(r).plugins.some((p) => /security-guidance/.test(p.name ?? p));

test('C1 in the round, sem-sg runs without security-guidance, and sg-sonnet reviews on Sonnet', () => {
  need();
  const all = runs();
  for (const r of all.filter((x) => x.arm === 'sem-sg')) {
    assert.ok(!hasSg(r), `${r.task}/sem-sg#${r.rep} has security-guidance`);
    assert.ok(!('sgCost' in r), `${r.task}/sem-sg#${r.rep} has sgCost`);
  }
  for (const r of all.filter((x) => x.arm === 'sg-sonnet' || x.arm === 'toolkit')) assert.ok(hasSg(r), `${r.task}/${r.arm}#${r.rep}`);
  const sonnet = all.filter((x) => x.arm === 'sg-sonnet' && x.sgReviews);
  assert.ok(sonnet.length, 'nenhuma revisão no sg-sonnet');
  for (const r of sonnet) assert.ok(r.sgModels.every((m) => /sonnet/i.test(m)), `${r.task}/sg-sonnet#${r.rep}: ${r.sgModels}`);
});
