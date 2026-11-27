# Documentação como produto verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: 7310090..cf12619
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

18 of 19 checks are proven at cf12619. C8 and C13, the two round-1 failures, are fixed. Their assertions now
reach what the claims say. One new failure, C11, came in with the fix itself. The fix gave the "Corrigir o rumo"
table a third column, `Fonte`, but left the old two-column header in place (`docs/PROMPTS.md:225-228`). GFM takes
the column count from the first header row and drops any extra cells, so GitHub renders the three per-action
links as nothing. On top of that, the stale `| Quando | Faça | Fonte |` and `|---|---|---|` lines show up as two
junk data rows. Round 1 at least had a visible "Fonte" line. Now the section shows no source at all, yet F11 still
passes because it reads the raw text. The fix is to delete lines 225-226.

Scope: the fix range is `e601b0d..cf12619`. All proofs were re-run in full at cf12619. Every check whose claim,
test or covered file changed in the fix diff is marked `verified at cf12619`, with citations refreshed. The others
are marked `carried from e601b0d`. The real tree was clean before and after the run (`git status --porcelain`
showed nothing), and regenerating the charts left it byte-identical.

## Binding sources

None. The plan marks no source as binding, and step 1 runs only under `ui`. The fix touched no interface.

## Checks

Proofs were re-run at cf12619 in one batch: `node --test --test-reporter=tap test/docs.test.mjs
test/docs-conteudo.test.mjs` exited 0 with 38 tests, 38 pass, 0 fail. F7 (`ok 11`) and F11 (`ok 12`) come from
`docs-conteudo.test.mjs`. `C4` is `ok 15`, `C10` is `ok 17`, and F1-F6, F8-F10 and F13-F19 are `ok 23` to
`ok 38`, one per line. I also ran the C12 sweep, `grep -o 'https://[^) >]*' docs/PROMPTS.md | sort -u | xargs
-n1 curl -fsSL -o /dev/null --max-time 20`. It exited 0, and all 9 unique URLs returned 200. The set is the same
as in round 1, and `#steer-the-session` and `checkpointing` are both in it.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | "Documentação" before "Comandos", 5 links, each row with text | `^F1 ` ok 23 | carried from e601b0d - `test/docs.test.mjs:109` `r.indexOf('## Documentação') < r.indexOf('## Comandos')`; `:113-114` `assert.ok(row, link)` and row-minus-link `.length > 10`. The README.md fix edits only line 31, which is outside this section | PASS |
| C2 | every `Uso:` flag is in Comandos | `^F2 ` ok 24 | carried from e601b0d - `test/docs.test.mjs:120-124` `assert.ok(s.includes(f), f)` over the flags of `/'Uso: ([^']+)'/` | PASS |
| C3 | FAQ with 5 or more questions, answers of 3 lines or fewer | `^F3 ` ok 25 | carried from e601b0d - `test/docs.test.mjs:130` `qs.length - 1 >= 5`; `:131` `<= 3` | PASS |
| C4 | src/srcset use the raw GitHub prefix, and the file exists | `^F4 ` ok 26 | carried from e601b0d - `test/docs.test.mjs:138` `u.startsWith(RAW)`; `:139` `fs.existsSync(...)` | PASS |
| C5 | README is 200 lines or fewer | `^F5 ` ok 27 | carried from e601b0d - `test/docs.test.mjs:144` `split('\n').length <= 200` | PASS |
| C6 | 12 or more `###`, each with Quando, a ```text block and Confira | `^F6 ` ok 28 | verified at cf12619 - `test/docs.test.mjs:149` `items.length >= 12`; `:152` `it.includes(t)` for `Quando`, `` ```text ``, `Confira`. "A cota está acabando" (`docs/SITUACOES.md:250-266`) now carries a real prompt in its ```text block (`:260-263`) | PASS |
| C7 | SITUACOES cites the 12 tools | `^F7 ` ok 11 | verified at cf12619 - `test/docs-conteudo.test.mjs:65` `assert.ok(s.includes(t), t)` over the 12 literals. `cctk stats` is still cited, now inline at `docs/SITUACOES.md:254` | PASS |
| C8 | every `cctk <sub>` has `cmd === '<sub>'`; every `/cctk:<nome>` has a skill folder | `^F8 ` ok 29 | verified at cf12619 - `test/docs.test.mjs:158` `` /\bcctk ([a-z]+)/g `` now collects all 4 cited subcommands: `ado` (`SITUACOES.md:197`, inside the code block), `secret`, `stats` (`:254`) and `trust`. `:161` `assert.ok(cli.includes(`cmd === '${c}'`))` matches them at `cli.mjs:210,211,214,215`; skills at `:162` | PASS |
| C9 | GUIA index and README map link SITUACOES; C4 anchors kept | `^F9 ` ok 30, `^C4 ` ok 15 | carried from e601b0d - `test/docs.test.mjs:166-167` `assert.match(section(...), /\]\(SITUACOES\.md/)` and `/\]\(docs\/SITUACOES\.md/`; `:23` `assert.ok(ids.includes(a), a)` | PASS |
| C10 | "Modelos por situação" has 6 or more ```text blocks and cites the 6 kinds | `^F10 ` ok 31 | verified at cf12619 (PROMPTS.md was touched, but not this section) - `test/docs.test.mjs:172` `count(s, /```text/g) >= 6`; `:173` `s.toLowerCase().includes(t)` | PASS |
| C11 | the Esc, /rewind and /clear rows each carry a `https://code.claude.com/` link | `^F11 ` ok 12 | verified at cf12619 - `test/docs-conteudo.test.mjs:71-73` `rows.find((r) => r.includes(t))` then `row.includes('](https://code.claude.com/')`. The source text has the links, but `docs/PROMPTS.md:225-226` still declares a two-column table (`\| Quando \| Faça \|` / `\|---\|---\|`). The three-column header the fix added (`:227-228`) is therefore a data row, and the `Fonte` cells at `:229-231` lie beyond the declared columns, which GFM drops. In the rendered doc no action has a link. The test reads raw lines and cannot see this | FAIL |
| C12 | every https link in PROMPTS is Anthropic and answers 2xx | `^C10 ` ok 17, curl sweep exit 0 | verified at cf12619 - `test/docs.test.mjs:49` `assert.ok(ok.has(h), h)` against the host set at `:46`; curl `-f` gave 200 on all 9 URLs | PASS |
| C13 | one bar per experiment, colour `kit`/`muted` from the in/out flag, % labels ascending, each label ends in `, por acerto`/`, por execução` | `^F13 ` ok 32 | verified at cf12619 - `test/docs.test.mjs:184` `bars.length === EXPERIMENTS.length`; `:185` `notEqual(t.kit, t.muted)`; `:188` `deepEqual(bars, sorted.map((e) => (e[4] ? t.kit : t.muted)))`; `:191` `deepEqual(pct, sorted)`; `:194` `assert.match(l, /, por (acerto\|execução)$/)` | PASS |
| C14 | each experiment's numbers are in bench/README (and the % matches the pair); each version's `US$ N,NN` and `ok/runs` are there | `^F14 ` ok 33 | verified at cf12619 - `test/docs.test.mjs:202` `b.includes(`US$ ${total...}`)`; `:203` `b.includes(`${ok}/${runs}`)`; `:206` `b.includes(e)`; `:209` `pct === Math.round((arm / base - 1) * 100)`. Recomputed by hand (see Findings): 1,707/0,813, 0,444/0,701 and 5,21 47/48 all hold | PASS |
| C15 | 4 circles, the 4 version labels, the 4 point labels `US$ … · ok/48`, subtitle `mesmas 24 tarefas` | `^F15 ` ok 34 | verified at cf12619 - `test/docs.test.mjs:218` `count(s, /<circle /g) === 4`; `:219` `` s.includes(`>${t}</text>`) `` for the versions; `:220` the same for `US$ 0,10 · 46/48`, `US$ 0,08 · 46/48`, `US$ 0,08 · 48/48`, `US$ 0,11 · 47/48`; `:221` `s.includes('mesmas 24 tarefas')` | PASS |
| C16 | `role="img"`, aria-label cites `custo`, series colours are in THEMES | `^F16 ` ok 35 | verified at cf12619 - `test/docs.test.mjs:231` `assert.match(s, /role="img"/)`; `:232` aria-label `.includes('custo')`; `:233` every `fill`/`stroke` hex is in `Object.values(THEMES[mode])`. The check holds as written. AC 16 does not fully hold; see finding 2 | PASS |
| C17 | `## Resumo` right under the title, 8 lines or fewer; `<picture>` dark/light for both charts | `^F17 ` ok 36 | verified at cf12619 - `test/docs.test.mjs:240` `assert.match(b, /^# [^\n]+\n+## Resumo\n/)`; `:241` `<= 8` (6 non-empty lines at `bench/README.md:5-10`); `:242` the `<picture>` regex | PASS |
| C18 | every relative link and src/srcset resolves | `^F18 ` ok 37 | verified at cf12619 (the docs files were touched) - `test/docs.test.mjs:250` `` fs.existsSync(path.join(REPO_ROOT, path.dirname(f), link)) `` | PASS |
| C19 | every `file.md#anchor` and `#anchor` resolves | `^F19 ` ok 38 | verified at cf12619 - `test/docs.test.mjs:261` `headings(read(target)).includes(decodeURIComponent(anchor))` | PASS |

## Findings

Ranked from the most to the least serious.

1. **C11 FAIL, a regression from the fix.** At `docs/PROMPTS.md:225-228` the old header (`| Quando | Faça |`,
   `|---|---|`) sits above the new one (`| Quando | Faça | Fonte |`, `|---|---|---|`). GitHub renders a
   2-column table with two junk rows and silently drops every `Fonte` cell, so AC 11 ("um link para a doc do Claude
   Code em cada ação") is not met for a reader. In round 1 the section at least had a visible "Fonte:" line. F11
   (`test/docs-conteudo.test.mjs:69`) drops separator lines and only the first table line, so it passes on a broken
   table. Fix: delete `:225-226`. To harden the test, also assert that the first `|` line of the section has 3
   cells.
2. **C16 against AC 16: as written, the AC is not met.** AC 16 says the colours SHALL be "as já validadas em
   `THEMES`". I re-ran the dataviz validator. `#2a78d6,#59636e` (light) and `#3987e5,#9198a1` (dark, surface
   `#0d1117`) pass the lightness band, CVD separation (ΔE 16.2 / 13.6), the normal-vision floor and contrast. Both
   fail the chroma floor (`muted` C = 0.022 / 0.016), so `muted` is in THEMES but is not a validated series colour,
   and `docs/charts.mjs:53-54` says as much. The choice itself is sound: the dataviz guidance endorses "highlight one,
   gray the rest" (anti-patterns, Form), and identity is not carried by colour alone, because there is a legend at
   `charts.mjs:146-147` and a `<title>` on every bar at `:157`. Still, as the AC is worded, it is not satisfied. The
   user should either amend AC 16 to name `muted` as the emphasis grey, validated for contrast and CVD only, or
   change the colour. The precision gap from round 1 also remains: F16 (`test/docs.test.mjs:233`) accepts any THEMES
   value, `bg` and `grid` included. This is not counted as a FAIL of C16, because C16's own claim is proven.
3. **Factual, minor, introduced by the fix: the TDD correct-run counts read backwards.** `bench/README.md:160-161`
   says "US$ 0,444 do `config` contra 0,701; 17/20 contra 18/20 corretas". The report's Total table
   (`bench/results/2026-11-19T11-19-15-070Z/report.md:85`) gives config 18/20 and tdd 17/20. In a parenthesis that
   reads config-first, that says tdd got more right, which contradicts "sem acertar mais". Fix: write "18/20 contra
   17/20".
4. **Precision gap, minor: C14's version clause.** `test/docs.test.mjs:202-203` checks that `US$ 5,21` and `47/48`
   each appear somewhere in the file, not that they appear together. `46/48` would match either 1.0.2 or 1.1.0. I
   checked by hand that each pair sits together: `bench/README.md:84` (47/48, US$ 5,21), `:94` (48/48, US$ 4,03),
   `:101` (46/48, US$ 3,98; 46/48, US$ 4,80).
5. **Wording, minor.** The chart row "Kit no lugar do de fábrica (Opus)" (`docs/charts.mjs:28`) is the whole kit,
   yet it is counted among the "4 entraram no kit" (`bench/README.md:8`, `README.md:31`), so the kit is counted as
   having entered itself. Meanwhile the prose list it sits beside still says "Sonnet no lugar do Opus"
   (`bench/README.md:113`). The numbers are right; the framing is slightly circular.
6. **Precision gap carried, minor: C6.** F6 still accepts any ```text block as "o prompt pronto". The one member
   that violated this in round 1 is fixed (`docs/SITUACOES.md:260-263`).

### Round-1 findings

| # | Round-1 finding | Status at cf12619 | Evidence |
| --- | --- | --- | --- |
| 1 | C8 missed `cctk` inside code blocks | resolved | `test/docs.test.mjs:158` `\bcctk`; it collects ado, secret, stats, trust; `cli.mjs:210-215` |
| 2 | C13 did not bind colour to the in/out flag | resolved | `test/docs.test.mjs:188` `deepEqual(bars, sorted.map(e => e[4] ? t.kit : t.muted))` |
| 3 | C11 one link vs AC's link per action | not resolved | check and test now ask per row (`docs-conteudo.test.mjs:70-74`), but the table is broken and renders no link (finding 1) |
| 4 | C15 did not assert costs or "24" | resolved | `test/docs.test.mjs:220-221` asserts the 4 cost·ok labels and `mesmas 24 tarefas`; versions are now in F14 `:201-204`. AC 15 was changed at the user's request to the same 24 tasks. Recomputed from `2026-11-20T14-22-01-864Z/runs.jsonl` without `security-commit-secret`: 48 runs, 24 tasks, 47 correct (the only failure is `spec-idade`, future birth date), US$ 5,209 → 5,21, US$ 0,1085 → 0,11 per run. 5,21/4,03 → +29%, matching `bench/README.md:87`. 46/48 = 96% … 48/48 = 100% and 0,08-0,11 match the Resumo (`:6`) and the chart title |
| 5 | "13 experimentos decididos, 4 entraram" | resolved | "13 mudanças testadas" at `README.md:31`, `bench/README.md:8` and the aria-label/alt (`:105`); decisions with no cost number are named at `:109-110`; AC 13 amended to match. A small framing point remains (finding 5) |
| 6 | "Sonnet no lugar do Opus, −52% por tarefa" | resolved | `docs/charts.mjs:28` is now "Kit no lugar do de fábrica (Opus)", `por execução`, pair `1,707`/`0,813`, matching `bench/README.md:73-74`. TASKS (`charts.mjs:10-19`) sums to 1,707 / 0,813, giving −52.4%; F14 `:209` now checks the arithmetic |
| 7 | TDD label "por execução" unsupported | resolved | pair 0,444 → 0,701 matches the report.md Total table (`:78`) and my recompute of the sum of medians (config 0,4440, tdd 0,7011), so +58%. The new counts read backwards (finding 3) |
| 8 | Explore +49% vs table +48% | resolved | from `2026-11-27T14-45-03-319Z/runs.jsonl`: explore 2,2137/12, toolkit 1,4835/12, both 12/12, so 0,1845/0,1236 = +49.3% per run and per correct run. The rounding is explained at `docs/charts.mjs:36` |
| 9 | "custaram mais sem acertar mais" | resolved | "sem um ganho de acerto que se sustentasse" at `bench/README.md:8-9` and in the experimentos aria-label |
| 10 | C6 "A cota" ```text was a shell command | resolved for the member; gap carried | `docs/SITUACOES.md:260-263` is now a prompt; `cctk stats` is inline at `:254` (finding 6) |
| 11 | C16 `muted` not validated; F16 accepts any THEMES value | not resolved (now documented) | `docs/charts.mjs:53-54`; validator re-run reproduces the chroma-floor failure (finding 2) |
| 12 | C17 checked only "before Lados" | resolved | `test/docs.test.mjs:240` `/^# [^\n]+\n+## Resumo\n/`; `bench/README.md:1-3` |

## Swept existing

Carried from e601b0d. No `Swept` row resolves to existing code. Idempotency (C13) holds again at cf12619: the
test run regenerated the SVGs and `git status --porcelain` stayed empty.

## Coverage

Not recomputed: the profile is light.

## Faults injected

None: under light there is no fault injection.

## Gate

`node --test test/docs.test.mjs test/docs-conteudo.test.mjs` at cf12619 - 38 passed, 0 failed. C12 curl sweep - 9
of 9 URLs answered 200, exit 0.
