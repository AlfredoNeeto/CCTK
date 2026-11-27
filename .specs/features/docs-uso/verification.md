# Documentação de uso verification

**Verdict**: PASS
**Profile**: light
**Diff range**: c51d8101ea43938588b35aad4a2dd50fc6f9645c..dfbf244
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 21 checks proven at HEAD (dfbf244) with a located assertion each. The verdict is PASS on the checks as
written. The precision gaps and the one doc-vs-code inconsistency listed under Findings are about the checks
and the docs, not failed proofs.

## Binding sources

No binding source: the plan's Sources are the maintainer's request and reference links. Step 1 is `ui`-only anyway.

## Checks

Proofs run in one batch: `node --test test/docs.test.mjs test/docs-conteudo.test.mjs` exit 0, 20 tests, 20 pass,
each `C<n>` (all but C20) listed individually as passed. Plus `node --test --test-name-pattern "relative links exist" test/toolkit.test.mjs`
exit 0 (1 pass), the C10 curl sweep exit 0, and the C20 validator twice, exit 0 each. Every named test exists in the
tree (hits below) and was added in the diff range (`test/docs.test.mjs`, `test/docs-conteudo.test.mjs`, `test/docs-lib.mjs`
are new; `test/toolkit.test.mjs:219` was changed in range).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | goal index before the first track, links the 3 tracks | batch, `C1` passed | `test/docs.test.mjs:12` - `idx.includes(`(${a})`)` for `#primeiro-uso`, `#desenvolver`, `#prototipar-e-especificar`; `test/docs.test.mjs:13` - `g.indexOf('## O que você quer fazer?') < g.indexOf('## Primeiro uso')` | PASS |
| C2 | Primeiro uso numbered, needles in order | batch, `C2` passed | `test/docs-conteudo.test.mjs:9` - `numbered(s)` (`test/docs-lib.mjs:29`); `test/docs-conteudo.test.mjs:10` - `inOrder(s, ['cctk install', '/cctk:init-project', 'ommit', 'cctk trust', 'Sonnet'])`, order enforced by `test/docs-lib.mjs:25` `assert.ok(i > at)`. Precision gap P4: needle is `ommit`, the doc says `Commite` (docs/GUIA.md:32), not the claimed `commit` | PASS |
| C3 | README Primeiros passos links `#primeiro-uso` | batch, `C3` passed | `test/docs.test.mjs:17` - `section(read('README.md'), 'primeiros-passos').includes('docs/GUIA.md#primeiro-uso')` | PASS |
| C4 | 4 anchors exist; every `GUIA.md#x` in README, docs/*.md, skills SKILL.md resolves | batch, `C4` passed | `test/docs.test.mjs:23` - `ids.includes(a)` over the 4 slugs; `test/docs.test.mjs:29` - `ids.includes(decodeURIComponent(a))` for every `GUIA.md#` match in README.md, bench/README.md, docs/*.md and every `plugins/cctk/skills/*/SKILL.md` (files built at :25-26, a superset of the claim) | PASS |
| C5 | Desenvolver table: direct row, OpenSpec row, `5×` | batch, `C5` passed | `test/docs-conteudo.test.mjs:16-18` - `rows.some(r => /direto/i.test(r))`, `rows.some(r => /OpenSpec/.test(r))`, `s.includes('5×')` | PASS |
| C6 | Desenvolver example, 5 needles in order | batch, `C6` passed | `test/docs-conteudo.test.mjs:22` - `inOrder(section(GUIA(),'desenvolver'), ['/openspec-propose','Dimensões','/openspec-apply-change','/openspec-verify-change','/openspec-archive-change'])`. Precision gap P3: first hits are the steps table (docs/GUIA.md:84-88), not the Exemplo (docs/GUIA.md:92-102) | PASS |
| C7 | Prototipar e especificar numbered, needles in order | batch, `C7` passed | `test/docs-conteudo.test.mjs:27-28` - `numbered(s)`; `inOrder(s, ['/cctk:prototipo','especificação','especificacao.md','/openspec-propose'])` | PASS |
| C8 | prototype numbers and warnings kept | batch, `C8` passed | `test/docs-conteudo.test.mjs:33` - `g.includes(t)` for `18%`, `US$ 0,26 a 0,30`, `US$ 0,25 a 0,31`, `tarje nome e CPF`, `Não use dados reais de cliente`; independently, no number in the c51d810 GUIA is missing from HEAD | PASS |
| C9 | PROMPTS.md exists; each principle has ❌, ✅, https link | batch, `C9` passed | `test/docs.test.mjs:37` - `items.length >= 4` (9 found); `test/docs.test.mjs:40-41` - `it.includes('❌') && it.includes('✅')`, `assert.match(it, /\(https:\/\//)` | PASS |
| C10 | only Anthropic hosts; each link answers 2xx | batch, `C10` passed; curl sweep over 7 unique URLs exit 0 | `test/docs.test.mjs:49` - `assert.ok(ok.has(h), h)` over the 6-host set at :46. Live: `curl -fsSL` exit 0 for all 7. Extra: the 4 `#fragment` anchors on code.claude.com/docs/en/best-practices were found in the page HTML (curl alone does not check fragments) | PASS |
| C11 | PROMPTS "No Claude Code" cites `@`, `pronto`, `/clear`, `plan` | batch, `C11` passed | `test/docs-conteudo.test.mjs:38` - `s.includes(t)` for the 4 needles. Precision gap P5: `@` and `plan` are substrings that match almost anything (`plan` hits `planeje`) | PASS |
| C12 | GUIA and README link PROMPTS.md | batch, `C12` passed | `test/docs.test.mjs:53-54` - `assert.match(GUIA(), /\]\(PROMPTS\.md/)`, `assert.match(read('README.md'), /\]\(docs\/PROMPTS\.md/)` | PASS |
| C13 | vault: set, cofre do sistema, /clear, terminal, $API_TOKEN in order | batch, `C13` passed | `test/docs-conteudo.test.mjs:42` - `inOrder(COFRE(), ['cctk secret set','cofre do sistema','/clear','terminal','$API_TOKEN'])`; COFRE = section `tokens-e-senhas-cofre` (`test/docs-lib.mjs:33`) | PASS |
| C14 | vault cites `MCP`, `IDE`, `fora do Claude` | batch, `C14` passed | `test/docs-conteudo.test.mjs:46` - `COFRE().includes(t)`. Precision gap P2: `fora do Claude` is already satisfied by step 1 (docs/GUIA.md:209), so the not-reached row (docs/GUIA.md:237) is not what proves it | PASS |
| C15 | a bash block with `$API_TOKEN`, a block with `$env:API_TOKEN` | batch, `C15` passed | `test/docs-conteudo.test.mjs:51` - `blocks.some(b => /\$API_TOKEN/.test(b) && !/\$env:/.test(b))`; `:52` - `blocks.some(b => b.includes('$env:API_TOKEN'))` | PASS |
| C16 | `sobrescreve`, `desenvolvimento`, Windows slash limit | batch, `C16` passed | `test/docs-conteudo.test.mjs:57` - `s.includes(t)` for `sobrescreve`, `desenvolvimento`; `:58` - `assert.match(s, ...)` with Windows and a backticked slash on one line, either order | PASS |
| C17 | 8 connectors, 16 circles, 8 `−N%` non-increasing top to bottom, subtitle `−52%` | batch, `C17` passed | `test/docs.test.mjs:61-62` - `count(s, /<line [^>]*class="d"/g) === 8`, `count(s, /<circle /g) === 16`; `:64-65` - `pct.length === 8`, `assert.deepEqual(pct, [...pct].sort((a, b) => b - a))`; `:66` - `s.includes('(−52%)')`. Level note P6: order is read in document order, not by y | PASS |
| C18 | 3 circles and the labels toolkit/openspec/tlc/0,10/0,51/0,71/22/24/24/24 | batch, `C18` passed | `test/docs.test.mjs:74` - `count(s, /<circle /g) === 3`; `:75` - `s.includes(t)` over the 8 labels. Precision gap P1: every needle is also in the aria-label (docs/charts.mjs:77) and 22/24, 24/24 in the y-axis ticks (docs/charts.mjs:84) | PASS |
| C19 | role=img on 4 SVGs; aria-label needles | batch, `C19` passed | `test/docs.test.mjs:82` - `assert.match(s, /role="img"/)`; `:84` - `label.includes(t)` for `fábrica`, `kit`, `52%` (custo) and `custo`, `acerto` (fluxos) | PASS |
| C20 | series colours pass the dataviz validator in both modes | `validate_palette.js "#2a78d6,#eb6834" --mode light --surface "#ffffff"` exit 0, ALL CHECKS PASS; `"#3987e5,#d95926" --mode dark --surface "#0d1117"` exit 0, ALL CHECKS PASS | `docs/charts.mjs:25` - `light: { kit: '#2a78d6', opus: '#eb6834', ... bg: '#ffffff' }`; `docs/charts.mjs:26` - `dark: { kit: '#3987e5', opus: '#d95926', ... bg: '#0d1117' }`; the validated hex values are exactly the series and surface colours used | PASS |
| C21 | bench README `<picture>` with fluxos dark/light in its section; link test covers bench/README.md and PROMPTS.md | batch, `C21` passed; link test exit 0 | `test/docs.test.mjs:93` - `assert.match(s, /<picture>[\s\S]*fluxos-dark\.svg[\s\S]*fluxos-light\.svg[\s\S]*<\/picture>/)` on the slice from `**Fluxos de spec de ponta a ponta` (:90-92); `test/toolkit.test.mjs:219` - `for (const doc of ['README.md', 'docs/GUIA.md', 'docs/PROMPTS.md', 'bench/README.md'])` feeding `:228` `assert.ok(fs.existsSync(...))` | PASS |

## Findings

Precision gaps (the checks or tests are weaker than the claim or AC). None makes a proof red.

- P1 (C18, AC 18): `test/docs.test.mjs:75` checks the labels anywhere in the SVG. Every needle (`toolkit`, `openspec`, `tlc`, `0,10`, `0,51`, `0,71`, `22/24`, `24/24`) is also in the aria-label (`docs/charts.mjs:77`), and `22/24`/`24/24` also come from the y-axis ticks (`docs/charts.mjs:84`). Deleting every point label (`docs/charts.mjs:94-95`) would still pass. AC 18 asks for "valores rotulados em cada ponto". Neither the x = cost / y = correct axes nor the axis titles are asserted.
- P2 (C14, AC 14): `test/docs-conteudo.test.mjs:46` matches `fora do Claude` in step 1 (`docs/GUIA.md:209`, "num terminal fora do Claude Code"), so the not-reached row (`docs/GUIA.md:237`) could be deleted and C14 would stay green. "O que fazer em cada caso" is not asserted at all.
- P3 (C6, AC 6): `test/docs-conteudo.test.mjs:22` finds its first, in-order hits in the steps table (`docs/GUIA.md:84-88`), not in the "Exemplo" (`docs/GUIA.md:92-102`) that the claim names. Removing the example would still pass.
- P4 (C2): the claim names `commit` and the test looks for `ommit` (`test/docs-conteudo.test.mjs:10`) because the doc says "Commite" (`docs/GUIA.md:32`). The claim names a literal that is not in the section (case-sensitive). The claim also stops at the statusline, while AC 2 runs "até o primeiro pedido concluído" (step 8, `docs/GUIA.md:36`), which no check covers.
- P5 (C11): `@` and `plan` (`test/docs-conteudo.test.mjs:38`) are too generic to prove "contexto com `@arquivo`" and "planejar antes". `plan` matches `planeje`.
- P6 (C17, level): sortedness is read from the `−N%` labels in document order (`test/docs.test.mjs:63-65`), not from each row's y. It holds today because `cy = TOP + i * ROW` (`docs/charts.mjs:59`) on the sorted `rows` (`docs/charts.mjs:46`). A regression that reversed y while keeping emit order would pass. Pairing (one factory dot and one kit dot per row, by colour) is only counted (16), never checked.
- P7 (C4, sampling): the claim also covers `plugins/cctk/skills/*/SKILL.md`, but no SKILL.md cites a GUIA anchor (`git grep "GUIA.md#"` hits only README.md:88,101,102 and docs/PROMPTS.md:101). That part of the sweep passes without checking anything. The plan's Impact row ("quem linka hoje: ... plugins/cctk/skills/*") is stale. Nothing is broken.
- P8 (side effect): `svgs()` (`test/docs-lib.mjs:35-37`) regenerates the tracked `docs/img/*.svg` during `npm test`. The output is byte-identical today (`git status --porcelain` was empty after the runs), which also confirms the `idempotency` Swept row.

Doc vs code (spot-check of the cofre section against `plugins/cctk/hooks/secrets.js`, `vault.js`, `creds.js`, `secret-guard.js`, `hooks.json`, `cli.mjs:211`, `lib/toolkit.mjs:288-292`):

- Consistent: hidden prompt (`cli.mjs:211`); encrypted via DPAPI/Keychain/libsecret (`plugins/cctk/hooks/creds.js:1`, `vault.js:27-31`); names only in `~/.cctk/secrets.names` (`vault.js:11,30`); loaded at SessionStart on `startup|resume|clear|compact` (`hooks.json`); written only to `CLAUDE_ENV_FILE` with only names told to Claude (`secrets.js:12-24`); `echo $NAME`/`printenv` blocked (`secret-guard.js:17,24`); `set` overwrites (`lib/toolkit.mjs:291`, spread then assign); 1.2.0 migration (`vault.js:33-43`); `ado add` stores the PAT via `setCred` (`cli.mjs:74`); `.env` reads denied (`lib/toolkit.mjs:31`).
- F1 (inconsistency, carried over from the old text since a7e6320): `docs/GUIA.md:253` says that on Windows, values with `/` or `\` "(URLs, connection strings)" do not reach PowerShell. `plugins/cctk/hooks/secrets.js:9-11` writes values matching `/^[\w@%+=:,./-]*$/` unquoted ("the only form Claude Code also copies to PowerShell") and says only quoted values (spaces, quotes, and so `\`) may be skipped. By the code's own account a plain URL with `/` reaches PowerShell, and values with spaces or quotes are affected but the doc does not mention them. The repo cannot settle which is right, because it depends on how Claude Code copies `CLAUDE_ENV_FILE` to PowerShell. C16 asserts the text, not the truth.

## Coverage

Light profile - not run (the author's Coverage table was read, not recomputed).

## Test policy rows

Light profile - not run; checks.md carries no Test policy section.

## Faults injected

Light profile - not run.

## Swept existing

No Swept row resolves to "existing" (they are `n/a`, `C17` or `C10`), so there is nothing to re-read.

## Gate

`npm test` - 58 tests, 57 passed, 0 failed, 1 skipped (`real claude: validate and install the local plugin in an isolated HOME`, needs `E2E_REAL=1`). It includes `test/docs.test.mjs` (C1, C3, C4, C9, C10, C12, C17, C18, C19, C21 listed individually). `test/docs-conteudo.test.mjs` is outside `npm test` on purpose (checks.md Handoff) and was run by hand above.

`python validate_verification.py docs-uso` - exit 0 (0 errors, 0 warnings).
