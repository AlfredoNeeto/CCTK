# Documentação como produto checks

Profile: light
Plan: `.specs/features/docs-ferramenta/plan.md`

19 checks in 5 slices · 1 one-way door · 0 open, of which 0 block

Os testes de estrutura ficam em `test/docs.test.mjs` (entra no `npm test`). Os de texto, em
`test/docs-conteudo.test.mjs` (fora do `npm test`, rodados à mão), como no `docs-uso`. Um teste por check,
nomeado `F<n>` (o check C<n> desta feature é o teste F<n>) para não colidir com os testes `C<n>` do `docs-uso`.
Rodar um: `node --test --test-name-pattern "^F<n> " test/docs.test.mjs`.

## Checks

### S1 - README de ferramenta · 3 files · 14 KB · ~4k

**C1** - O README tem a seção "Documentação" antes de "Comandos", e ela linka `docs/GUIA.md#primeiro-uso`, `docs/SITUACOES.md`, `docs/PROMPTS.md`, `docs/GUIA.md` e `bench/README.md`, cada um numa linha de tabela que tem texto além do link (AC 1)
Proof: `node --test --test-name-pattern "^F1 " test/docs.test.mjs`

**C2** - Toda flag da linha `Uso:` de `cli.mjs` (hoje `--dry-run` e `--yes`) aparece na seção "Comandos" do README (AC 2)
Proof: `node --test --test-name-pattern "^F2 " test/docs.test.mjs`

**C3** - O README tem a seção "Perguntas frequentes" com 5 ou mais perguntas (`###` ou `**...?**`), e nenhuma resposta passa de 3 linhas (AC 3)
Proof: `node --test --test-name-pattern "^F3 " test/docs.test.mjs`

**C4** - Todo `src="..."` e `srcset="..."` do README começa por `https://raw.githubusercontent.com/AlfredoNeeto/cctk/main/`, e o arquivo depois desse prefixo existe no repositório (AC 4)
Proof: `node --test --test-name-pattern "^F4 " test/docs.test.mjs`

**C5** - O README tem no máximo 200 linhas (AC 5)
Proof: `node --test --test-name-pattern "^F5 " test/docs.test.mjs`

### S2 - guia por situação · 4 files · 40 KB · ~10k

**C6** - `docs/SITUACOES.md` tem 12 ou mais `###`, e cada um tem `Quando`, um bloco ```` ```text ```` e `Confira` (AC 6)
Proof: `node --test --test-name-pattern "^F6 " test/docs.test.mjs`

**C7** - `docs/SITUACOES.md` cita `/cctk:convert`, `/cctk:audit`, `/cctk:prototipo`, `/cctk:init-project`, `cctk secret`, `cctk ado`, `cctk stats`, `DBHub`, `Playwright`, `context7`, `security-guidance` e `OpenSpec` (AC 7)
Proof: `node --test --test-name-pattern "^F7 " test/docs-conteudo.test.mjs`

**C8** - Todo `cctk <sub>` citado em `docs/SITUACOES.md` tem `cmd === '<sub>'` em `cli.mjs`, e todo `/cctk:<nome>` tem a pasta `plugins/cctk/skills/<nome>` (AC 8)
Proof: `node --test --test-name-pattern "^F8 " test/docs.test.mjs`

**C9** - A seção "O que você quer fazer?" do GUIA e a seção "Documentação" do README linkam `SITUACOES.md`; as âncoras do C4 do `docs-uso` seguem existindo (AC 9)
Proof: `node --test --test-name-pattern "^F9 " test/docs.test.mjs`
Proof: `node --test --test-name-pattern "^C4 " test/docs.test.mjs`

### S3 - prompts por situação · 1 file · 9 KB · ~2k

**C10** - `docs/PROMPTS.md` tem a seção "Modelos por situação" com 6 ou mais blocos ```` ```text ````, e ela cita `bug`, `feature`, `pergunta`, `refatora`, `revis` e `documento` (AC 10)
Proof: `node --test --test-name-pattern "^F10 " test/docs.test.mjs`

**C11** - `docs/PROMPTS.md` tem a seção "Corrigir o rumo", em que a linha de `Esc`, a de `/rewind` e a de `/clear` têm, cada uma, um link `https://code.claude.com/` (AC 11)
Proof: `node --test --test-name-pattern "^F11 " test/docs-conteudo.test.mjs`

**C12** - Todo link `https://` do `docs/PROMPTS.md` é de domínio da Anthropic e responde 2xx (AC 12)
Proof: `node --test --test-name-pattern "^C10 " test/docs.test.mjs`
Proof: `grep -o 'https://[^) >]*' docs/PROMPTS.md | sort -u | xargs -n1 curl -fsSL -o /dev/null --max-time 20`

### S4 - gráficos do benchmark · 4 files · 34 KB · ~9k

**C13** - Depois de `node docs/charts.mjs`, cada `experimentos-*.svg` tem uma barra (`<rect class="b"`) por experimento, a cor de cada barra é `kit` se o experimento entrou no kit e `muted` se ficou de fora (duas cores diferentes), os rótulos `+N%`/`−N%` em ordem crescente de cima para baixo, e cada rótulo de linha termina em `, por acerto` ou `, por execução` (AC 13)
Proof: `node --test --test-name-pattern "^F13 " test/docs.test.mjs`

**C14** - Cada experimento de `charts.mjs` tem os seus números (os dois valores em US$, com a % batendo com o par, ou a %) escritos no `bench/README.md`, e cada versão tem o total `US$ N,NN` e o `ok/execuções` escritos lá (AC 14)
Proof: `node --test --test-name-pattern "^F14 " test/docs.test.mjs`

**C15** - Cada `versoes-*.svg` tem 4 círculos, os rótulos `1.0.2`, `1.1.0`, `1.1.1`, `1.4.0`, os rótulos de ponto `US$ 0,10 · 46/48`, `US$ 0,08 · 46/48`, `US$ 0,08 · 48/48`, `US$ 0,11 · 47/48`, e o subtítulo cita `mesmas 24 tarefas` (AC 15)
Proof: `node --test --test-name-pattern "^F15 " test/docs.test.mjs`

**C16** - Os SVGs novos têm `role="img"` e um `aria-label` que cita `custo`; as cores de série usadas estão em `THEMES` (AC 16)
Proof: `node --test --test-name-pattern "^F16 " test/docs.test.mjs`

**C17** - `bench/README.md` tem `## Resumo` logo abaixo do título, com no máximo 8 linhas não vazias, e tem `<picture>` com `experimentos-dark.svg`/`experimentos-light.svg` e com `versoes-dark.svg`/`versoes-light.svg` (AC 17)
Proof: `node --test --test-name-pattern "^F17 " test/docs.test.mjs`

### S5 - links · 1 file · 5 KB · ~1k

**C18** - Para `README.md`, `bench/README.md` e todo `docs/*.md`, todo link relativo de Markdown e todo `src`/`srcset` relativo aponta para um arquivo que existe (AC 18)
Proof: `node --test --test-name-pattern "^F18 " test/docs.test.mjs`

**C19** - Nesses arquivos, todo link `<arquivo>.md#<âncora>` e `#<âncora>` resolve para um título do arquivo de destino (AC 19)
Proof: `node --test --test-name-pattern "^F19 " test/docs.test.mjs`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| linhas do mapa da documentação (5) | primeiro uso C1 · situações C1 · prompts C1 · guia C1 · benchmark C1 | - |
| flags da CLI (2) | `--dry-run` C2 · `--yes` C2 | - |
| ferramentas cobertas pelas situações (12) | `/cctk:convert` C7 · `/cctk:audit` C7 · `/cctk:prototipo` C7 · `/cctk:init-project` C7 · `cctk secret` C7 · `cctk ado` C7 · `cctk stats` C7 · DBHub C7 · Playwright C7 · context7 C7 · `security-guidance` C7 · OpenSpec C7 | - |
| modelos de prompt (6) | bug C10 · feature C10 · pergunta C10 · refatoração C10 · revisão C10 · documento C10 | - |
| ações de corrigir o rumo (3) | `Esc` C11 · `/rewind` C11 · `/clear` C11 | - |
| SVGs novos (4) | `experimentos-light` C13 · `experimentos-dark` C13 · `versoes-light` C15 · `versoes-dark` C15 | - |
| rodadas de regressão (4) | 1.0.2 C15 · 1.1.0 C15 · 1.1.1 C15 · 1.4.0 C15 | - |
| arquivos cujos links são checados (3 grupos) | `README.md` C18 C19 · `bench/README.md` C18 C19 · `docs/*.md` C18 C19 | - |
| door: `docs/SITUACOES.md` (1) | arquivo C6 | - |

- C12 depende de rede e fica fora do `npm test`; C7 e C11 ficam em `docs-conteudo.test.mjs` para editar o texto de
  propósito não quebrar o `npm test`

## Swept

- validation: n/a - documentação e gerador sem entrada de usuário
- failure modes: n/a - `charts.mjs` só escreve arquivos a partir de constantes
- idempotency: C13 - regerar sobrescreve os mesmos arquivos (o teste regera antes de ler)
- authorization: n/a - sem superfície chamável
- concurrency: n/a - script de execução única
- data lifecycle: C14 - número do gráfico que sair do `bench/README.md` reprova
- dependency failure: C12 - link de fonte quebrado reprova
- state transitions: n/a - sem estado
- observability: n/a - `charts.mjs` já imprime os arquivos gerados

## Handoff

- S1-S5 tocam `README.md` (10 KB), `docs/SITUACOES.md` (novo, ~14 KB), `docs/GUIA.md` (16 KB), `docs/PROMPTS.md` (9 KB),
  `docs/charts.mjs` (5 KB), `bench/README.md` (13 KB), `test/` (~16 KB) = ~83 KB / 4 ≈ 21k, abaixo do budget de 150k - one builder

- **Settled mid-build:** C2 citava `--version` como flag do `cctk`, mas em `cli.mjs` ele só é passado a outros binários; o check passou a ler as flags da linha `Uso:` (`--dry-run`, `--yes`), que é o contrato da CLI. Corrigido também no AC 2 do plan
- **Settled mid-build:** C13 conta só os rótulos de valor (`<text class="v"`), porque os ticks do eixo também têm `+N%`
- **Settled mid-build:** a seção Dimensões fica azul (está no kit) com `*` e uma linha no subtítulo: entrou por argumento, sem ganho de acerto medido (aviso do usuário: a regra do subtítulo não a cobria)
- **Round 2 (verificação FAIL de 27/11):** C8 passou a achar `cctk <sub>` também dentro de bloco de código (`cctk`); C13 amarra a cor de cada barra à flag "entrou no kit"; C11 exige um link por ação; C17 exige o Resumo logo abaixo do título
- **Round 2, pedido do usuário:** o gráfico de versões passou a comparar as mesmas 24 tarefas (a 1.4.0 sem a `security-commit-secret`: 47/48 por US$ 5,21, de `bench/results/2026-11-20T14-22-01-864Z`); AC 15 e C15 mudaram, e o C14 passou a cobrir as versões
- **Round 2, fatos:** "Sonnet no lugar do Opus" virou "Kit no lugar do de fábrica", por execução (soma das medianas, US$ 1,707 contra 0,813); o TDD ganhou o par US$ 0,444 → 0,701; o Explore fica em +49% (custo sem arredondar 0,1845/0,1236); "13 experimentos decididos" virou "13 mudanças testadas"
- **Round 2, C16:** o cinza (`muted`) das barras de fora passa no contraste e na separação CVD do validador da dataviz e falha só o piso de croma, de propósito: é a cor de contexto, contra o azul de destaque
- **Abandoned:** nada
