# Subagente de busca em Haiku verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 1f54eac..156bacc
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 12 checks proven at HEAD (156bacc), each with a located assertion. The round used is
`bench/results/2026-11-27T14-45-03-319Z` (48 runs, 0 errors, 48 transcripts). No new round was started.
The verdict is on the checks as written. The precision gaps and observations below are about the checks
and the measurement. None of them turns a proof red or changes the conclusion in `bench/README.md`.

## Binding sources

No binding source: the plan's Sources (`bench/README.md`, `docs/ROADMAP.md`) are context, not marked binding. Step 1 is `ui`-only anyway.

## Checks

Proofs were run in three invocations at HEAD:
- `node bench/run.mjs --arms explore,busca,busca-livre --tasks node-question --dry` exited 0 (`ok node-question: sem solução 0/9, com solução 9/9, check passa`). As a negative control, `--arms nope --dry` exited 1 with `--arms aceita: ... explore, busca, busca-livre`.
- `node --test test/bench.test.mjs` exited 0: 5 tests, 5 pass. C3, C5, C6, C7 and C8 each listed as passed.
- `BENCH_ROUND=bench/results/2026-11-27T14-45-03-319Z node --test test/bench-rodada.test.mjs` exited 0: 8 tests, 8 pass. C1, C2, C4, C5, C9, C10, C11 and C12 each listed as passed. Without `BENCH_ROUND` the same file reports 8 fail, so the round tests cannot pass when the round is absent (`test/bench-rodada.test.mjs:10` `need()`).

Both test files are new in the diff range. Every named test exists in the tree (cited below).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `--dry` with the 3 new arms exits 0; in the round the 3 arms have `cctk` in the init `plugins` | `--dry` exit 0; rodada batch, `C1` passed | `bench/run.mjs:64`: `ARMS.every((a) => ALL_ARMS.includes(a))` over `ALL_ARMS` at `bench/run.mjs:32`, which now holds `explore`, `busca` and `busca-livre`; `TOOLKIT_BASED` at `bench/run.mjs:33`. `test/bench-rodada.test.mjs:37`: `assert.ok(init(r).plugins.some((p) => /cctk/.test(p.name ?? p)))` for every run of the 3 arms (36 runs) | PASS |
| C2 | init `agents` has `busca` in every `busca`/`busca-livre` run and in no `toolkit`/`explore` run | rodada batch, `C2` passed | `test/bench-rodada.test.mjs:44`: `assert.equal(init(r).agents.includes('busca'), r.arm.startsWith('busca'))` over all 48 runs, so both directions are checked. Copy site: `bench/run.mjs:236-239` | PASS |
| C3 | `busca.md` frontmatter `name: busca`, `model: haiku`, `tools: Read, Grep, Glob`; body has `arquivo:linha` | bench batch, `C3` passed | `test/bench.test.mjs:43-45`: `assert.match(front, /^name: busca$/m)`, `/^model: haiku$/m`, `/^tools: Read, Grep, Glob$/m`; `test/bench.test.mjs:46`: `body.includes('arquivo:linha')`. See P4 | PASS |
| C4 | `explore` prompt has `Explore` and ends with the task prompt; `busca` has `busca` and ends with it; `busca-livre` equals it | rodada batch, `C4` passed | `test/bench-rodada.test.mjs:52`: `r.prompt.includes('Explore') && r.prompt.endsWith(p)`; `:53`: `r.prompt.includes('subagente busca') && r.prompt.endsWith(p)`; `:54`: `assert.equal(r.prompt, p)`. `p` is read from `bench/tasks/<id>/task.json` (`:14`). The recorded `prompt` is the same variable sent as stdin (`bench/run.mjs:312,314,325`) | PASS |
| C5 | 2 `Agent`->`Explore` + 1 `Task`->`busca` gives `{ Explore: 2, busca: 1 }`; every round run has `delegations` | bench batch `C5` passed; rodada batch `C5` passed | `test/bench.test.mjs:53`: `assert.match(md, /- \*\*busca\*\*: .*subagentes chamados: Explore 2, busca 1$/m)` (the transcript also carries a `Read` tool_use and a non-JSON line, which are ignored); `:54`: delegation cell `'3'`. Counter: `bench/run.mjs:264-276`, the same function `runOnce` uses (`:335`) and `--report` uses (`:462`). `test/bench-rodada.test.mjs:60`: `assert.equal(typeof r.delegations, 'object')`. See P3 | PASS |
| C6 | fixture with 1, 2 and 5 delegations gives median `2` in the task's `Delegações por execução` row | bench batch, `C6` passed | `test/bench.test.mjs:59`: `assert.equal(cell(md, 'node-question', 'Delegações por execução', 'busca'), '2')`. `cell` takes the row inside the task section (`test/bench.test.mjs:33-37`). Row emitted at `bench/run.mjs:432` | PASS |
| C7 | warning line with `busca` and `Haiku` when no `busca` run has haiku; absent with `claude-haiku-5-5` | bench batch, `C7` passed | `test/bench.test.mjs:64`: `assert.match(report([run({ delegations: {} })]), warn)` with `warn = /Atenção:\*\* nenhuma execução do lado \`busca\` registrou Haiku/`; `:65`: `assert.doesNotMatch(...)` with `models: ['claude-sonnet-5-5', 'claude-haiku-5-5']`. Code: `bench/run.mjs:411-413` | PASS |
| C8 | old run without `delegations` and without transcript: `--report` exits 0 and shows `0` | bench batch, `C8` passed | `test/bench.test.mjs:26`: `assert.equal(r.status, 0, r.stderr)` (the helper every report test goes through); `test/bench.test.mjs:71`: `assert.equal(cell(md, 'node-question', 'Delegações por execução', 'busca'), '0')`. Fallback: `bench/run.mjs:354` `delegated` reads `Object.values` of `r.delegations`, falling back to `{}` when the field is absent (logical-or) | PASS |
| C9 | rule computed on the round; if it passes, `plugins/cctk/agents/busca.md` equals `bench/agents/busca.md` | rodada batch, `C9` passed (early return: rule is false) | Rule at `test/bench-rodada.test.mjs:29`: `cpp('busca') <= 0.85 * Math.min(cpp('toolkit'), cpp('explore')) && passes('busca') >= Math.max(passes('toolkit'), passes('explore'))`. This matches AC 9 and uses the same filter and formula as the report's Total row (`bench/run.mjs:381,389,442-444`). `:65`: `if (!rule().passes) return`; `:66`: `assert.equal(fs.readFileSync(SHIPPED), read('bench/agents/busca.md'))` did not run. I recomputed the rule from `runs.jsonl`: busca 1.2662/10 = 0.1266 against a threshold of 0.85 × min(0.1236, 0.1845) = 0.1051, and 10 passes against max(12, 12) = 12. Both legs fail, so the early return is the correct branch. See P2 | PASS |
| C10 | `bench/README.md` cites `busca-livre`, cost per pass of the 4 arms and the Explore model, under `O que não mostrou ganho` when the rule fails | rodada batch, `C10` passed | `test/bench-rodada.test.mjs:76`: `assert.ok(start >= 0 && at > start)` with `start = md.indexOf('**O que não mostrou ganho:**')` (README line 108) and `at` = first `busca-livre` (README line 117); `:78`: `assert.match(block, ...)` with a case-insensitive regex for `Explore` followed on the same line by haiku, sonnet or opus, which hits README line 129, "o Explore rodou em Sonnet (claude-sonnet-5-5)"; `:79`: `/custo por acerto/i`. By reading, the entry sits between line 108 and the next block at line 140, with all 4 per-arm costs (lines 119-124). See P1 | PASS |
| C11 | if the rule passed and the `busca-livre` median is 0, the GUIA says `use o subagente busca` | rodada batch, `C11` passed (early return: rule is false) | `test/bench-rodada.test.mjs:85`: returns early when `!passes` or `livreDelegates !== 0`; `:86`: `read('docs/GUIA.md').includes('use o subagente busca')` did not run. `livreDelegates` is the median at `:30` (0: all 12 `busca-livre` runs have `{}`). `grep "use o subagente busca" docs/GUIA.md` has no hit, which is consistent with AC 11 not applying. `docs/` is untouched in the diff range. See P2 | PASS |
| C12 | if the rule fails, `plugins/cctk/agents/busca.md` does not exist | rodada batch, `C12` passed (this branch ran) | `test/bench-rodada.test.mjs:91`: `if (rule().passes) return` (not taken); `:92`: `assert.equal(fs.existsSync(SHIPPED), false)` with `SHIPPED` = `plugins/cctk/agents/busca.md` (`:16`). `ls plugins/cctk/agents/` lists only `spec-reviewer.md` and `third-party-auditor.md`. `git diff --stat 1f54eac..HEAD -- plugins` is empty | PASS |

## Round data vs `bench/README.md`

I checked the README entry against `runs.jsonl`, `report.md` and the transcripts of the round:
- Cost per pass and passes: toolkit 1.4835/12 = 0.124 (12/12), explore 2.2137/12 = 0.184 (12/12), busca 1.2662/10 = 0.127 (10/12), busca-livre 1.4806/12 = 0.123 (12/12). These match README lines 121-124 and the report's Total row.
- "rodou em Haiku": the busca transcripts' subagent messages carry `claude-haiku-5-5` (for example `dotnet-humanizer-trace-busca-1`: 50 sub-agent messages on Haiku, 3 main messages on Sonnet).
- "errou 2 de 3 no rastreio": `dotnet-humanizer-trace` busca reps 2 and 3 have `quality.pass: false` (4/5). Their final answers give `NOME=.../NumberToWordsEngineContractFactory.cs`, while `solution.txt` expects `GenerationHelpers.cs`. Rep 1 gives `GenerationHelpers.cs`.
- "~35% menos por execução nas tarefas do Humanizer": median cost against toolkit is 0.111 vs 0.183 (−39%) and 0.104 vs 0.155 (−33%).
- "Explore rodou em Sonnet": the explore arm's `modelUsage` holds only `claude-sonnet-5-5`, and in the transcripts the subagent messages are `claude-sonnet-5-5` (22 in `dotnet-humanizer-trace-explore-1`). "~48% mais por acerto": 0.1845/0.1236 = +49%.
- "0 em 12 no busca-livre": all 12 runs have `delegations: {}`. In the explore and busca arms, every one of the 12 runs has exactly 1 delegation of its type.
- "não passou na regra": recomputed as in C9. It fails on cost and on passes independently.

## Findings

Precision gaps (the checks or tests are weaker than the claim or the AC). None makes a proof red.

- P1 (C10, AC 10): the placement assertion `test/bench-rodada.test.mjs:76` gives only a lower bound (`at > start`). An entry moved into a later block (for example "Fluxos de spec", README line 140) would still pass. The pass-branch needle `## Resultados` (README line 55) is the heading that *contains* `**O que não mostrou ganho:**` (line 108). So had the rule passed, the test could not tell the two placements apart. "custo por acerto dos 4 lados" is asserted only as the phrase `/custo por acerto/i` (`:79`), not as 4 values. The `Explore` model regex runs on a ±2000-character window, not on the entry. AC 10 also asks for "acertos e delegações dos 4 lados", which the check dropped. The README gives passes for all 4 arms, but delegations only for `busca-livre` ("0 em 12"). Explore and busca are implied by "o prompt pede", and toolkit is not stated.
- P2 (C9, C11): in this round both are vacuous by design (early return). Their positive branches have never run, and nothing tests `rule()` itself on a fixture. A `rule()` that always returned false would keep C9, C11 and C12 green here. For this round the outcome does not depend on that: I recomputed the rule independently (see C9) and it fails on both legs.
- P3 (C5 round): `typeof r.delegations === 'object'` (`test/bench-rodada.test.mjs:60`) also accepts `null`. In this round every value is a real object: `{}` or `{ Explore: 1 }` / `{ busca: 1 }`.
- P4 (C3, AC 3): AC 3's "sem conteúdo integral de arquivo" is not asserted. The body does say it (`bench/agents/busca.md:12`, "Não copie arquivos inteiros nem trechos longos").

Observations on the measurement (outside every check; they do not affect the rule's inputs):

- O1: in the explore and busca arms the transcripts carry **two** `result` events. A first answer says "o subagente ainda está rastreando", and a second comes after the subagent returns. `runOnce` takes the last one (`bench/run.mjs:318-320`). `total_cost_usd` and `modelUsage` are identical in both events, so cost per pass is unaffected. But `num_turns` and `duration_ms` cover only the last segment, which is why the report shows Turnos 1 and Tempo ~5 s for explore and busca. Those two rows are not comparable across arms in this round. The README does not cite them.
- O2: `node-question-trap-busca-2` has `claude-opus-5-5` in `modelUsage`, with no Opus assistant message in its transcript (probably the advisor). The README does not mention it, and the cost is included in the totals.

## Coverage

Light profile - not run (the author's Coverage table was read, not recomputed).

## Test policy rows

Light profile - not run; checks.md carries no Test policy section.

## Faults injected

Light profile - not run.

## Swept existing

- validation (`--arms` with an unknown name throws, cited `bench/run.mjs:59`): present, but the line drifted to `bench/run.mjs:64` (it was :59 at 1f54eac). `throw new Error(\`--arms aceita: ...\`)`. Confirmed live: `--arms nope --dry` exits 1.
- failure modes (an errored run stays out of the medians and is listed): present. `bench/run.mjs:381-382` `failed = (r) => r.error || !r.models?.length` and `cell` filters `!failed(r)`; `bench/run.mjs:418-419` lists `execuções com erro (fora das medianas)`.
- dependency failure (`cachedRepo` throws when the clone fails; `login` stops before the token expires): present. `bench/run.mjs:87` `throw new Error(\`clone de ${url}@${commit} falhou ...\`)`; `bench/run.mjs:193-195` throws when `oauth.expiresAt - Date.now() < need`; plus `bench/run.mjs:482` mid-loop.

## Gate

`npm test` - 63 tests, 62 passed, 0 failed, 1 skipped (the `E2E_REAL=1` one). It now includes `test/bench.test.mjs` (`package.json` test script, changed in range). `test/bench-rodada.test.mjs` is outside `npm test` on purpose (checks.md) and was run by hand above: 8/8 with `BENCH_ROUND`. `git status --porcelain` was empty after all runs except for this report.
