# Benchmarks de cota verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 01f24e4..7360c73 (fix: 48be490..7360c73)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

All 11 checks are proven at 7360c73, verified at 7360c73 in a detached worktree checked out with
`core.autocrlf=false`. Nothing ran in the main tree. `node --test test/bench-cota.test.mjs` printed C1, C2, C3, C4,
C5, C7, C8, C9, C10 and C11 on separate lines, all passing (10/10, exit 0). C6 is the `--dry` command:
`node bench/run.mjs --dry --tasks long-pedidos,long-folha` exited 0 with one `ok` line per task. C1's round proof
(`test/bench-cota-rodada.test.mjs`) was **still not run, because no round exists yet** (it needs `BENCH_ROUND`). C1
is judged on its unit proof alone.

Scope of this round: the fix's diff in `48be490..7360c73`, as far as it touches bench-cota. That is `bench/run.mjs`,
`test/bench-cota.test.mjs`, `bench/tasks/long-*` (`task.json`, `solution/`, `hidden/`) and `checks.md` (C5's claim).
Round 1 had no non-PASS verdict. The same range also holds the prototipo-codigo feature. I did not judge its checks.
I did check that its changes to `bench/run.mjs` broke no bench-cota check: the `deps` linking (`linkDeps`),
`removeWorkspace`, `fs.realpathSync.native` for the workspace and the new `proto-codigo` arm. C2, C3, C8, C9, C10
and C11 have unchanged claims, tests and covered code (only line numbers moved), so their judgement is carried from
48be490 with refreshed citations. C1 and C7 sit in code next to the prototipo-codigo edits (`ALL_ARMS`,
`TOOLKIT_BASED`), so I re-read them. C4, C5 and C6 are re-judged in full.

## Binding sources

None. The plan marks no source as binding, and step 1 runs only under `ui`. Carried from 48be490.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `sg-sonnet` gets `SECURITY_REVIEW_MODEL`/`SG_AGENTIC_MODEL` = `claude-sonnet-5-5`; `sem-sg` installs `cctk` and no `security-guidance` | `✔ C1` at 7360c73; round proof not run (no round yet) | verified at 7360c73: `test/bench-cota.test.mjs:46` - `assert.deepEqual(s.env, {...'claude-sonnet-5-5'...})`; `:49` - `install cctk@cctk`; `:50` - no `security-guidance`. `proto-codigo` joins `TOOLKIT_BASED` (`bench/run.mjs:38`), so it gets the plugin through `SG_ARMS` (`:39`). That does not touch the two arms C1 covers. | PASS |
| C2 | two `Review usage:` lines give cost 0.0313, both models, reviews 2 | `✔ C2` | carried from 48be490 (unchanged): `test/bench-cota.test.mjs:61`, `:62`, `:63` | PASS |
| C3 | 2 `Stop hook: reviewing` + 1 `review=stop` gives incomplete 1; an empty or missing log gives zeros | `✔ C3` | carried from 48be490 (unchanged): `test/bench-cota.test.mjs:72`, `:73`, `:74` | PASS |
| C4 | plugin cost `0,020`, with-plugin `0,120`; a toolkit run without `sgCost`, or with `sgCost: null`, shows `não medido` | `✔ C4` | verified at 7360c73: `test/bench-cota.test.mjs:78` - `'0,020'`; `:80` - `'0,120'`; `:83` - field missing → `'não medido'`; `:86` - `sgCost: null` → `'não medido'` (new). Producer: `bench/run.mjs:398` sets `sgCost: null` when the log file does not exist; `:400` writes the measured fields only when it does. Consumer: `:489` - `unmeasured` is true when `!('sgCost' in r)` or `r.sgCost === null`, used at `:493` and `:529`. | PASS |
| C5 | ≥2 `long-*` tasks, each with ≥6 code files in `repo/`, a request naming ≥3 of them, and a reference solution that changes ≥3 of them | `✔ C5` | verified at 7360c73: `test/bench-cota.test.mjs:92` - `longs.length >= 2`; `:97` - `code.length >= 6`; `:101` - `named.length >= 3`; `:104` - `changed.length >= 3` (new). I diffed every `solution/` file against `repo/`. Each one really changes: pedidos changes `src/cupons.js` (new `desconto`), `src/frete.js` (new `freteDoPedido`) and `src/pedidos.js`. Folha changes `TabelaInss.cs` and `TabelaIrrf.cs` (new `Calcular` in each) and `FolhaService.cs`. | PASS |
| C6 | `--dry` on the long tasks: hidden tests fail without the solution, pass with it, check passes | `node bench/run.mjs --dry --tasks long-pedidos,long-folha` exit 0: `ok long-folha: sem solução NaN/NaN, com solução 16/16, check passa` / `ok long-pedidos: sem solução 0/14, com solução 14/14, check passa` | verified at 7360c73: `bench/run.mjs:200` - `const good = !before.pass && after.pass && check`; `:206` - `process.exit(ok ? 0 : 1)`. Workspaces are now built with `realpathSync.native` (`:123`) and removed with `removeWorkspace` (`:115-119`, `:205`). Both long tasks have no `deps`, so `linkDeps` does not run. | PASS |
| C7 | per-arm Opus consultations: `toolkit` 1 de 2, `sem-advisor` 0 de 2 | `✔ C7` | verified at 7360c73: `test/bench-cota.test.mjs:113`, `:114`; `bench/run.mjs:472-475` (unchanged logic) | PASS |
| C8 | `parseUsage` of the 27/11 text gives 45, 34 and both reset texts | `✔ C8` | carried from 48be490 (unchanged): `test/bench-cota.test.mjs:119`, `:120`, `:121`, `:122` | PASS |
| C9 | a session reset during the round makes that window invalid; the week is still computed | `✔ C9` | carried from 48be490 (unchanged): `test/bench-cota.test.mjs:130`, `:131` | PASS |
| C10 | US$ 6,00 total gives `US$ 0,60`/1% session and `US$ 2,00`/1% week | `✔ C10` | carried from 48be490 (unchanged): `test/bench-cota.test.mjs:136`, `:137`, `:138` | PASS |
| C11 | no percentages returns `null`; `--cota` exits 1 before preparing any arm | `✔ C11` | carried from 48be490 (unchanged): `test/bench-cota.test.mjs:142`, `:147`, `:149`. The `cota` setup is still at `bench/run.mjs:594`, before any arm is prepared. | PASS |

**Discrimination of the hidden tests (re-checked by hand at 7360c73).** In temp copies (repo + solution + hidden),
I built a naive solution for each task. It does everything the request says and ignores the unstated rules.
- long-pedidos: no `Math.min` cap in `desconto`, and `baixar` called line by line with no up-front stock check.
  Result 10/14. The only failures were the 4 `regra implícita` tests (`hidden.test.js:72`, `:81`, `:89`, `:107`).
- long-folha: IRRF base without subtracting the INSS, and FGTS subtracted from the net pay. Result 14/16. The only
  failures were `Regra_implicita_irrf_desconta_o_inss_da_base` and `Regra_implicita_fgts_nao_sai_do_liquido`
  (`HiddenFolhaTests.cs:77`, `:85`).

## Round-1 findings

1. **C5 weaker than AC 5 (1 file changed, not 3): resolved.** The C5 claim in `checks.md` now asks for a solution
   that changes ≥3 files, which matches AC 5 ("exige mudar no mínimo 3", `plan.md:78`). `test/bench-cota.test.mjs:102-104`
   asserts it. Each `task.json` prompt now asks for changes in (a), (b) and (c), naming three files and the functions
   to create in them. The hidden tests call those functions directly (`hidden.test.js:94`, `:101`;
   `HiddenFolhaTests.cs:21`, `:29`), so the change is required, not just named. The second half of round-1 finding 1
   (would the task draw the advisor out?) is still open as a judgement call. See remaining finding 3.
2. **long-folha IRRF and the simplified deduction: resolved.** The prompt now says "a empresa usa só as deduções
   legais, sem o desconto simplificado" (`bench/tasks/long-folha/task.json:3`). It also spells out the bracket formula
   in (b), which rules out the 2026 reduction as well. Ana's 23,83 (`HiddenFolhaTests.cs:79`) is now the only
   reading the request allows.
3. **long-pedidos bare `assert.throws` passing on the stub: resolved.** Every `assert.throws` now takes
   `erroDeVerdade` (`hidden.test.js:12`, used at `:46`, `:66`, `:69`, `:75`, `:84`, `:97`). Without the solution,
   0/14 pass (it was 3/11).
4. **`0,000` instead of `não medido` when the plugin log is missing: resolved** (`bench/run.mjs:398-400`, `:489`).
   See remaining finding 2 for the one place `null` still counts as 0.
5. **"consultou o Opus" for every arm except `padrao`: not addressed, carried.** Still `bench/run.mjs:472-475`.
   `proto-codigo` now gets the line too.
6. **`--cota` safety: (b) resolved.** The final `readUsage` is wrapped in a try (`bench/run.mjs:622`), so the report
   still comes out. (a) Windows `EBUSY` leaving a temp HOME is unchanged and carried.
7. **Existing behaviour: nothing broken.** `npm test` 98 tests, 97 passed, 0 failed, 1 skipped. The docs F6/F17
   `autocrlf` fragility is unchanged. This round was checked out with LF and did not hit it.
8. **C11 test portability: not addressed, carried.** Now at `test/bench-cota.test.mjs:145`.

## Gate

- `node --test test/bench-cota.test.mjs`: 10 passed, 0 failed (verified at 7360c73).
- `node bench/run.mjs --dry --tasks long-pedidos,long-folha`: 2 ok, exit 0 (needs node and dotnet; both present).
- `npm test` (worktree with `core.autocrlf=false`): 98 tests, 97 passed, 0 failed, 1 skipped (`E2E_REAL`).
- prototipo-codigo's `bench/run.mjs` changes break no bench-cota proof. All proofs above ran against them.

## Findings

Ranked, most important first. None of them turns a check red.

1. **long-folha: the hidden tests only compile if the model uses the exact method names, so a near miss scores 0
   on every test** - `bench/tasks/long-folha/hidden/tests/Folha.Tests/HiddenFolhaTests.cs:23`, `:31`. Without the
   solution the hidden project does not build, which is the `NaN/NaN` in `--dry`. That still counts as "fails", so C6
   passes. In a real run, a model that writes `TabelaInss.CalcularInss`, takes a `double`, or puts the method on
   another class fails the build. It then scores 0 on every hidden test, including the INSS, FGTS and implicit-rule
   ones it may have right. The prompt names both signatures exactly (`task.json:3`), so the risk is low. But the
   report's quality row will lump a naming slip in with a wrong payroll. long-pedidos has the same exposure through
   its named imports (`hidden.test.js:8-9`), except that a missing export gives `undefined` at call time and fails
   only those tests. The `NaN/NaN` in the `--dry` line is cosmetic (`bench/run.mjs:202`).
2. **The `Cota do Pro` total counts a missing plugin log as US$ 0** - `bench/run.mjs:542`
   (`(r.sgCost || 0)`). The cost rows now show `não medido` for `sgCost: null` (`:493`, `:529`). The quota section
   still adds 0 for such runs and prints "Custo total da rodada (Claude e security-guidance)" with no warning, so US$
   per 1% comes out low. C10's claim does not cover this case, so C10 stays PASS. Suggestion: add a line to the
   section when any run has `sgCost === null`.
3. **The long tasks are now spelled out step by step** - `bench/tasks/long-pedidos/task.json:3`,
   `bench/tasks/long-folha/task.json:3`. To require three files, the prompts now name each function to create, its
   file and its signature. That meets AC 5 to the letter. It also leaves less design to the model, which may weaken the
   S2 premise of a "sessão longa e difícil" that draws the advisor out. This is the half of round-1 finding 1 that the
   checks cannot settle. Only a real round (C7's "consultou o Opus" count on `long-*`) will show it.
4. **C5 counts files present in `solution/`, not files that differ** - `test/bench-cota.test.mjs:103`. A solution
   file copied unchanged from `repo/` would count. Today every one differs (diffed by hand), so this is a
   precision gap only. The test name at `:90` still says only "the prompt naming 3+".
5. **The producer side of C4 has no unit proof** - `bench/run.mjs:398-400`. C4 tests the report with a synthetic
   `sgCost: null`. That `runOnce` writes `null` when the log file is missing is shown only by reading the code (or
   by a real round).
6. Carried, unchanged: round-1 finding 5 (`bench/run.mjs:472-475`), 6(a) (`EBUSY` temp HOME) and 8
   (`test/bench-cota.test.mjs:145`).

## Distilled lessons

- A hidden test file that calls a function the stub does not have fails to compile, not just to pass. In a compiled
  language, that turns any naming slip into a zero on every test. Keep the stub's signatures in `repo/`, or accept the
  all-or-nothing gate on purpose and say so.
