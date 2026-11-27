# Subagente de busca em Haiku verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 1f54eac..a3e7056
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

All 14 checks proven at HEAD (a3e7056), each with a located assertion. This round is scoped by the fix diff
`4935b85..a3e7056` (it touches `docs/GUIA.md`, `test/bench-rodada.test.mjs`, the C13 test name in `test/bench.test.mjs`,
`checks.md` and the round-2 report; nothing under `bench/`, `lib/` or `plugins/`) plus the round-2 gaps G1-G4. Every proof
was re-run in full at a3e7056 against `bench/results/2026-11-27T14-45-03-319Z` (48 runs, 0 errors). No bench round was
started. G1, G2 and G4 are closed. Four minor precision gaps remain (see Findings); none turns a proof red or changes this
round's outcome.

## Binding sources

Carried from 156bacc: no binding source. The plan's Sources are context, not marked binding, and step 1 is `ui`-only.

## Checks

Verified at a3e7056. Three invocations:
- `node bench/run.mjs --arms explore,busca,busca-livre --tasks node-question --dry` exited 0 (`ok node-question: sem solução 0/9, com solução 9/9, check passa`).
- `node --test test/bench.test.mjs` exited 0: 6 tests, 6 pass, listed individually as C3, C13 (`turns add up across result segments`), C5, C6, C7 and C8.
- `BENCH_ROUND=bench/results/2026-11-27T14-45-03-319Z node --test test/bench-rodada.test.mjs` exited 0: 11 tests, 11 pass, listed individually as C9 (fixture rule), C1, C2, C4, C5, C9 (round), C10, C11, C12, C14 and C13 (round cost, new). Without `BENCH_ROUND` the file gives 1 pass and 10 fail; the pass is the C9 fixture test, which does not read the round.

Every named test exists in the tree at the lines cited below. The fix diff added the C9 fixture cases (`:47-48`), the C14 anchor and wording asserts (`:136-141`) and the C13 round test (`:144-151`). Citations in `test/bench-rodada.test.mjs` were refreshed (lines after `:46` moved by 2); `test/bench.test.mjs` lines did not move.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `--dry` with the 3 new arms exits 0; in the round, the 3 arms have `cctk` in the init `plugins` | `--dry` exit 0; rodada batch, `C1` passed | `bench/run.mjs:64` `ARMS.every((a) => ALL_ARMS.includes(a))` over `ALL_ARMS` (`bench/run.mjs:32`, unchanged since 4935b85). `test/bench-rodada.test.mjs:54`: `assert.ok(init(r).plugins.some((p) => /cctk/.test(p.name ?? p)))` for the 36 runs of the 3 arms | PASS |
| C2 | init `agents` has `busca` in every `busca`/`busca-livre` run and in no `toolkit`/`explore` run | rodada batch, `C2` passed | `test/bench-rodada.test.mjs:61`: `assert.equal(init(r).agents.includes('busca'), r.arm.startsWith('busca'))` over all 48 runs | PASS |
| C3 | frontmatter `name: busca`, `model: haiku`, `tools: Read, Grep, Glob`; body has `arquivo:linha` and `Não copie arquivos inteiros` | bench batch, `C3` passed | `test/bench.test.mjs:43-45`: `assert.match(front, /^name: busca$/m)`, `/^model: haiku$/m`, `/^tools: Read, Grep, Glob$/m`; `:46` `body.includes('arquivo:linha')`; `:47` `body.includes('Não copie arquivos inteiros')` | PASS |
| C4 | `explore` prompt has `Explore` and ends with the task prompt; `busca` has `busca` and ends with it; `busca-livre` equals it | rodada batch, `C4` passed | `test/bench-rodada.test.mjs:69`: `r.prompt.includes('Explore') && r.prompt.endsWith(p)`; `:70`: `r.prompt.includes('subagente busca') && r.prompt.endsWith(p)`; `:71`: `assert.equal(r.prompt, p)` | PASS |
| C5 | 2 `Agent` calls to Explore and 1 `Task` call to busca give `{ Explore: 2, busca: 1 }`; every round run has `delegations` as an object of integer counts | bench batch `C5` passed; rodada batch `C5` passed | `test/bench.test.mjs:62`: `assert.match(md, /- \*\*busca\*\*: .*subagentes chamados: Explore 2, busca 1$/m)`; `:63` delegation cell `'3'`. `test/bench-rodada.test.mjs:79`: `assert.ok(d && typeof d === 'object' && !Array.isArray(d) && Object.values(d).every(Number.isInteger))` | PASS |
| C6 | fixture with 1, 2 and 5 delegations gives median `2` in the task's `Delegações por execução` row | bench batch, `C6` passed | `test/bench.test.mjs:68`: `assert.equal(cell(md, 'node-question', 'Delegações por execução', 'busca'), '2')` | PASS |
| C7 | a warning naming `busca` and `Haiku` when no `busca` run has haiku; absent when one has `claude-haiku-5-5` | bench batch, `C7` passed | `test/bench.test.mjs:73`: `assert.match(report([run({ delegations: {} })]), warn)`; `:74`: `assert.doesNotMatch(...)` with `models: ['claude-sonnet-5-5', 'claude-haiku-5-5']` | PASS |
| C8 | an old run without `delegations` and without a transcript: `--report` exits 0 and shows `0` | bench batch, `C8` passed | `test/bench.test.mjs:26`: `assert.equal(r.status, 0, r.stderr)`; `:80`: `assert.equal(cell(md, 'node-question', 'Delegações por execução', 'busca'), '0')` | PASS |
| C9 | rule proven on 7 fixture cases (exactly 15%, 14%, explore cheaper, fewer passes, more passes, 20% below toolkit but not 15% below explore, more passes than toolkit and fewer than explore); computed on the round; if it passes, the shipped file equals `bench/agents/busca.md` | rodada batch, both `C9` tests passed (round test returns early at `:86`: rule is false) | Rule `test/bench-rodada.test.mjs:33`: `b.cpp <= 0.85 * Math.min(t.cpp, e.cpp) && b.passes >= Math.max(t.passes, e.passes)`. Fixtures `:42-48`, new ones `:47` `rule(round([0.2, 0.15, 0.16, 0.1])).passes, false` and `:48` `rule(round([0.1, 0.2, 0.01, 0.1], { busca: 1, toolkit: 2 })).passes, false`. Round branch `:87` `assert.equal(fs.readFileSync(SHIPPED, 'utf8'), read('bench/agents/busca.md'))` not reached. Mutants run out of tree against the 7 cases: toolkit-only cost killed (`:47`), toolkit-only passes killed (`:48`), `Math.min` for passes killed (`:48`), always false killed (`:42`); also killed: explore-only cost, `Math.max` cost, no passes leg, `<` for `<=`, always true. Survives: explore-only passes (residual R1) | PASS |
| C10 | `bench/README.md`, only inside the block the rule picks, has one row per arm with cost per pass, passes and median delegations equal to the round's, and `Explore rodou em Sonnet (claude-sonnet` | rodada batch, `C10` passed | `test/bench-rodada.test.mjs:99` block from `**O que não mostrou ganho:**` to the next `\n**`; `:101` picks it (or `## Resultados` minus it on a pass); `:108`: `` assert.equal(cells[2], `US$ ${cpp.toFixed(3).replace('.', ',')}`) ``; `:109`: `` assert.equal(cells[3], `${passes}/${n}`) ``; `:110`: `assert.equal(cells[4], String(delegations))` for the 4 arms; `:112`: `assert.match(block, /Explore rodou em Sonnet \(claude-sonnet/)`. README untouched by the fix | PASS |
| C11 | if the rule passed and the `busca-livre` median is 0, the GUIA has `use o subagente busca` | rodada batch, `C11` passed (early return: rule is false) | `test/bench-rodada.test.mjs:118` returns early; `:119` `read('docs/GUIA.md').includes('use o subagente busca')` not reached. The gating rule is proven on 7 fixtures (C9 `:42-48`) | PASS |
| C12 | if the rule fails, `plugins/cctk/agents/busca.md` does not exist | rodada batch, `C12` passed (this branch ran) | `test/bench-rodada.test.mjs:125`: `assert.equal(fs.existsSync(SHIPPED), false)`. `plugins/cctk/agents/` holds only `spec-reviewer.md` and `third-party-auditor.md` | PASS |
| C13 | a transcript with two `result` events (2 and 1 turns) gives `Turnos` = `3` in `--report`; in the round each run's `cost` is the last `result` event's `total_cost_usd`; wall-clock time has no automated proof | bench batch `C13` passed; rodada batch `C13` (round cost) passed | `test/bench.test.mjs:55`: `assert.equal(cell(md, 'node-question', 'Turnos', 'busca'), '3')`. `test/bench-rodada.test.mjs:148-149`: `.filter((e) => e?.type === 'result').at(-1)` then `assert.equal(r.cost, last.total_cost_usd)` over all 48 runs. The claim now states the time limit itself, so it says no more than the two proofs assert. 24 of 48 transcripts have more than one `result` event; a sum-of-segments cost would fail on all 24 (R2 on what it cannot tell apart) | PASS |
| C14 | the GUIA's `Economizar cota` says `o Explore roda em Sonnet`, cites `~<n>% mais por acerto` with n from the round (49), links an anchor that exists in `bench/README.md`, and does not say the Haiku "saiu mais barato" without "por execução" | rodada batch, `C14` passed | `test/bench-rodada.test.mjs:131` `pct = Math.round((stats(all, 'explore').cpp / stats(all, 'toolkit').cpp - 1) * 100)`; `:134` `item.includes('o Explore roda em Sonnet')`; `:135` `` item.includes(`~${pct}% mais por acerto`) ``; `:136-140` anchor captured by `/\.\.\/bench\/README\.md#([\w-]+)/` and `assert.ok(slugs.includes(anchor))` over slugs of README headings; `:141` `assert.ok(!/Haiku saiu\s+mais barato,/.test(item))`. Text at `docs/GUIA.md:171-174`. Anchor `resultados-19112026` resolves to `## Resultados (19/11/2026)` (README line 55). Residuals R3, R4 | PASS |

## Round data vs `bench/README.md` and `docs/GUIA.md`

Verified at a3e7056 for the GUIA lines the fix touched; the README figures are carried from 4935b85 (README unchanged by the fix).
- Per pass: toolkit 0.1236, explore 0.1845, busca 0.1266, busca-livre 0.1234; passes 12, 12, 10, 12. Per run: toolkit 1.4835/12 = 0.1236, busca 1.2662/12 = 0.1055.
- GUIA `docs/GUIA.md:172-173` now reads "Um subagente em Haiku custou menos por execução, mas errou no rastreio entre arquivos e empatou no custo por acerto". "Menos por execução" is true (0.106 against 0.124). "Empatou no custo por acerto" is a fair rounding of 0,127 against 0,124 (+2.4%), and no longer implies a per-pass saving. G4 wording closed.
- "~49% mais por acerto" (GUIA line 172) recomputed: 0.18448/0.12363 = 1.4927, rounds to 49.
- For all 48 runs, `cost` equals the last `result` event's `total_cost_usd` (now asserted by C13's round test).

## Findings

Round-2 gaps:
- G1 (C9 fixtures): closed. All four mutants named in round 2 now fail a fixture: toolkit-only cost fails `:47`, toolkit-only passes and `Math.min` for passes fail `:48`, always false fails `:42`. Out-of-tree script copying `stats`, `rule` and `round` from the test; the real tree was not touched.
- G2 (C13 overclaim): closed. The claim was narrowed to what the proofs assert: `Turnos` = 3 from the fixture, cost from the last `result` over the real round, and an explicit sentence that wall-clock time has no automated proof. The bench test name no longer says "cost comes from the last one".
- G3 (round's stored seconds and report.md): outside every check and outside git; nothing in the fix diff touches it. Not re-judged; the caller states report.md was regenerated.
- G4 (GUIA wording and anchor): closed. The wording is now per run and per pass, and C14 resolves the anchor against the README's headings instead of checking a prefix.

Ranked residual gaps (minor precision gaps; none makes a proof red, none changes this round's outcome):
1. R1 (C9, AC 9): a rule that compares busca's passes against `explore` only (`b.passes >= e.passes`) passes all 7 fixtures. It is the mirror of the case `:48` added: no fixture has toolkit with more passes than busca and explore with fewer. In this round both baselines have 12 passes, so the outcome is unaffected.
2. R2 (C13, AC 13): in this round the first and the last `result` event carry the same `total_cost_usd` in every multi-segment transcript, so the round test cannot tell `results.at(-1)` from `results[0]` or from a max; it does reject a sum. The assertion still matches the claim as written.
3. R3 (C14): the anchor regex takes the first `README.md#` link in the `Economizar cota` section, which is item 3's link (`docs/GUIA.md:166`), not item 6's (`:174`). In a scratch copy, breaking only item 6's anchor is not caught; breaking both is. Today both resolve.
4. R4 (C14): the negative check `/Haiku saiu\s+mais barato,/` only catches the old phrasing. "Haiku saiu mais barato e errou" or "Haiku foi mais barato, mas" would pass. The current text is correct.

Carried from 4935b85: G3 note; O2 (`node-question-trap-busca-2` has `claude-opus-5-5` in `modelUsage` with no Opus message, probably the advisor).

## Coverage

Light profile - not run (the author's Coverage table was read, not recomputed).

## Test policy rows

Light profile - not run; checks.md carries no Test policy section.

## Faults injected

Light profile - not run. The mutant rules in G1 and R1 were run on the 7 C9 fixture inputs in an out-of-tree scratch script, and the C14 anchor and wording variants on scratch strings, to answer the round-2 questions. The real tree was not mutated.

## Swept existing

Carried from 4935b85 (the fix diff does not touch `bench/run.mjs`):
- validation: present. `bench/run.mjs:64` throws `--arms aceita: ...`.
- failure modes: present. `bench/run.mjs:392` `failed = (r) => r.error` or no models; errored runs listed at `bench/run.mjs:430`.
- dependency failure: present. `bench/run.mjs:87` throws on a failed clone; `bench/run.mjs:193` stops before the token expires; `bench/run.mjs:497` checks mid-loop.

## Gate

`npm test` - 64 tests, 63 passed, 0 failed, 1 skipped (the `E2E_REAL=1` one); it includes `test/bench.test.mjs`. `test/bench-rodada.test.mjs` is outside `npm test` by design and was run by hand above: 11/11 with `BENCH_ROUND`. `git status --porcelain` was empty after all runs, before this report was written.
