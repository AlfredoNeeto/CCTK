# Subagente de busca em Haiku verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 1f54eac..4935b85
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

All 14 checks proven at HEAD (4935b85), each with a located assertion. This round is scoped by the fix diff
`156bacc..4935b85` (7754bae in between only added the round-1 report) plus every round-1 gap. The proofs for C1-C14
were all re-run in full at 4935b85. The round used is still `bench/results/2026-11-27T14-45-03-319Z` (48 runs,
0 errors, 48 transcripts). No new round was started; `--report` was only run on a scratch copy of the round.
Of the round-1 gaps, C3, C5 and C10 are closed. C9 is partly closed and O1 is closed for turns. Three precision
gaps remain (see Findings). None of them turns a proof red or changes the conclusion in `bench/README.md`.

## Binding sources

Carried from 156bacc: no binding source. The plan's Sources are context, not marked binding, and step 1 is `ui`-only.

## Checks

Verified at 4935b85. Three invocations:
- `node bench/run.mjs --arms explore,busca,busca-livre --tasks node-question --dry` exited 0 (`ok node-question: sem solução 0/9, com solução 9/9, check passa`).
- `node --test test/bench.test.mjs` exited 0: 6 tests, 6 pass, listed individually as C3, C13, C5, C6, C7 and C8.
- `BENCH_ROUND=bench/results/2026-11-27T14-45-03-319Z node --test test/bench-rodada.test.mjs` exited 0: 10 tests, 10 pass, listed individually as C9 (fixture rule), C1, C2, C4, C5, C9 (round), C10, C11, C12 and C14. Without `BENCH_ROUND`, the file gives 1 pass and 9 fail. The pass is the C9 fixture test, which does not need the round. So none of the round tests can pass without the round.

Every named test exists in the tree (cited below). Both test files changed in the fix diff, and the new tests (C9 fixture, C13, C14) are in it.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `--dry` with the 3 new arms exits 0; in the round, the 3 arms have `cctk` in the init `plugins` | `--dry` exit 0; rodada batch, `C1` passed | `bench/run.mjs:64`: `ARMS.every((a) => ALL_ARMS.includes(a))` over `ALL_ARMS` (`bench/run.mjs:32`, which has `explore`, `busca`, `busca-livre`); `TOOLKIT_BASED` at `:33`. `test/bench-rodada.test.mjs:52`: `assert.ok(init(r).plugins.some((p) => /cctk/.test(p.name ?? p)))` for the 36 runs of the 3 arms | PASS |
| C2 | init `agents` has `busca` in every `busca`/`busca-livre` run and in no `toolkit`/`explore` run | rodada batch, `C2` passed | `test/bench-rodada.test.mjs:59`: `assert.equal(init(r).agents.includes('busca'), r.arm.startsWith('busca'))` over all 48 runs. Copy site `bench/run.mjs:236-239` (unchanged by the fix) | PASS |
| C3 | frontmatter `name: busca`, `model: haiku`, `tools: Read, Grep, Glob`; body has `arquivo:linha` and `Não copie arquivos inteiros` | bench batch, `C3` passed | `test/bench.test.mjs:43-45`: `assert.match(front, /^name: busca$/m)`, `/^model: haiku$/m`, `/^tools: Read, Grep, Glob$/m`; `:46` `body.includes('arquivo:linha')`; `:47` (new) `assert.ok(body.includes('Não copie arquivos inteiros'))`, which matches `bench/agents/busca.md:12`. Round-1 gap P4 closed | PASS |
| C4 | `explore` prompt has `Explore` and ends with the task prompt; `busca` has `busca` and ends with it; `busca-livre` equals it | rodada batch, `C4` passed | `test/bench-rodada.test.mjs:67`: `r.prompt.includes('Explore') && r.prompt.endsWith(p)`; `:68`: `r.prompt.includes('subagente busca') && r.prompt.endsWith(p)`; `:69`: `assert.equal(r.prompt, p)`. The recorded `prompt` is the same variable sent as stdin (`bench/run.mjs:326,328,336`); prefixes at `bench/run.mjs:42-43` | PASS |
| C5 | 2 `Agent` calls to Explore and 1 `Task` call to busca give `{ Explore: 2, busca: 1 }`; every round run has `delegations` as an object (not null, not a list) of integer counts | bench batch `C5` passed; rodada batch `C5` passed | `test/bench.test.mjs:62`: `assert.match(md, /- \*\*busca\*\*: .*subagentes chamados: Explore 2, busca 1$/m)`; `:63` delegation cell `'3'`. Counter `bench/run.mjs:278`, used by `runOnce` (`:346`) and `--report` (`:475`). `test/bench-rodada.test.mjs:77` (new): `assert.ok(d && typeof d === 'object' && !Array.isArray(d) && Object.values(d).every(Number.isInteger))`. That rejects null, arrays and non-integer counts. Recomputed: 0 null `delegations` in the round. Round-1 gap P3 closed | PASS |
| C6 | fixture with 1, 2 and 5 delegations gives median `2` in the task's `Delegações por execução` row | bench batch, `C6` passed | `test/bench.test.mjs:68`: `assert.equal(cell(md, 'node-question', 'Delegações por execução', 'busca'), '2')`. Row emitted at `bench/run.mjs:443` | PASS |
| C7 | a warning naming `busca` and `Haiku` when no `busca` run has haiku; absent when one has `claude-haiku-5-5` | bench batch, `C7` passed | `test/bench.test.mjs:73`: `assert.match(report([run({ delegations: {} })]), warn)`; `:74`: `assert.doesNotMatch(...)` with `models: ['claude-sonnet-5-5', 'claude-haiku-5-5']`. Warning text at `bench/run.mjs:423` | PASS |
| C8 | an old run without `delegations` and without a transcript: `--report` exits 0 and shows `0` | bench batch, `C8` passed | `test/bench.test.mjs:26`: `assert.equal(r.status, 0, r.stderr)`; `:80`: `assert.equal(cell(md, 'node-question', 'Delegações por execução', 'busca'), '0')`. The transcript branch at `bench/run.mjs:473-477` is skipped when there is no file | PASS |
| C9 | rule proven on fixtures (exactly 15% passes, 14% fails, against explore when it is cheaper, fewer passes fails, more passes passes); computed on the round; if it passes, the shipped file equals `bench/agents/busca.md` | rodada batch, both `C9` tests passed (round test returns early: rule is false) | Rule at `test/bench-rodada.test.mjs:33`: `b.cpp <= 0.85 * Math.min(t.cpp, e.cpp) && b.passes >= Math.max(t.passes, e.passes)`. Fixtures at `:42-46`, for example `:42` `assert.equal(rule(round([0.1, 0.2, 0.085, 0.1])).passes, true, 'exactly 15% cheaper')` and `:43` `... 0.086 ...).passes, false`. Round branch at `:84-85`. Recomputed from `runs.jsonl`: busca 1.2662/10 = 0.1266 against 0.85 x min(0.1236, 0.1845) = 0.1051, and 10 passes against 12, so the rule fails on both legs. A `rule()` that always returns false is now caught (fails `:42`). A rule comparing against the wrong arm is not caught: see G1 | PASS |
| C10 | `bench/README.md`, only inside the block the rule picks, has one row per arm with cost per pass, passes and median delegations equal to the round's, and `Explore rodou em Sonnet (claude-sonnet` | rodada batch, `C10` passed | `test/bench-rodada.test.mjs:97`: the block runs from `**O que não mostrou ganho:**` to the next line starting with `**`, which is README lines 108-139 (it stops at `**Fluxos de spec` on line 140). `:99` picks this block, or for a passing rule `## Resultados` minus this block. `:106`: `assert.equal(cells[2], \`US$ ${cpp.toFixed(3).replace('.', ',')}\`)`; `:107`: `assert.equal(cells[3], \`${passes}/${n}\`)`; `:108`: `assert.equal(cells[4], String(delegations))` for each of the 4 arms; `:110`: `assert.match(block, /Explore rodou em Sonnet \(claude-sonnet/)`. README rows at lines 121-124 match the recomputed values: 0,124 12/12 0; 0,184 12/12 1; 0,127 10/12 1; 0,123 12/12 0. A row outside lines 108-139, or any value off by one digit, fails. Round-1 gap P1 closed | PASS |
| C11 | if the rule passed and the `busca-livre` median is 0, the GUIA has `use o subagente busca` | rodada batch, `C11` passed (early return: rule is false) | `test/bench-rodada.test.mjs:116` returns early; `:117` `read('docs/GUIA.md').includes('use o subagente busca')` did not run. The rule it gates on is now proven on fixtures (C9 `:42-46`), and `livreDelegates` is the median of 12 empty objects, which is 0. The GUIA has no such phrase, consistent with AC 11 not applying | PASS |
| C12 | if the rule fails, `plugins/cctk/agents/busca.md` does not exist | rodada batch, `C12` passed (this branch ran) | `test/bench-rodada.test.mjs:122` (not taken); `:123`: `assert.equal(fs.existsSync(SHIPPED), false)`. `plugins/cctk/agents/` holds only `spec-reviewer.md` and `third-party-auditor.md`; `git diff --stat 1f54eac..HEAD -- plugins` is empty | PASS |
| C13 | a transcript with two `result` events (2 and 1 turns) gives `Turnos` = `3` in `--report`; cost comes from the last event and time is the run's wall clock | bench batch, `C13` passed | `test/bench.test.mjs:55`: `assert.equal(cell(md, 'node-question', 'Turnos', 'busca'), '3')`. The fixture run records `turns: 1` (`:52`), so the 3 can only come from `segments()` (`bench/run.mjs:265-275`) through the `--report` override at `bench/run.mjs:476`. `runOnce` calls the same function (`bench/run.mjs:331`) and takes time from `Date.now() - started` (`:330`). On a scratch copy of the round, `--report` turns the explore and busca `Turnos` row from 1 into 3. Cost and time are not asserted: see G2 | PASS |
| C14 | the GUIA's `Economizar cota` says `o Explore roda em Sonnet`, cites `~<n>% mais por acerto` with n recomputed from the round (49), and links `bench/README.md` | rodada batch, `C14` passed | `test/bench-rodada.test.mjs:129`: `pct = Math.round((stats(all, 'explore').cpp / stats(all, 'toolkit').cpp - 1) * 100)`; `:132`: `item.includes('o Explore roda em Sonnet')`; `:133`: `` item.includes(`~${pct}% mais por acerto`) ``; `:134`: `item.includes('../bench/README.md#')`. The slice is `## Economizar cota` (GUIA line 159) up to the next `## `. The text is at `docs/GUIA.md:171-173`. Recomputed: 0.18448/0.12363 = 1.4927, which rounds to 49 | PASS |

## Round data vs `bench/README.md` and `docs/GUIA.md`

Verified at 4935b85 for the lines the fix touched; the rest is carried from 156bacc.
- The table at README lines 119-124 has the 4 arms with cost per pass, passes and median delegations. Recomputed from `runs.jsonl`: toolkit 1.4835/12 = 0.1236, 12/12, 0; explore 2.2137/12 = 0.1845, 12/12, 1; busca 1.2662/10 = 0.1266, 10/12, 1; busca-livre 1.4806/12 = 0.1234, 12/12, 0. All match. This also covers the AC 10 part on delegations that round 1 found missing.
- "~49% mais por acerto" (README line 129, GUIA line 172) is right: +49.3%. The round-1 README said ~48%.
- "o Explore roda em Sonnet" in the GUIA: carried from 156bacc. The explore arm's `modelUsage` and its subagent messages are only `claude-sonnet-5-5`.
- The GUIA link `../bench/README.md#resultados-19112026` resolves to `## Resultados (19/11/2026)` (README line 55). The busca entry sits inside that section (lines 116-133).
- "Um subagente em Haiku saiu mais barato" (GUIA line 172) is true per run: busca cost US$ 1,27 against US$ 1,48 for toolkit over 12 runs each. It is not true per pass (0,127 against 0,124), and it sits next to a per-pass figure. See G4.
- For every one of the 48 runs, the recorded `cost` equals the last `result` event's `total_cost_usd` in the transcript.

## Findings

Round-1 gaps:
- P1 (C10 placement and values): closed. The block is bounded on both sides and the pass branch subtracts the sem-ganho block. Each arm's 3 values are asserted with exact equality against the round.
- P2 (C9/C11 vacuous, no fixture for `rule()`): partly closed. `rule()` now has 5 fixture cases, and an always-false rule fails. A rule comparing against the wrong arm still passes (G1).
- P3 (C5 accepting null): closed.
- P4 (C3 "no whole files"): closed.
- O1 (turns and time from the last segment only): closed for turns, in both `runOnce` and `--report`, through one shared `segments()`. Time is fixed going forward only (G3).

Ranked gaps (precision gaps; none makes a proof red, and none changes this round's outcome):
1. G1 (C9, AC 9): I ran the 5 fixtures of `test/bench-rodada.test.mjs:42-46` against mutant rules. These pass all 5: cost compared against `toolkit` only; passes compared against `toolkit` only; passes compared against `Math.min` instead of `Math.max`. The case "against explore when it is the cheaper one" (`:44`, busca 0.085, explore 0.1, toolkit 0.2) expects true, and a toolkit-only rule also returns true, since 0.085 <= 0.17. A fixture with busca between 0.85 x explore and 0.85 x toolkit expecting false would kill the first mutant. A case where explore has more passes than busca and toolkit fewer would kill the other two. Killed: always false, `<` in place of `<=`, explore-only cost, `Math.max` cost. This round is unaffected: toolkit is the cheaper arm and both baselines have 12 passes.
2. G2 (C13, AC 13): the test asserts only `Turnos` = 3. Both fixture `result` events carry the same cost (0.2, `test/bench.test.mjs:53`), and `--report` never reads cost from a transcript, so "o custo vem do último evento" is asserted nowhere. Wall-clock time (`bench/run.mjs:330`) is also asserted nowhere. No test runs `runOnce`, since it needs a real `claude`. The claim and the test name say more than the proof exercises. By reading, the code uses `results.at(-1)` for `res` (`bench/run.mjs:272`) and the wall clock for `seconds` (`:330`).
3. G3 (O1 remainder, outside every check): in this round's `runs.jsonl`, `seconds` for explore and busca is still the last segment only. Transcripts cannot repair it, so a regenerated report still shows Tempo ~5 s for those arms. The round's stored `report.md` was not regenerated and still shows Turnos 1. Regenerating it in a scratch copy gives 3. The README and GUIA cite neither turns nor time.
4. G4 (C14, wording): see the "saiu mais barato" note above. C14 checks only the link prefix `../bench/README.md#`, not that the anchor resolves; it does resolve.

Carried from 156bacc: O2 (`node-question-trap-busca-2` has `claude-opus-5-5` in `modelUsage` with no Opus message, probably the advisor).

## Coverage

Light profile - not run (the author's Coverage table was read, not recomputed).

## Test policy rows

Light profile - not run; checks.md carries no Test policy section.

## Faults injected

Light profile - not run. The mutant rules in G1 were run on the C9 fixture inputs, in an out-of-tree script that copies `stats` and `rule`, to answer the round-1 question. The real tree was not mutated.

## Swept existing

Verified at 4935b85 (`bench/run.mjs` was touched, so the line numbers were refreshed):
- validation: present. `bench/run.mjs:64` throws `--arms aceita: ...`.
- failure modes: present. `bench/run.mjs:392` `failed = (r) => r.error` or no models; the errored runs are listed at `bench/run.mjs:430` (`fora das medianas`).
- dependency failure: present. `bench/run.mjs:87` throws `clone de ${url}@${commit} falhou`; `bench/run.mjs:193` stops when `oauth.expiresAt - Date.now() < need`; `bench/run.mjs:497` checks mid-loop.

## Gate

`npm test` - 64 tests, 63 passed, 0 failed, 1 skipped (the `E2E_REAL=1` one); it includes `test/bench.test.mjs`. `test/bench-rodada.test.mjs` is outside `npm test` by design and was run by hand above: 10/10 with `BENCH_ROUND`. `git status --porcelain` was empty after all runs, except for this report.
