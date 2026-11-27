# Documentação como produto verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: 7310090..e601b0d
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

17 of 19 checks are proven, each with a located assertion. Every named proof exists, ran at HEAD and passed on
its own line. C8 and C13 fail step 3. Their tests are green, but the assertion skips part of what the check
claims. For C8, the test never sees two of the four `cctk <sub>` commands cited in `docs/SITUACOES.md`. For C13,
the test never ties a bar's colour to whether that experiment entered the kit. I inspected both by hand and they
hold at HEAD (see Findings). But reading the file myself is not a proof, and either test would still pass if the
implementation were wrong. Both fixes are one line.

HEAD is e601b0d. The coordinator only reworded the commit message of 1e83a5f, and `git diff 1e83a5f e601b0d` is
empty, so everything I ran at 1e83a5f holds for e601b0d. The real tree was clean before and after every run
(`git status --porcelain` showed nothing). The tests run `node docs/charts.mjs` again and the output is
byte-identical.

## Binding sources

None. The plan marks no source as binding (Diátaxis and the npm blog are context), and step 1 runs only under `ui`.

## Checks

Proofs run at HEAD in one batch: `node --test --test-reporter=tap test/docs.test.mjs test/docs-conteudo.test.mjs`
exited 0 with 38 tests, 38 pass. Each of F1-F19 (F7 and F11 come from `docs-conteudo.test.mjs`), `C4` and `C10`
is listed on its own `ok` line. The C12 sweep `grep -o 'https://[^) >]*' docs/PROMPTS.md | sort -u | xargs -n1
curl -fsSL -o /dev/null --max-time 20` exited 0, and all 9 unique URLs returned 200. I also downloaded
`code.claude.com/docs/en/best-practices` and found the five `#fragment` ids that PROMPTS.md links to, including
the new `#steer-the-session`. Its text supports the "two corrections, then `/clear`" advice. All F-tests come
from this diff (`test/docs.test.mjs:101-258`, `test/docs-conteudo.test.mjs:61-71`).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | "Documentação" comes before "Comandos" and has 5 links, each in a row with text | `^F1 ` ok 23 | `test/docs.test.mjs:109` - `r.indexOf('## Documentação') < r.indexOf('## Comandos')`; `:113-114` - `assert.ok(row, link)` and the row minus the link `.length > 10` | PASS |
| C2 | every flag on the `Uso:` line appears under Comandos | `^F2 ` ok 24 | `test/docs.test.mjs:120-124` - flags come from `/'Uso: ([^']+)'/` in cli.mjs, then `assert.ok(s.includes(f), f)` | PASS |
| C3 | FAQ has 5 or more questions, each answer 3 lines or fewer | `^F3 ` ok 25 | `test/docs.test.mjs:130` - `qs.length - 1 >= 5`; `:131` - non-empty lines of the answer `<= 3` | PASS |
| C4 | every src/srcset starts with the raw GitHub prefix and the file exists | `^F4 ` ok 26 | `test/docs.test.mjs:138` - `u.startsWith(RAW)`; `:139` - `fs.existsSync(... u.slice(RAW.length))` | PASS |
| C5 | README is 200 lines or fewer | `^F5 ` ok 27 | `test/docs.test.mjs:144` - `README().split('\n').length <= 200` | PASS |
| C6 | 12 or more `###`, each with Quando, a ```text block and Confira | `^F6 ` ok 28 | `test/docs.test.mjs:149` - `items.length >= 12`; `:152` - `it.includes(t)` for `Quando`, `` ```text ``, `Confira` | PASS |
| C7 | SITUACOES cites the 12 tools | `^F7 ` ok 11 | `test/docs-conteudo.test.mjs:65` - `assert.ok(s.includes(t), t)` over the 12 literals | PASS |
| C8 | every `cctk <sub>` cited has `cmd === '<sub>'`; every `/cctk:<nome>` has a skill folder | `^F8 ` ok 29 | `test/docs.test.mjs:158` - `` /`cctk ([a-z]+)/g `` collects only `secret` and `trust`, because `cctk ado` (`docs/SITUACOES.md:197`) and `cctk stats` (`:257`) sit in code blocks with no backtick in front; `:161` therefore asserts 2 of the 4 subcommands cited. Skills `:162` cover all 5 | FAIL |
| C9 | GUIA index and README map link SITUACOES; the C4 anchors still exist | `^F9 ` ok 30, `^C4 ` ok 15 | `test/docs.test.mjs:166` - `` match(section(GUIA(), 'o-que-você-quer-fazer'), /\]\(SITUACOES\.md/) ``; `:167` the same for README; `:23` - `assert.ok(ids.includes(a), a)` over the 4 anchors | PASS |
| C10 | "Modelos por situação" has 6 or more ```text blocks and cites the 6 kinds | `^F10 ` ok 31 | `test/docs.test.mjs:172` - `count(s, /```text/g) >= 6`; `:173` - `s.toLowerCase().includes(t)` for the 6 stems | PASS |
| C11 | "Corrigir o rumo" cites Esc, /rewind, /clear and has a code.claude.com link | `^F11 ` ok 12 | `test/docs-conteudo.test.mjs:70` - `s.includes(t)` for `Esc`, `/rewind`, `/clear`, `](https://code.claude.com/` | PASS |
| C12 | every https link in PROMPTS is Anthropic and answers 2xx | `^C10 ` ok 17, curl sweep exit 0 | `test/docs.test.mjs:49` - `assert.ok(ok.has(h), h)` against the Anthropic host set at `:46`; curl `-f` gave 200 on all 9 URLs | PASS |
| C13 | one bar per experiment, in/out in two colours, % labels ascending, metric on every label | `^F13 ` ok 32 | `test/docs.test.mjs:184` - `bars.length === EXPERIMENTS.length`; `:189` - `deepEqual(pct, sorted)`; `:192` - `match(l, /por (acerto\|execução\|tarefa)/)`. The colour clause is checked only by `:185` `new Set(bars).size === 2` and `:186` `bars.includes(t.kit)`. Nothing compares a bar's fill with its experiment's `kit` flag, so a mixed mapping would pass | FAIL |
| C14 | every experiment's numbers are written in bench/README.md | `^F14 ` ok 33 | `test/docs.test.mjs:200` - `b.includes(e)` for each evidence string; `:203` - `pct === Math.round((arm / base - 1) * 100)` when a US$ pair is given | PASS |
| C15 | 4 circles, versions 1.0.2/1.1.0/1.1.1/1.4.0, 46/48, 48/48, 49/50, "25 tarefas" | `^F15 ` ok 34 | `test/docs.test.mjs:212` - `count(s, /<circle /g) === 4`; `:213` - `` s.includes(`>${t}</text>`) ``; `:214` the three ratios; `:215` - `s.includes('25 tarefas')` | PASS |
| C16 | role="img", aria-label cites `custo`, colours come from THEMES | `^F16 ` ok 35 | `test/docs.test.mjs:225` - `match(s, /role="img"/)`; `:226` - aria-label `.includes('custo')`; `:227` - every `fill`/`stroke` hex is in `Object.values(THEMES[mode])` | PASS |
| C17 | `## Resumo` comes before `## Lados` with 8 lines or fewer; a `<picture>` dark/light for each new chart | `^F17 ` ok 36 | `test/docs.test.mjs:234` - Resumo index `<` Lados index; `:235` - non-empty lines `<= 8`; `:236` - `<picture>…${n}-dark.svg…${n}-light.svg…</picture>` | PASS |
| C18 | every relative link and src/srcset in README, bench/README and docs/*.md resolves to a file | `^F18 ` ok 37 | `test/docs.test.mjs:244` - `` fs.existsSync(path.join(REPO_ROOT, path.dirname(f), link)) `` with the message `` `${f} -> ${link}` `` | PASS |
| C19 | every `file.md#anchor` and `#anchor` resolves to a heading | `^F19 ` ok 38 | `test/docs.test.mjs:255` - `headings(read(target)).includes(decodeURIComponent(anchor))` | PASS |

## Findings

Ranked from the most to the least serious.

1. **C8 does not prove its claim (FAIL).** The regex at `test/docs.test.mjs:158` needs a backtick right before
   `cctk`. The two citations inside ```text blocks are missed: `cctk ado add …` (`docs/SITUACOES.md:197`) and
   `cctk stats` (`:257`). C7 lists both commands, so the gap covers members the artifact itself names. Both
   exist today (`cli.mjs:210` `cmd === 'ado'`, `cli.mjs:214` `cmd === 'stats'`), but a typo in either one would
   pass. Suggested fix: `/\bcctk ([a-z]+)/g`.
2. **C13 does not prove its colour clause (FAIL).** `:185-186` show only that two colours exist and that one of
   them is `t.kit`. I checked the generated `docs/img/experimentos-light.svg` by hand: the four blue (`#2a78d6`)
   bars are exactly the four `kit: true` rows (Sonnet, /effort high, Advisor, Dimensões*), and the other nine
   are `muted`. The test does not enforce this. Suggested fix: read the `<title>` of each bar and compare its
   fill with `EXPERIMENTS[i][4] ? t.kit : t.muted`.
3. **Precision gap, C11 against AC 11.** AC 11 asks for a Claude Code doc link on *each* of the three actions.
   C11 asks for one link, and the section (`docs/PROMPTS.md`, "Corrigir o rumo") has a single "Fonte" line with
   two links (best-practices#steer-the-session and checkpointing) covering all three. The check passes, but it
   is weaker than the AC. Either the AC should be relaxed or there should be a link per row.
4. **Precision gap, C15 against AC 15.** AC 15 requires labels for "custo por execução" and a subtitle saying
   that the others have "24" tasks. F15 does not assert the cost labels or "24". The SVG contains both (`US$ 0,10
   · 46/48` …; "as outras, 24"). VERSIONS costs are not covered by F14 either. By hand, all four (4,80/46/48,
   3,98/46/48, 4,03/48/48, 5,33/49/50) match `bench/README.md:79`, `:90` and `:97`.
5. **Factual: "13 experimentos decididos, 4 entraram"** (`README.md:31`, `bench/README.md:23`,
   `docs/charts.mjs:28-40`). The 13 are chart rows, not decisions. Several rows are arms of one experiment:
   `busca` and Explore come from the same round (`bench/README.md:137-153`), the implicit rules appear twice
   (CLAUDE.md and skill, `:156-159`), and Dimensões appears twice (`:190-191`). Meanwhile, decided items with no
   cost number are left off the chart: `permissions.deny` entered the kit (`:110`), and secret-guard,
   claude-token-efficient, Haiku subagents and the plugin-quality test stayed out. So "4 entraram" undercounts
   what the bench lists as in the kit. The plan says 12, which shows the count drifted during the build.
   Suggested wording: "dos 13 experimentos com custo medido".
6. **Factual: "Sonnet no lugar do Opus, −52% por tarefa"** (`docs/charts.mjs:28`). The −52% is the sum of
   TASKS medians, `padrao` against `toolkit` (whole kit against factory Opus, `bench/README.md:70`). It is not a
   Sonnet-only swap. The arithmetic checks out: 0,813/1,707 = −52.4%. The bench's own Sonnet line says only
   "cerca de metade" (`:108`). "por tarefa" is also a third metric that AC 13 ("por execução ou por acerto") does
   not list. C13 quietly added it.
7. **Factual: "Teste antes do código, por execução"** (`docs/charts.mjs:38`). The bench says only "custou 58% a
   mais" (`bench/README.md:155`) and never gives the metric, so the label is a guess.
8. **Factual, minor: "Pedir o Explore +49% por acerto"** (`docs/charts.mjs:37`). The chart follows the prose
   "~49%" (`bench/README.md:150`), but the bench's own table gives 0,124 → 0,184 = +48% (`:142-143`). F14 checks
   the arithmetic only for US$ pairs, so this slipped through.
9. **Wording, minor: "custaram mais sem acertar mais"** (`bench/README.md:23`, experimentos aria-label). For the
   implicit rules, accuracy did go up (20/20 vs 14/20, `bench/README.md:157`). It went flat only after removing
   the disputable test, and the chart does not say so.
10. **Precision gap, C6.** "um bloco ```text com o prompt pronto": in "A cota está acabando"
    (`docs/SITUACOES.md:250-267`) the only ```text block is the shell command `cctk stats`, not a prompt. F6
    accepts any ```text block.
11. **Precision gap, C16.** The "ficou de fora" series uses `THEMES.muted`, which is a text colour. The THEMES
    comment (`docs/charts.mjs:50`) says only categorical slots 1-2 (`kit`, `opus`) were validated. F16 accepts
    any THEMES value, including `bg` and `grid`, so it cannot tell a validated series colour from a
    non-validated one.
12. **Minor, C17.** `## Resumo` is the first `##`, but `bench/README.md` still opens with the method paragraph and
    the command block (`:3-16`). AC 17 says "abrir com"; C17 checks only "antes de Lados".

Spot checks that held up: the README FAQ answers are backed by the repo. The `advisorModel` removal is in
`docs/GUIA.md:291`. `claude --model opus` appears at `docs/GUIA.md:85` and in the init-project SKILL. Sonnet and
the plugin suggestion committed to the repo are in `plugins/cctk/skills/init-project/SKILL.md:115-117`. `stats`
reading only local transcripts matches `lib/stats.mjs:1,90`. I found no outbound calls other than the ADO probe
(`lib/toolkit.mjs:260`) and the uv installer. The SITUACOES claims also check out: statusline `!` at 80%
(`runtime/statusline.js:6`), `dbhub.toml` in `.gitignore` (init-project SKILL `:93`), audit runs nothing
(audit SKILL `:11`). Both README raw URLs return 200 on GitHub. All 13 EXPERIMENTS evidence strings and US$
pairs are in `bench/README.md` with the meaning the chart gives them, apart from items 6-8. `52% menos` was
already in the bench before this diff (`bench/README.md:67`), so F14 is not being satisfied by text this feature
wrote.

**Handoff decisions (checks.md:118-120) are honest.** (a) `--version` is passed only to other binaries
(`cli.mjs:47`, `cli.mjs:116`), and the `Uso:` line (`cli.mjs:217`) lists only `--yes` and `--dry-run`. (b) The
axis ticks print `+N%` with `class="m"` while the value labels use `class="v"`, so counting `class="v"` is
correct. (c) Dimensões is drawn blue with an asterisk, and the subtitle says it entered by argument with no
measured accuracy gain, which matches `bench/README.md:187-191` word for word.

## Swept existing

No `Swept` row resolves to existing code. Idempotency points to C13, data lifecycle to C14 and dependency failure
to C12; the rest are `n/a` policy. I confirmed idempotency anyway: rerunning `node docs/charts.mjs` from the tests
left `git status --porcelain` empty.

## Coverage

Not recomputed: the profile is light. The C8 and C13 gaps above came out of step 3.

## Faults injected

None: under light there is no fault injection.

## Gate

`node --test test/docs.test.mjs test/docs-conteudo.test.mjs` - 38 passed, 0 failed. `npm test` - 79 passed, 0 failed, 1 skipped (80 tests).
