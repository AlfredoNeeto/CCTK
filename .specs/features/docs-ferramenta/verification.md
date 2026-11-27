# Documentação como produto verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 7310090..39f3f09
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

All 19 checks are proven at 39f3f09. The round-2 failure, C11, is fixed: the stale two-column header is gone, so
"Corrigir o rumo" now renders as one 3-column table with a `Fonte` link in every row (`docs/PROMPTS.md:225-229`).
C16 is judged against AC 16 as it now reads (`plan.md:120`). That AC records the grey `muted` as the context colour
and requires it to pass contrast and CVD separation, not the chroma floor. I re-ran the dataviz validator in both
modes and it passes those checks. Round-2 findings 1, 2, 3 and 5 are resolved. Findings 4 and 6 are narrowed to small
precision gaps that do not hide any wrong member today. The experiments chart, `README.md:31`, the bench Resumo
(`bench/README.md:8`) and the alt text (`:105`) agree on 12 changes and 3 in the kit.

Scope: the fix range is `cf12619..39f3f09`. All proofs were re-run in full at 39f3f09. The fix touched `README.md`
(line 31), `bench/README.md`, `docs/PROMPTS.md`, `docs/charts.mjs`, both `experimentos-*.svg`, both test files and
AC 16 / C16. Every check whose claim, test or covered file changed is marked `verified at 39f3f09`, with citations
refreshed. Test line numbers after `test/docs.test.mjs:152` moved down by 3. C7, C8 and C9 cover only
`docs/SITUACOES.md`, `docs/GUIA.md` and `cli.mjs`, which the fix did not touch, so they are marked
`carried from cf12619` (C8's test cites are refreshed for the shift). The real tree was clean before and after the
run: `git status --porcelain` printed nothing, so regenerating the charts left them byte-identical.

## Binding sources

None. The plan marks no source as binding, and step 1 runs only under `ui`. The fix touched no interface.

## Checks

Proofs were re-run at 39f3f09 in one batch: `node --test --test-reporter=tap test/docs.test.mjs
test/docs-conteudo.test.mjs` exited 0 with 38 tests, 38 pass and 0 fail. F7 (`ok 11`) and F11 (`ok 12`) come from
`docs-conteudo.test.mjs`. `C4` is `ok 15` and `C10` is `ok 17`. F1-F6, F8-F10 and F13-F19 are `ok 23` to `ok 38`,
each on its own line. I also ran the C12 sweep, `grep -o 'https://[^) >]*' docs/PROMPTS.md | sort -u | xargs -n1 curl
-fsSL -o /dev/null --max-time 20`. It exited 0, and all 9 unique URLs returned 200, including `#steer-the-session` and
`/checkpointing`. Finally I ran the dataviz validator, `validate_palette.js "#2a78d6,#59636e" --mode light --surface
"#ffffff"` and `"#3987e5,#9198a1" --mode dark --surface "#0d1117"`. Both runs exit 1, and the only failure in each is
the chroma floor on `muted`, which the amended AC 16 exempts.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | "Documentação" before "Comandos", 5 links, each row with text | `^F1 ` ok 23 | verified at 39f3f09 (README.md touched at :31 only, outside the section) - `test/docs.test.mjs:109` `indexOf('## Documentação') < indexOf('## Comandos')`; `:113` `assert.ok(row, link)` | PASS |
| C2 | every `Uso:` flag is in Comandos | `^F2 ` ok 24 | verified at 39f3f09 - `test/docs.test.mjs:124` `assert.ok(s.includes(f), f)` | PASS |
| C3 | FAQ with 5 or more questions, answers of 3 lines or fewer | `^F3 ` ok 25 | verified at 39f3f09 - `test/docs.test.mjs:130` `qs.length - 1 >= 5` | PASS |
| C4 | src/srcset use the raw GitHub prefix, and the file exists | `^F4 ` ok 26 | verified at 39f3f09 - `test/docs.test.mjs:138` `u.startsWith(RAW)`; `:139` `fs.existsSync(...)` | PASS |
| C5 | README is 200 lines or fewer | `^F5 ` ok 27 | verified at 39f3f09 - `test/docs.test.mjs:144` `split('\n').length <= 200` | PASS |
| C6 | 12 or more `###`, each with Quando, a ```text block and Confira | `^F6 ` ok 28 | verified at 39f3f09 (test changed) - `test/docs.test.mjs:149` `items.length >= 12`; `:151` the three literals; new `:154-155` require one ```text block that is not just `cctk …`. I listed every block. All 16 situations have a prompt or a slash command for Claude. The two with a `cctk` block (Azure DevOps, `docs/SITUACOES.md` "Trabalhar a partir de um card") also have a prompt. "A cota" (`:250`) has a prompt at `:260` | PASS |
| C7 | SITUACOES cites the 12 tools | `^F7 ` ok 11 | carried from cf12619 - `test/docs-conteudo.test.mjs:65` `assert.ok(s.includes(t), t)` over the 12 literals; SITUACOES.md not touched | PASS |
| C8 | every `cctk <sub>` has `cmd === '<sub>'`; every `/cctk:<nome>` has a skill folder | `^F8 ` ok 29 | carried from cf12619 (cites refreshed) - `test/docs.test.mjs:164` `cli.includes(`cmd === '${c}'`)`; `:165` skill folder exists | PASS |
| C9 | GUIA index and README map link SITUACOES; C4 anchors kept | `^F9 ` ok 30, `^C4 ` ok 15 | carried from cf12619 (cites refreshed) - `test/docs.test.mjs:169-170` `/\]\(SITUACOES\.md/`, `/\]\(docs\/SITUACOES\.md/`; `:23` `ids.includes(a)` | PASS |
| C10 | "Modelos por situação" has 6 or more ```text blocks and cites the 6 kinds | `^F10 ` ok 31 | verified at 39f3f09 (PROMPTS.md touched, though not this section) - `test/docs.test.mjs:175` `count(s, /```text/g) >= 6`; `:176` the 6 kinds | PASS |
| C11 | the Esc, /rewind and /clear rows each carry a `https://code.claude.com/` link | `^F11 ` ok 12 | verified at 39f3f09 (file and test changed) - `docs/PROMPTS.md:225` is the only header (Quando, Faça, Fonte: 3 cells); `:226` is the only delimiter row (3 cells); rows `:227-229` each have exactly 3 cells (counted per line), with the link in the third: Esc → `#steer-the-session`, `/rewind` → `/checkpointing`, `/clear` → `#steer-the-session`. Test `test/docs-conteudo.test.mjs:71` asserts 3 header cells, `:72` asserts one delimiter row, `:75-77` asserts a link per row. On the round-2 text, `:71` gives 2 cells, so the check would fail (by inspection) | PASS |
| C12 | every https link in PROMPTS is Anthropic and answers 2xx | `^C10 ` ok 17, curl sweep exit 0 | verified at 39f3f09 - `test/docs.test.mjs:49` `assert.ok(ok.has(h), h)` against the host set at `:46`; curl `-f` returned 200 for all 9 URLs | PASS |
| C13 | one bar per experiment, colour `kit`/`muted` from the in/out flag, % labels ascending, each label ends in `, por acerto`/`, por execução` | `^F13 ` ok 32 | verified at 39f3f09 (charts.mjs and SVGs changed) - `test/docs.test.mjs:187` `bars.length === EXPERIMENTS.length`; `:188` `notEqual(t.kit, t.muted)`; `:191` `deepEqual(bars, sorted.map(e => e[4] ? t.kit : t.muted))`; `:194` sorted; `:197` metric suffix. `experimentos-light.svg` has 12 `rect class="b"`: 3 `#2a78d6` and 9 `#59636e`. EXPERIMENTS has 12 entries, 3 of them in the kit (effort high, Advisor, Dimensões*), and the 9 out run from +2% to +527% | PASS |
| C14 | each experiment's numbers are in bench/README (% matches the pair); each version's `US$ N,NN` and `ok/runs` are there | `^F14 ` ok 33 | verified at 39f3f09 (test changed) - `test/docs.test.mjs:205-206` now require cost and `ok/runs` on the same line; `:209` evidence present; `:212` `pct === Math.round((arm / base - 1) * 100)`. Pairs: 1.4.0 at `bench/README.md:84` (47/48, US$ 5,21), 1.1.1 at `:94` (48/48, US$ 4,03), 1.1.0 and 1.0.2 at `:101` (46/48, US$ 3,98; 46/48, US$ 4,80) | PASS |
| C15 | 4 circles, the 4 version labels, the 4 point labels `US$ … · ok/48`, subtitle `mesmas 24 tarefas` | `^F15 ` ok 34 | verified at 39f3f09 (charts.mjs touched; VERSIONS unchanged at `docs/charts.mjs:45-50`) - `test/docs.test.mjs:220` 4 circles; `:221` versions; `:222` the 4 cost·ok labels; `:223` subtitle | PASS |
| C16 | `role="img"`, aria-label cites `custo`; every colour is in THEMES; bars use only `kit`/`muted`; the `kit`/`muted` pair passes contrast and CVD in both modes | `^F16 ` ok 35, `^F13 ` ok 32, dataviz validator run by the verifier | verified at 39f3f09 (claim and AC 16 changed) - `test/docs.test.mjs:233` `role="img"`; `:234` aria-label `includes('custo')`; `:235` every `fill`/`stroke` hex is in `THEMES[mode]`; the bars-only-kit/muted part is F13 `:191`. Validator, light: contrast PASS (both ≥ 3:1), CVD PASS (ΔE 16.2 deutan), normal-vision PASS (16.2). Dark: contrast PASS, CVD PASS (ΔE 13.6 protan), normal-vision PASS (15.6). Chroma floor fails on `#59636e` (C 0.022) and `#9198a1` (C 0.016), which `plan.md:120` exempts by name. Identity does not rest on colour alone: there is a legend and a per-bar `<title>` (`experimentos-light.svg:7,30`) | PASS |
| C17 | `## Resumo` right under the title, 8 lines or fewer; `<picture>` dark/light for both charts | `^F17 ` ok 36 | verified at 39f3f09 (Resumo touched) - `test/docs.test.mjs:242` `/^# [^\n]+\n+## Resumo\n/`; `:244` `<= 8` (6 bullets at `bench/README.md:5-10`); `:245` the `<picture>` regex | PASS |
| C18 | every relative link and src/srcset resolves | `^F18 ` ok 37 | verified at 39f3f09 - `test/docs.test.mjs:253` `fs.existsSync(path.join(REPO_ROOT, path.dirname(f), link))` | PASS |
| C19 | every `file.md#anchor` and `#anchor` resolves | `^F19 ` ok 38 | verified at 39f3f09 - `test/docs.test.mjs:264` `headings(read(target)).includes(decodeURIComponent(anchor))` | PASS |

## Findings

No check fails. What remains are minor gaps, listed from the most to the least serious. None of them hides a wrong
member at 39f3f09.

1. **C16's automated proof covers only part of its claim.** `checks.md:70-71` names only F16 as the proof. F16 does
   not run the dataviz validator, so a later change to `muted` that broke contrast or CVD would stay green. I ran the
   validator by hand this round, and the pair passes. A test that calls the validator's contrast and CVD checks on
   `THEMES.{light,dark}.{kit,muted}` would close this.
2. **F11 sizes only the header.** `test/docs-conteudo.test.mjs:71` checks that the header has 3 cells but does not
   check that each row has the same count. A row with a stray 4th cell would still render it as dropped. I counted
   by hand: rows `docs/PROMPTS.md:227-229` each have 3 cells.
3. **F14's same-line rule cannot tell apart the two rounds on `bench/README.md:101`.** 1.0.2 and 1.1.0 share that
   line and both are 46/48, so the pairing is factually right today (`:101`, "1.1.0, 46/48 por US$ 3,98; 1.0.2,
   46/48 por US$ 4,80").
4. **F6 excludes only `cctk` commands.** `test/docs.test.mjs:155` would still accept a block that is a different
   shell command (`git …`, `npm …`) as the prompt. No such member exists today.

### Round-2 findings

| # | Round-2 finding | Status at 39f3f09 | Evidence |
| --- | --- | --- | --- |
| 1 | C11 table regression: duplicate 2-column header dropped `Fonte` | resolved | `docs/PROMPTS.md:225-226` is the single 3-cell header and the single delimiter; F11 hardened at `test/docs-conteudo.test.mjs:71-72` (residual: finding 2) |
| 2 | C16 grey `muted` vs AC 16 "já validadas" | resolved | AC 16 reworded at `plan.md:120` to name `muted` as the context grey, held to contrast and CVD; C16 at `checks.md:70` matches; validator re-run passes both modes (residual: finding 1) |
| 3 | TDD correct-run counts reversed | resolved | `bench/README.md:161` now reads "18/20 contra 17/20", config first; the report's Total table (`bench/results/2026-11-19T11-19-15-070Z/report.md:85`, columns config/high/toolkit/tdd at `:76`) gives config 18/20 and tdd 17/20 |
| 4 | C14 version cost and ok/runs not checked together | resolved (narrowed) | `test/docs.test.mjs:205-206` require both on one line; residual at `bench/README.md:101` (finding 3) |
| 5 | kit-vs-factory row counted as "entrou no kit" | resolved | row removed from `docs/charts.mjs` EXPERIMENTS (12 entries, 3 in kit); the result keeps its own `custo-*` chart (`bench/README.md:69-70`). Counts agree: SVG aria-label "12 mudanças … 3 entraram" (`docs/img/experimentos-light.svg:1`, dark the same), `README.md:31` "Das 12 mudanças testadas no placar, 3 entraram", `bench/README.md:8` "Das 12 mudanças testadas no gráfico, 3 entraram no kit", alt `:105` "12 mudanças … os outros 9". The prose "Sonnet no lugar do Opus" (`:113`) is a decision outside the chart, covered by the note at `:109-110` |
| 6 | C6 accepted any ```text block as the prompt | resolved (narrowed) | `test/docs.test.mjs:154-155` require a non-`cctk` block; all 16 situations comply (residual: finding 4) |

## Swept existing

Carried from cf12619. No `Swept` row resolves to existing code. Idempotency (C13) holds at 39f3f09: the test run
regenerated the SVGs and `git status --porcelain` stayed empty.

## Coverage

Not recomputed: the profile is light.

## Faults injected

None: under light there is no fault injection.

## Gate

At 39f3f09, `node --test test/docs.test.mjs test/docs-conteudo.test.mjs` gave 38 passed and 0 failed. The C12 curl
sweep got 200 from 9 of 9 URLs and exited 0. The dataviz validator passed contrast and CVD on `kit`/`muted` in both
modes; its only failure is the chroma floor, which AC 16 exempts.
