# Do protótipo aprovado ao código verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: e85945d..920e3da (the fix, prototipo-codigo files only); feature base 48be490
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Why not PASS: C9, the entry rule, still has no bench round. It is **pending**: not proven, and not failed. The gate
cannot accept a PASS while a check is unproven. Every other check (C1-C8, C10) re-ran green at 920e3da. The fix
resolves R1, R2, R3 and R5. R4 (shared bench cache) is still open, and R6 is C9 itself.

Scope: the fix diff `e85945d..920e3da`, limited to `plugins/cctk/skills/prototipo/**`,
`test/prototipo-codigo.test.mjs` and `bench/tasks/proto-react/**` (3 files: `render.mjs`, `telas.test.jsx`, the
test), plus every verdict that was not PASS (C9). The api-http commits in the same range were not judged.
Everything ran in an isolated worktree at 920e3da.

## Checks

Verified at 920e3da: every proof re-ran in full. C9 is carried from 7360c73 (still pending).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | angular: `src/styles/prototipo.css`, estilo then tema, `styles` = `["src/styles/prototipo.css","src/styles.css"]` in `build`, and now also in `test` | `node --test --test-reporter=tap test/prototipo-codigo.test.mjs`, `ok 1` (verified at 920e3da) | `test/prototipo-codigo.test.mjs:38` - `assert.ok(estiloCor > 0 && temaCor > estiloCor, 'tema after estilo')`; `:41` - build styles; `:42` - `architect.test.options.styles` deepEqual, `'component tests get it too'` | PASS |
| C10 | every selector outside `@keyframes` starts with `.prototipo`; `@import` goes to the top whole, even with `;` in the URL; `@layer` blocks are scoped inside | `ok 2` (verified at 920e3da) | `test/prototipo-codigo.test.mjs:52` - the whole Google Fonts `@import` line; `:53` - `/^\.prototipo\{--cor:#1\}/m`, `':root after the Google Fonts @import'`; `:54` - `@layer tema\{\.prototipo \.btn`; `:76` - every head matches `^\.prototipo([ .:[#]\|$)` | PASS (gap N2: each of the two scanner guards is untested alone) |
| C2 | react: writes the CSS; the notice names `import './styles/prototipo.css'` and `src/main.jsx` | `ok 3` (verified at 920e3da) | `test/prototipo-codigo.test.mjs:82` - `fs.existsSync(...prototipo.css)`; `:83` - `/import '\.\/styles\/prototipo\.css'/`; `:84` - `/src\/main\.jsx/` | PASS |
| C3 | flutter: `primary`/`error` from tema; `surface`, `surfaceContainer` + `scaffoldBackgroundColor` (`--fundo`), `onSurface`; Flutter 3.22 notice | `ok 4` (verified at 920e3da) | `test/prototipo-codigo.test.mjs:93` - `dart.includes(t)` over the role list and `'Flutter 3.22'`; `:94` - no `fontFamily` for the system font | PASS |
| C4 | an existing destination is not overwritten; CLI exits 1 | `ok 5` (verified at 920e3da) | `test/prototipo-codigo.test.mjs:101` - `/prototipo\.css já existe/`; `:102` - content still `'meu'`; `:104` - `assert.equal(r.status, 1, ...)` | PASS |
| C5 | no `tema.css` / wrong framework: error says what is missing; CLI exits 1 | `ok 6` (verified at 920e3da) | `test/prototipo-codigo.test.mjs:109` - `/falta .*tema\.css/`; `:111` - `/não é angular: falta angular\.json/`; `:113` - `assert.equal(r.status, 1)` | PASS |
| C6 | 3 maps, a table row for each of the 17 components | `ok 7` (verified at 920e3da) | `test/prototipo-codigo.test.mjs:124` - `assert.ok(rows.some((r) => r.includes(c)), ...)` over `COMPONENTES` x 3 | PASS |
| C7 | `SKILL.md` "Levar ao código" cites `R codigo`, `references/codigo-`, "componentes base", "não reescreva" | `ok 8` (verified at 920e3da) | `test/prototipo-codigo.test.mjs:133` - `assert.ok(s.includes(t), t)` for the four terms | PASS |
| C8 | `node bench/run.mjs --dry --tasks proto-react` exits 0 | `ok   proto-react: sem solução 0/7, com solução 7/7, check passa`, exit 0 (verified at 920e3da) | `bench/run.mjs:207` - `const good = !before.pass && after.pass && check;`; hidden modal test `bench/tasks/proto-react/hidden/hidden/telas.test.jsx:23-26` (hidden by `hidden`, inline `display:none`, closed `<dialog>`), `:31-32` (open by `aberto`, inline display, open `<dialog>`, `:target`) | PASS |
| C9 | in a real round, `proto-codigo` passes at least as often as `toolkit` at least 15% cheaper per pass | not run - no round yet (carried from 7360c73) | `test/prototipo-codigo-rodada.test.mjs:23` - `const entra = p.passes >= t.passes && p.cpp <= 0.85 * t.cpp;` (the test exists; it has not run) | PENDING - no round yet |

## Round-2 findings

| Finding | Status at 920e3da | Evidence |
| --- | --- | --- |
| R1 - a Google Fonts `@import` broke the scoper | resolved | `render.mjs:459-468` adds `proximo`, which finds `{`/`;` outside quotes and parentheses; `:473-474` use it. Probe: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');` + `:root{--fonte:'Inter',sans-serif;--cor:#0a7d4f}` + `.topo h1{…}` comes out as the whole import line, `.prototipo{--fonte:…}`, `.prototipo .topo h1{…}`. Nothing unscoped. The same holds for the unquoted `url(https://…;600…)` and for `@import "https://…;600…";`. Normal rules are unchanged: `.btn:not(.ghost):hover` -> `.prototipo .btn:not(.ghost):hover`, `input[type="text"],a[href^='https:']` -> both scoped. The shipped `assets/estilo.css` through `escopo()`: 128 blocks in, 128 out, 0 unscoped selectors outside `@keyframes`. Asserted by C10 (`test:52-53`). |
| R2 - the hidden modal test rejected state-based ports | resolved | `telas.test.jsx:23-26`, `:31-32`. The solution's `Contas.jsx` with only the modal changed, graded by `hidden/grade.mjs`: conditional render 7/7; always mounted with class `aberto` toggled 7/7; `style={{display: nova ? 'flex' : 'none'}}` 7/7; `<dialog className="modal" open={nova}>` 7/7; faithful `:target` (`<a id="nova-conta" href="#nova">`, `<div className="modal" id="nova">`, `<a id="cancelar" href="#">`) 7/7, check exit 0. Ports that never open fail test 6 (6/7): `<div className="modal">` with no state, `hidden={!nova}` on a `.modal` (correct: `.modal{display:none}` keeps it hidden in a browser too), and a modal that never closes. New leniency N1 below. |
| R3 - Angular `test` target unclaimed | resolved | `test/prototipo-codigo.test.mjs:42` now asserts it. Mutant `['build', 'test']` -> `['build']` at `render.mjs:564` is killed by C1 (it survived in round 2). |
| R4 - bench cache writable through the junction | still open | `bench/run.mjs:115` unchanged. After the dry run at 920e3da, `bench/.cache/deps-proto-react-38c82e99c806/node_modules/.vite/vitest` exists. Low severity for a bench. |
| R5 - `@layer name { ... }` blocks copied unscoped | resolved | `render.mjs:486` scopes `@media`, `@supports`, `@layer` and `@container` blocks inside. Probe: `@layer a{@media (max-width:600px){.m{…}}}` -> `.prototipo .m` and `@container card (min-width:300px){.t{…}}` -> `.prototipo .t`. Asserted by C10 (`test:54`). |
| R6 - C9 still pending | still pending | No round has run. R1 and R2 are fixed, so nothing in the round-2 findings blocks running it now. |

Round-1 findings F1-F7 are carried from e85945d: the fix did not touch what they settled. F4 continues as R4,
and F7 continues as R6.

## Faults injected

Light profile: optional. These were run on the surfaces the fix added. Each mutation was applied in the worktree and
reverted after its check ran (`git status` clean afterwards).

| Mutation | Location | Killed |
| --- | --- | --- |
| `proximo` ignores parentheses (quote tracking kept) | `render.mjs:464` | no - the C10 URL is quoted, so quote tracking alone is enough (N2) |
| `proximo` ignores quotes (paren tracking kept) | `render.mjs:463` | no - the C10 URL sits inside `url(...)`, so paren tracking alone is enough (N2) |
| both guards removed | `render.mjs:463-464` | yes - C10 |
| `layer\|container` removed from the block regex | `render.mjs:486` | yes - C10 `'@layer block scoped inside'` |
| `['build', 'test']` -> `['build']` | `render.mjs:564` | yes - C1 `'component tests get it too'` |

The new `visivel` branches in `telas.test.jsx` have no automated check of their own: C8 grades the solution, which
renders the modal conditionally. The variant run under R2 is what exercises them.

## Gate

`node --test --test-reporter=tap test/prototipo-codigo.test.mjs` - 8 passed, 0 failed.
`node bench/run.mjs --dry --tasks proto-react` - exit 0 (`sem solução 0/7, com solução 7/7, check passa`).
`npm test` - 108 tests: 107 passed, 0 failed, 1 skipped (`real claude ...`, needs `E2E_REAL=1`); exit 0.
C9 - not run (no round).

## Remaining findings

Ranked from most to least severe.

1. **R6 - C9 still pending.** It decides whether "Levar ao código" stays in `SKILL.md`
   (`test/prototipo-codigo-rodada.test.mjs:23`). This is the only thing between this feature and a PASS. Nothing
   found in this round blocks running the round.
2. **N1 - the hidden test accepts a `<dialog className="modal" open>` that a browser would not show**
   (`bench/tasks/proto-react/hidden/hidden/telas.test.jsx:32`). The catalog's `.modal{display:none}`
   (`plugins/cctk/skills/prototipo/assets/estilo.css:107`) is author CSS, so it beats the browser's
   `dialog[open]{display:block}`. Only `.modal.aberto` and `.modal:target` (`:108`) show it. The test's own comment
   (`telas.test.jsx:29-30`) says it models that CSS. A `<dialog>` without the `modal` class is judged correctly. This
   is a false pass for a modal that is visually broken. Visual fidelity is a known limit (F3(a)), so the severity is
   low, but it can count a pass for whichever arm writes it.
3. **N2 - each of the scanner's two guards is untested on its own** (`render.mjs:463-464`). C10's URL is both
   quoted and inside `url(...)`, so dropping either the quote or the paren tracking survives. Both cases work today
   (probes under R1). Adding `@import "…wght@400;600…";` (quotes only) or an unquoted `url(…;…)` to C10 would pin
   each one.
4. **R4 - the bench cache can still be written through the junction** (`bench/run.mjs:115`). Unchanged since round 2,
   and low severity.
5. **N3 - outside the fix diff, low: `sel()` splits on commas inside parentheses** (`render.mjs:445`). For
   `.a:not(.b,*)` it produces `.prototipo .a:not(.b,.prototipo *)`, which never matches. `:is(h1,.b)` stays equivalent.
   `estilo.css` has no such selector. The header comment at `render.mjs:441` still lists only `@media`/`@supports`
   as scoped inside. The brace-in-string shortcut accepted in round 1 (F6) is unchanged: `content:"a{"` still leaves
   the rules after it unscoped.
