# Do protótipo aprovado ao código verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: 7360c73..e85945d (the fix); feature base 48be490
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Why not PASS: C9, the entry rule, still has no bench round. It is **pending**: not proven, and not failed. The gate
cannot accept a PASS while a check is unproven. Every other check (C1-C8, C10) re-ran green at e85945d. The fix
resolves round-1 findings F1, F3(b) and F5, resolves F2 for the case it tested, and leaves one new defect in the same
code: a Google Fonts `@import` URL with a `;` in it breaks the scoper (R1 below).

Scope: the fix diff `7360c73..e85945d` plus every verdict that was not PASS (C9). The commit also carries the
`api-http` feature (api-check hook, api-contrato task, `sem-http` arm, `checkCmd` in `bench/run.mjs`), which was not
judged. Everything ran in an isolated worktree at e85945d.

## Checks

Verified at e85945d: every proof re-ran in full. C9 is carried from 7360c73 (still pending).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | angular: `src/styles/prototipo.css`, estilo then tema, `styles` = `["src/styles/prototipo.css","src/styles.css"]` | `node --test --test-name-pattern "^C1 " test/prototipo-codigo.test.mjs`, `# pass 1` (verified at e85945d) | `test/prototipo-codigo.test.mjs:37` - `assert.ok(estiloCor > 0 && temaCor > estiloCor, 'tema after estilo')`; `:40` - `assert.deepEqual(...build.options.styles, ['src/styles/prototipo.css', 'src/styles.css'])` | PASS |
| C10 | every selector outside `@keyframes` starts with `.prototipo`; tema `@import` goes to the top, `@layer base;` stays, the rule after them is still scoped | `^C10 `, `# pass 1` (verified at e85945d) | `test/prototipo-codigo.test.mjs:45` - `assert.match(css, /^@import url\("fonte\.css"\);\n/, '@import goes to the top')`; `:46` - `/^@layer base;$/m`; `:47` - `/^\.prototipo\{--fonte:Inter\}/m`; `:69` - every head matches `^\.prototipo([ .:[#]\|$)` | PASS (precision gap R1: no `;` inside the URL) |
| C2 | react: writes the CSS; the notice names `import './styles/prototipo.css'` and `src/main.jsx` | `^C2 `, `# pass 1` (verified at e85945d) | `test/prototipo-codigo.test.mjs:75` - `fs.existsSync(...prototipo.css)`; `:76` - `/import '\.\/styles\/prototipo\.css'/`; `:77` - `/src\/main\.jsx/` | PASS |
| C3 | flutter: `primary`/`error` from tema; `surface`, `surfaceContainer` + `scaffoldBackgroundColor` (`--fundo`), `onSurface`; Flutter 3.22 notice | `^C3 `, `# pass 1` (verified at e85945d) | `test/prototipo-codigo.test.mjs:84-86` - `dart.includes(t)` for `'surfaceContainer: const Color(0xFFF4F6F9)'`, `'scaffoldBackgroundColor: const Color(0xFFF4F6F9)'`, `'onSurface: const Color(0xFF0F172A)'`, `'Flutter 3.22'` | PASS |
| C4 | an existing destination is not overwritten; CLI exits 1 | `^C4 `, `# pass 1` (verified at e85945d) | `test/prototipo-codigo.test.mjs:94` - `/prototipo\.css já existe/`; `:95` - content still `'meu'`; `:97` - `assert.equal(r.status, 1, ...)` | PASS |
| C5 | no `tema.css` / wrong framework: error says what is missing; CLI exits 1 | `^C5 `, `# pass 1` (verified at e85945d) | `test/prototipo-codigo.test.mjs:102` - `/falta .*tema\.css/`; `:104` - `/não é angular: falta angular\.json/`; `:106` - `assert.equal(r.status, 1)` | PASS |
| C6 | 3 maps, a table row for each of the 17 components | `^C6 `, `# pass 1` (verified at e85945d) | `test/prototipo-codigo.test.mjs:117` - `assert.ok(rows.some((r) => r.includes(c)), ...)` over `COMPONENTES` x 3 | PASS |
| C7 | `SKILL.md` "Levar ao código" cites `R codigo`, `references/codigo-`, "componentes base", "não reescreva" | `^C7 `, `# pass 1` (verified at e85945d) | `test/prototipo-codigo.test.mjs:126` - `assert.ok(s.includes(t), t)` for the four terms | PASS |
| C8 | `node bench/run.mjs --dry --tasks proto-react` exits 0 | `node bench/run.mjs --dry --tasks proto-react` -> `ok   proto-react: sem solução 0/7, com solução 7/7, check passa`, exit 0 (verified at e85945d) | `bench/run.mjs:207` - `const good = !before.pass && after.pass && check;`; hidden modal test `bench/tasks/proto-react/hidden/hidden/telas.test.jsx:20-23` (`visivel`: open by class `aberto`, by not being rendered, or by `:target`), `:53-54` (`texto()` folds NBSP) | PASS |
| C9 | in a real round, `proto-codigo` passes at least as often as `toolkit` at least 15% cheaper per pass | not run - no round yet (carried from 7360c73) | `test/prototipo-codigo-rodada.test.mjs:23` - `const entra = p.passes >= t.passes && p.cpp <= 0.85 * t.cpp;` (the test exists; it has not run) | PENDING - no round yet |

## Round-1 findings

| Finding | Status at e85945d | Evidence |
| --- | --- | --- |
| F1 - the hidden modal test failed a faithful port | resolved | A faithful `:target` port built by hand (modal always rendered as `<div className="modal" id="nova">`, `<a id="nova-conta" href="#nova">`, `<a id="cancelar" href="#">`, no state): hidden **7/7**, check (`npm run build && npm test`) exit 0. Mechanism: `telas.test.jsx:15-18` (`clicar` moves the hash), `:20-23` (`visivel`). Residual R2 below. |
| F2 - `escopo()` left `:root` unscoped after an `@import`/`@layer` | resolved for the tested inputs; new defect R1 | `render.mjs:463-468` copies a statement at-rule up to `;` and hoists `@import`, `:479` puts imports first. Reproduced: `.a{}` + `@import url("…/inter.css");` + `:root{--cor;--fonte}` + `@layer base;` + `.b{}` comes out as `@import` first, `.prototipo .a`, `.prototipo{--cor…}`, `@layer base;`, `.prototipo .b`. `@layer reset, base;`, `@charset` and `@import … print;` are fine too. End to end, `codigo('react')` with that tema puts `@import` on line 3, right after the notice comment and before the first rule, and leaves no unscoped `:root`. |
| F3(a) - hidden tests can't see the visual | accepted limit, not fixed | Written into checks.md Handoff ("Limite conhecido do C9"). AC 9 (`plan.md:78`) measures passes and cost per pass, and `plan.md:88` defers visual comparison. The hidden tests still check text, `id` and navigation only. |
| F3(b) - tfoot depended on an ASCII space | resolved | The solution's `Contas.jsx` with `toLocaleString('pt-BR', {style:'currency', currency:'BRL'})` and the NBSP `.replace` removed: hidden **7/7**, check exit 0. `telas.test.jsx:53-54` compares `texto(rodape)`. |
| F4 - shared, writable bench cache | partial | Partial installs: resolved. `bench/run.mjs:106-113`, `.ok` is written only after `npm ci`, and a cache without it is wiped and rebuilt (`.ok` present after the dry run). Shared writes: still open, low severity. After the dry run at e85945d, `bench/.cache/deps-proto-react-*/node_modules/.vite/vitest` exists again, so an arm can still write through the junction (`:115`). |
| F5 - Flutter `ThemeData` | resolved | `render.mjs:519` `surfaceContainer` (was `surfaceContainerLowest`), `:506` adds the Flutter 3.22 notice, `:507` the "register the font in pubspec.yaml" notice for a non-system font. A probe with `--fonte:"Inter"` gives both comments plus `fontFamily: 'Inter'`. The font notice is not asserted by any check (C3 uses the system font, `test:87`). |
| F6 - scoping, portals, Angular test target | resolved | Overlay/portal notes are in `codigo-angular.md:34` and `codigo-react.md:34`. `render.mjs:552` also prepends the CSS to `architect.test.options.styles`. A probe gives `test` = `["src/styles/prototipo.css","src/styles.css"]`. No check claims the test target, and mutant M4 survives. The brace-in-string shortcut (`render.mjs:443`) is unchanged and accepted. |
| F7 - C9 never exercised | still pending | No round. The hidden tests were fixed before the round, as round 1 recommended. |

Negative control (the hidden tests still discriminate): a naive port that ignores the prototype's texts and ids
(`Accounts payable`, `New`, `Cancel`, no ids) gets **0/7**. The solution's texts with every `id`/`htmlFor`
stripped also gets **0/7**. Both pass the check, so only the hidden tests reject them.

## Faults injected

Light profile: optional. These were run on the surfaces the fix added. Each mutation was applied in the worktree and
reverted after its check ran.

| Mutation | Location | Killed |
| --- | --- | --- |
| `@import` no longer hoisted (`out +=` instead of `imports.push`) | `render.mjs:467` | yes - C10 `'@import goes to the top'` |
| statement-at-rule branch disabled | `render.mjs:466` | yes - C10 |
| `surfaceContainer` -> `surfaceContainerLowest` | `render.mjs:519` | yes - C3 |
| `['build', 'test']` -> `['build']` | `render.mjs:552` | no - no check claims the Angular `test` target (behaviour from the Handoff, outside C1's claim) |

## Gate

`node --test --test-reporter=tap test/prototipo-codigo.test.mjs` - 8 passed, 0 failed (each `^Cn ` pattern selects exactly one test).
`node bench/run.mjs --dry --tasks proto-react` - exit 0 (`sem solução 0/7, com solução 7/7, check passa`).
`npm test` - 106 tests: 105 passed, 0 failed, 1 skipped (`real claude ...`, needs `E2E_REAL=1`).
C9 - not run (no round).

## Remaining findings

Ranked from most to least severe.

1. **R1 - a Google Fonts `@import` breaks the scoper and drops the tema rule** (AC 10, C10 precision gap). `render.mjs:463` takes the first `;` after `@` as the end of the statement. Google Fonts' standard embed `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');` has a `;` inside the URL. Reproduced: the import is cut to `…wght@400;`, and the rest becomes the selector `.prototipo 600&display=swap');\n:root{--fonte:…}`. That selector is invalid, so the browser drops the whole tema `:root` rule (font and any colours in it), and the truncated import loads nothing. `tema.css` is where the SKILL puts the project's font (`SKILL.md:29`), and this is the URL Google Fonts hands out. C10's fixture (`test/prototipo-codigo.test.mjs:44`) uses a URL with no `;`. Fix: skip `;` inside quotes/`url(...)` when finding the end, and add that URL to C10.
2. **R2 - the hidden modal test still rejects two plausible state-based ports** (C8/C9, residual of F1). `telas.test.jsx:20-23` counts only class `aberto`, not being rendered, or `:target`. A port that keeps `<div className="modal">` mounted and toggles `style={{display: nova ? 'flex' : 'none'}}` gets 6/7. A port using `<dialog open={nova}>` also gets 6/7. Both build and pass the check. These differ from the prototype's mechanism (`.modal.aberto`/`:target`), so the bias is smaller than in round 1. It still counts as a miss for whichever arm writes them.
3. **R3 - the Angular `test` target change is unclaimed** (`render.mjs:552`). It is correct (probe above), but no check states it and mutant M4 survives. Either add it to C1 or leave it as untested behaviour knowingly.
4. **R4 - the bench cache can still be written through the junction** (`bench/run.mjs:115`, residual of F4). Vitest's `.vite/vitest` lands in the shared cache, and an `npm install` by an agent under test would too. Low severity for a bench.
5. **R5 - `@layer name { ... }` blocks are copied unscoped** (`render.mjs:475`). Only `@media`/`@supports` are scoped inside (`:474`), so `@layer base{.d{…}}` leaks `.d` globally. This predates the fix and is unlikely in `tema.css`. Note it next to the existing `shortcut:` comment.
6. **R6 - C9 still pending.** It decides whether "Levar ao código" stays in `SKILL.md`. Run the round after R1 (and ideally R2) are fixed.
