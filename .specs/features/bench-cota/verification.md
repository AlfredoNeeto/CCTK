# Benchmarks de cota verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 01f24e4..48be490
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 11 checks are proven at 48be490, each with a located assertion. Every proof ran in a detached worktree of
48be490, never in the main tree. `node --test test/bench-cota.test.mjs` printed C1, C2, C3, C4, C5, C7, C8, C9, C10
and C11 on separate lines, all passing (10/10). C6 is not a node test: `node bench/run.mjs --dry --tasks
long-pedidos,long-folha` exited 0 with one `ok` line per task. C1's round proof (`test/bench-cota-rodada.test.mjs`)
was **not run, because no round exists yet** (it needs `BENCH_ROUND`). C1 is judged on its unit proof alone.

The verdict is PASS against the checks as written. Finding 1 still needs a decision from the user: C5 is weaker than
the AC it lands. AC 5 says the request must *require changing* at least 3 files. C5 only asks that the request
*name* 3. Each long task's reference solution changes exactly one file.

## Binding sources

None. The plan marks no source as binding, and step 1 runs only under `ui`.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `sg-sonnet` gets `SECURITY_REVIEW_MODEL`/`SG_AGENTIC_MODEL` = `claude-sonnet-5-5`; `sem-sg` installs `cctk` and no `security-guidance` | `node --test test/bench-cota.test.mjs`, line `✔ C1 ...` exit 0; round proof not run (no round yet) | `test/bench-cota.test.mjs:46` - `assert.deepEqual(s.env, { SECURITY_REVIEW_MODEL: 'claude-sonnet-5-5', SG_AGENTIC_MODEL: 'claude-sonnet-5-5' })`; `:49` - `n.plugins.includes('install cctk@cctk')`; `:50` - `!n.plugins.some((p) => /security-guidance/.test(p))` | PASS |
| C2 | two `Review usage:` lines give cost 0.0313, both models, reviews 2 | same run, `✔ C2` | `test/bench-cota.test.mjs:61` - `assert.equal(u.cost, 0.0313)`; `:62` - `assert.deepEqual(u.models, ['claude-opus-5-5', 'claude-sonnet-5-5'])`; `:63` - `assert.equal(u.reviews, 2)` | PASS |
| C3 | 2 `Stop hook: reviewing` + 1 `review=stop` gives incomplete 1; an empty or missing log gives zeros | same run, `✔ C3` | `test/bench-cota.test.mjs:72` - `assert.equal(sgUsage(log).incomplete, 1)`; `:73`/`:74` - `assert.deepEqual(sgUsage(''), { cost: 0, models: [], reviews: 0, incomplete: 0 })` | PASS |
| C4 | report rows: plugin cost `0,020`, with-plugin `0,120`; a toolkit run without `sgCost` shows `não medido` | same run, `✔ C4` | `test/bench-cota.test.mjs:79` - `cell(md, ..., 'Custo do security-guidance (US$)', 'toolkit') === '0,020'`; `:81` - `'**Custo com o plugin (US$)**' ... '0,120'`; `:84` - `... 'toolkit') === 'não medido'` | PASS |
| C5 | ≥2 `long-*` tasks, each with ≥6 code files in `repo/` and a request naming ≥3 of them | same run, `✔ C5` | `test/bench-cota.test.mjs:90` - `assert.ok(longs.length >= 2)`; `:95` - `assert.ok(code.length >= 6)`; `:98` - `assert.ok(named.length >= 3)` (see finding 1: weaker than AC 5) | PASS |
| C6 | `--dry` on the long tasks: hidden tests fail without the solution, pass with it, check passes | `node bench/run.mjs --dry --tasks long-pedidos,long-folha` exit 0: `ok long-folha: sem solução 3/14, com solução 14/14, check passa` / `ok long-pedidos: sem solução 3/11, com solução 11/11, check passa` | `bench/run.mjs:174` - `const good = !before.pass && after.pass && check`; `bench/run.mjs:180` - `process.exit(ok ? 0 : 1)` | PASS |
| C7 | per-arm Opus consultations: `toolkit` 1 de 2, `sem-advisor` 0 de 2 | same run, `✔ C7` | `test/bench-cota.test.mjs:107` - `assert.match(md, /\*\*toolkit\*\* consultou o Opus em 1 de 2 execuções/)`; `:108` - `/\*\*sem-advisor\*\* consultou o Opus em 0 de 2 execuções/` | PASS |
| C8 | `parseUsage` of the 27/11 text gives session 45, week 34 and both reset texts | same run, `✔ C8` | `test/bench-cota.test.mjs:113` - `assert.equal(u.session.pct, 45)`; `:114` - `assert.equal(u.week.pct, 34)`; `:115`/`:116` - the two `resets` strings | PASS |
| C9 | a session reset during the round makes that window invalid; the week is still computed | same run, `✔ C9` | `test/bench-cota.test.mjs:124` - `/Sessão de 5 horas: 40% → 50%, inválida \(a janela reiniciou durante a rodada\)/`; `:125` - `/Semana ... 30% → 33% \(\+3 pontos\): \*\*US\$ 2,00 por 1%\*\*/` | PASS |
| C10 | US$ 6,00 total (Claude plus plugin) gives `US$ 0,60`/1% session and `US$ 2,00`/1% week | same run, `✔ C10` | `test/bench-cota.test.mjs:130` - `/Custo total da rodada \(Claude e security-guidance\): US\$ 6,00/`; `:131` - `/... \(\+10 pontos\): \*\*US\$ 0,60 por 1%\*\*/`; `:132` - `/\*\*US\$ 2,00 por 1%\*\*/` | PASS |
| C11 | no percentages returns `null`; `--cota` exits 1 before preparing any arm | same run, `✔ C11`; also reproduced by hand: stderr `--cota: o /usage não devolveu as porcentagens ... Nada foi rodado.`, exit 1, no `bench/results/` folder created | `test/bench-cota.test.mjs:136` - `assert.equal(parseUsage('Current session: 45% used'), null)`; `:141` - `assert.equal(r.status, 1, ...)`; `:143` - `assert.doesNotMatch(r.stdout, /Preparando o lado/)` | PASS |

Every named test exists: `rg -n "^test\('C[0-9]+ " test/bench-cota.test.mjs` found C1-C5 and C7-C11 at lines
44, 54, 66, 77, 87, 102, 111, 122, 128 and 135. C6 is the `--dry` command. Every proof resolves to code this diff
added or changed: `bench/medidas.mjs` (new), `bench/run.mjs` (`armEnv`/`armPlugins`, the `sgRows` and `Cota do
Pro` report sections, `readUsage`, `--home-plan`) and the two new `bench/tasks/long-*` folders.

**Precision gaps in the checks** (all PASS as written):

- C1: the unit proof asserts what `--home-plan` prints (`armEnv`/`armPlugins`), not the `settings.json` that
  `makeHome` writes. `makeHome` uses the same `armEnv` (`bench/run.mjs:238-242`), so the gap is small. Only the
  round proof, not run yet, shows the effect in a real HOME.
- C5: see finding 1.
- C6: "sem a solução os testes ocultos falham" holds because `!before.pass` needs only one failing test. With the
  stub in place, 3/11 and 3/14 already pass (see finding 3).

## Gate

- `node --test test/bench-cota.test.mjs`: 10 passed, 0 failed.
- `node bench/run.mjs --dry --tasks long-pedidos,long-folha`: 2 ok, exit 0.
- `npm test` (worktree checked out with LF line endings): 90 tests, 89 passed, 0 failed, 1 skipped (`E2E_REAL`).
  The first run used the machine's `core.autocrlf=true` checkout and failed `docs.test.mjs` F6 and F17 on `\r\n`. That
  is a line-ending artifact of the checkout and does not come from this diff (finding 7).
- `--cota` end to end, with a fake `claude` on PATH (no quota spent): `cota.json` was written with both readings, the
  report gained `## Cota do Pro`, and no `bench-home-*` folder was left in `%TEMP%`.

## Findings

Ranked, most important first. None of them turns a check red.

1. **C5 is weaker than AC 5. The long tasks require changing 1 file, not 3** - `plan.md` AC 5 vs
   `test/bench-cota.test.mjs:97-98`. AC 5 (unchanged in this diff) says the request "exige mudar no mínimo 3" of
   the code files. C5 only checks that the request *names* 3. Each reference solution changes exactly one file:
   `bench/tasks/long-pedidos/solution/src/pedidos.js` and `bench/tasks/long-folha/solution/src/Folha/FolhaService.cs`.
   The other files are read, not changed. This also weakens the S2 premise of a "sessão longa e difícil": two
   single-function tasks of about 30-50 lines may not draw the advisor out any more than the short tasks did. The
   user should decide whether to amend AC 5 to "nomeia/usa ≥3" or to make the tasks require multi-file changes.
2. **long-folha's IRRF test can fail an implementation that is more correct for the domain** -
   `bench/tasks/long-folha/hidden/tests/Folha.Tests/HiddenFolhaTests.cs:63`, `:71`. The IRRF table in
   `repo/src/Folha/TabelaIrrf.cs` is the May-2025 table, which coexists with the *desconto simplificado* (R$ 607,20).
   A payroll specialist applies whichever deduction is larger. For Ana (R$ 3.000, INSS 253,41) the simplified
   discount wins: base 2.392,80, exempt, IRRF 0. The test expects 23,83. A model that knows the 2026 rules (IRRF
   relief up to R$ 5.000) would also diverge. So the "expert would expect it" premise points in two directions.
   Pin it by saying in the request that the simplified discount does not apply, or change Ana's salary to a
   case where legal deductions win. The FGTS rule (`:69-73`) and the INSS-from-base rule for Caio and Davi are
   unambiguous.
3. **long-pedidos: 2 of its 3 implicit-rule tests pass against the unimplemented stub** -
   `bench/tasks/long-pedidos/hidden/hidden.test.js:70`, `:79` (also `:41`). They use bare `assert.throws(...)` with
   no error matcher, so the stub's `throw new Error('... não foi implementado')` satisfies them, which is the "3/11"
   in `--dry`. They only discriminate because a run passes only when *all* hidden tests pass. Through that gate they
   do test the unstated rules: a naive `baixar` loop leaves `CAM-01` at 8 or 1 and fails `:71`/`:80`. Do not read
   the per-test pass counts as "which rule the model missed". The rules really are unstated: the request
   (`task.json`) says nothing about all-or-nothing stock, summing repeated SKUs or capping a fixed coupon at the
   subtotal. The explicit tests could not fail for other reasons that I found. Order of steps, rounding (`percentual`),
   freight (`frete.js`), the free-freight threshold (`>=`) and the message format are all spelled out. `:86` pins
   `desconto: 1990`, so a model that rejects an oversized coupon with an error instead of capping it fails. That is
   defensible, but it is one specific choice.
4. **Report shows `0,000`, not `não medido`, when an SG arm's plugin log is missing** - `bench/run.mjs:371-373`
   with `bench/medidas.mjs:7`. `sgUsage('')` records `sgCost: 0`, so the `sgCost` field exists and the cell prints
   a measured zero. I reproduced it with a fake `claude`: the toolkit row read `0,000`. That makes "the plugin did not
   run or did not write its log" (an env var not honoured, a failed install) look the same as "the plugin cost
   nothing". `sgReviews: 0` is kept in `runs.jsonl` but not shown. The Swept row "dependency failure: log ausente
   vira custo 0" chose this on purpose, but the report label can still mislead. Suggestion: show `não medido` (or
   `0 revisões`) when `sgReviews === 0` in an SG arm. Other labelling is correct. `–` appears only for arms without
   the plugin, and only in the plugin-cost row (`:465`). The with-plugin row always aggregates. `não medido` covers
   a whole cell when *any* run in it lacks `sgCost`, which is conservative and hides measured runs when an old round
   is merged with a new one. Errored runs are excluded through `cell`/`armRuns` (`:420`).
5. **The "consultou o Opus" line now prints for every arm except `padrao`** - `bench/run.mjs:443-447`. The old line
   was toolkit-only and said "(advisor ligado)". Now `config`, `high`, `haiku`, `lean` and the rest also get "consultou
   o Opus em 0 de N". The wording assumes any Opus in `modelUsage` is an advisor consultation, which is true today
   because no arm other than `padrao` runs Opus as its main model. A future Opus-main arm would be mislabelled. No
   consumer parses the old text (`rg "advisor ligado"` finds nothing).
6. **`--cota` safety (c): no leak found** - `bench/run.mjs:529-536`. `readUsage` builds a `padrao` HOME with the
   access token copied by `login()` without the refresh token (`:202-204`), runs `claude -p` with the
   `CLAUDE*`-stripped env (`:184-189`) and removes the HOME in `finally`. I confirmed 0 `bench-home-*` left after both
   the failure path (C11, by hand) and the success path (fake `claude`). Residual risks, both shared with the
   existing homes: (a) `fs.rmSync` throws on a Windows `EBUSY` after 3 retries and leaves that temp HOME (access
   token only) behind; (b) the final `readUsage` runs inside the main `finally` before `report.md` is written
   (`:592-598`), so if it throws (for example, `makeHome` fails) the round writes no report. `runs.jsonl` is still on
   disk and `--report` can rebuild it. The per-run `sg/*.log` files sit in `bench/results/` (gitignored), next to the
   transcripts that already hold the same content.
7. **Existing behaviour (d): nothing broken** - `npm test` 89/0/1. The `makeHome` refactor gives the same plugins
   to every old arm (`armPlugins`, `bench/run.mjs:212-219`), and `haiku` keeps its env through `armEnv`. Two notes.
   Every toolkit-based arm now runs with `SECURITY_GUIDANCE_DEBUG_LOG` set (`:341-344`), so future toolkit rounds are
   not byte-identical in setup to earlier ones. The plan accepts that, and it should only add logging. Separately,
   `test/docs.test.mjs` F6/F17 fail on an `autocrlf=true` checkout because their regexes expect `\n`. That is a
   pre-existing fragility, not caused here.
8. **C11's test portability** - `test/bench-cota.test.mjs:139`. The test hides `claude` by setting PATH to node's
   folder. With nvm on Linux or macOS, a global `claude` lives in that same folder, so the test would call a real
   `claude` with the token `x`. It still exits 1, but over the network. On Windows (`%APPDATA%\npm`) this does not
   happen.

## Distilled lessons

- A check that rewords an AC (from "exige mudar" to "nomeia") turns a green proof into evidence for a weaker claim.
  Compare each check's verb with its AC's verb.
- An implicit-rule hidden test that uses a bare `throws` passes against a stub. Match the error, or rely on the
  all-pass gate on purpose and say so.
