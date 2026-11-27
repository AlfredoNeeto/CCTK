# Documentação de uso checks

Profile: light
Plan: `.specs/features/docs-uso/plan.md`

`<dataviz>` = a pasta da skill dataviz embutida no Claude Code. Status: C1-C21 verdes no build.

21 checks in 6 slices · 1 one-way door · 0 open, of which 0 block

Proofs de estrutura ficam em `test/docs.test.mjs` (entra no `npm test`); os de texto e números, em
`test/docs-conteudo.test.mjs` (fora do `npm test`, para editar o texto de propósito não quebrar nada). Um teste por check, nomeado `C<n>`.
Rodar um: `node --test --test-name-pattern "^C<n> " test/docs.test.mjs`.

## Checks

### S1 - primeiro uso · 2 files · 26 KB · ~7k

**C1** - O GUIA tem a seção "O que você quer fazer?" antes da primeira trilha, com links para `#primeiro-uso`, `#desenvolver` e `#prototipar-e-especificar` (AC 1)
Proof: `node --test --test-name-pattern "^C1 " test/docs.test.mjs`

**C2** - A seção "Primeiro uso" é uma lista numerada que contém, nesta ordem, `cctk install`, `/cctk:init-project`, `commit`, `cctk trust` e `Sonnet` (statusline) (AC 2)
Proof: `node --test --test-name-pattern "^C2 " test/docs-conteudo.test.mjs`

**C3** - A seção "Primeiros passos" do README linka `docs/GUIA.md#primeiro-uso` (AC 3)
Proof: `node --test --test-name-pattern "^C3 " test/docs.test.mjs`

**C4** - Os slugs dos títulos do GUIA incluem `tokens-e-senhas-cofre`, `azure-devops-server`, `o-check-antes-de-encerrar` e `feature-ou-bug-com-regra-de-negócio`, e todo `GUIA.md#<âncora>` citado em README, `docs/*.md` e `plugins/cctk/skills/*/SKILL.md` existe (AC 4)
Proof: `node --test --test-name-pattern "^C4 " test/docs.test.mjs`

### S2 - desenvolver · 1 file · 16 KB · ~4k

**C5** - A seção "Desenvolver" tem uma tabela com uma linha para pedir direto e uma para o OpenSpec, e cita `5×` (AC 5)
Proof: `node --test --test-name-pattern "^C5 " test/docs-conteudo.test.mjs`

**C6** - A seção "Desenvolver" tem um exemplo com `/openspec-propose`, `Dimensões`, `/openspec-apply-change`, `/openspec-verify-change` e `/openspec-archive-change`, nesta ordem (AC 6)
Proof: `node --test --test-name-pattern "^C6 " test/docs-conteudo.test.mjs`

### S3 - prototipar e especificar · 1 file · 16 KB · ~4k

**C7** - A seção "Prototipar e especificar" é uma lista numerada com `/cctk:prototipo`, `especificação`, `especificacao.md` e `/openspec-propose`, nesta ordem (AC 7)
Proof: `node --test --test-name-pattern "^C7 " test/docs-conteudo.test.mjs`

**C8** - O GUIA mantém os números e avisos atuais do protótipo: `18%`, `US$ 0,26 a 0,30`, `US$ 0,25 a 0,31`, `tarje nome e CPF` e `Não use dados reais de cliente` (AC 8)
Proof: `node --test --test-name-pattern "^C8 " test/docs-conteudo.test.mjs`

### S4 - guia de prompts · 3 files · 30 KB · ~8k

**C9** - `docs/PROMPTS.md` existe e cada `###` sob "Princípios" tem um ❌, um ✅ e um link `https://` (AC 9)
Proof: `node --test --test-name-pattern "^C9 " test/docs.test.mjs`

**C10** - Todo link `https://` de `docs/PROMPTS.md` é de `platform.claude.com`, `docs.anthropic.com`, `code.claude.com`, `docs.claude.com`, `www.anthropic.com` ou `claude.com`, e cada um responde 2xx (AC 10)
Proof: `node --test --test-name-pattern "^C10 " test/docs.test.mjs`
Proof: `grep -o 'https://[^) >]*' docs/PROMPTS.md | sort -u | xargs -n1 curl -fsSL -o /dev/null --max-time 20`

**C11** - `docs/PROMPTS.md` tem a seção "No Claude Code" que cita `@`, `pronto`, `/clear` e `plan` (AC 11)
Proof: `node --test --test-name-pattern "^C11 " test/docs-conteudo.test.mjs`

**C12** - `docs/GUIA.md` e `README.md` linkam `PROMPTS.md` (AC 12)
Proof: `node --test --test-name-pattern "^C12 " test/docs.test.mjs`

### S5 - cofre · 1 file · 16 KB · ~4k

**C13** - A seção do cofre cita, nesta ordem, `cctk secret set`, `cofre do sistema`, `/clear`, `terminal` e `$API_TOKEN` (AC 13)
Proof: `node --test --test-name-pattern "^C13 " test/docs-conteudo.test.mjs`

**C14** - A seção do cofre cita `MCP`, `IDE` e `fora do Claude` (AC 14)
Proof: `node --test --test-name-pattern "^C14 " test/docs-conteudo.test.mjs`

**C15** - A seção do cofre tem um bloco com `$API_TOKEN` e outro com `$env:API_TOKEN` (AC 15)
Proof: `node --test --test-name-pattern "^C15 " test/docs-conteudo.test.mjs`

**C16** - A seção do cofre cita `sobrescreve`, `desenvolvimento` e o limite de `/` ou `\` no Windows (AC 16)
Proof: `node --test --test-name-pattern "^C16 " test/docs-conteudo.test.mjs`

### S6 - gráficos · 4 files · 30 KB · ~8k

**C17** - Depois de `node docs/charts.mjs`, cada `custo-*.svg` tem 8 linhas conectoras e 16 círculos, 8 rótulos `−N%` em ordem não crescente de cima para baixo, e o subtítulo com `−52%` (AC 17)
Proof: `node --test --test-name-pattern "^C17 " test/docs.test.mjs`

**C18** - Cada `fluxos-*.svg` tem 3 círculos e os rótulos `toolkit`, `openspec`, `tlc`, `0,10`, `0,51`, `0,71`, `22/24` e `24/24` (AC 18)
Proof: `node --test --test-name-pattern "^C18 " test/docs.test.mjs`

**C19** - Os 4 SVGs têm `role="img"`; o `aria-label` de `custo-*` cita `fábrica`, `kit` e `52%`, e o de `fluxos-*` cita `custo` e `acerto` (AC 19)
Proof: `node --test --test-name-pattern "^C19 " test/docs.test.mjs`

**C20** - As cores de série de cada tema passam no validador da skill dataviz sem FAIL (AC 20)
Proof: `node <dataviz>/scripts/validate_palette.js "#2a78d6,#eb6834" --mode light --surface "#ffffff"`
Proof: `node <dataviz>/scripts/validate_palette.js "#3987e5,#d95926" --mode dark --surface "#0d1117"`

**C21** - `bench/README.md` tem um `<picture>` com `fluxos-dark.svg` e `fluxos-light.svg` dentro da seção "Fluxos de spec de ponta a ponta", e o teste de links cobre `bench/README.md` e `docs/PROMPTS.md` (AC 21)
Proof: `node --test --test-name-pattern "^C21 " test/docs.test.mjs`
Proof: `node --test --test-name-pattern "relative links exist" test/toolkit.test.mjs`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| trilhas do índice (3) | `primeiro-uso` C1 · `desenvolver` C1 · `prototipar-e-especificar` C1 | - |
| âncoras citadas hoje (4) | `tokens-e-senhas-cofre` C4 · `azure-devops-server` C4 · `o-check-antes-de-encerrar` C4 · `feature-ou-bug-com-regra-de-negócio` C4 | - |
| destinos do cofre que não recebem a variável (3) | MCP C14 · IDE C14 · fora do Claude C14 | - |
| shells do exemplo do cofre (2) | bash C15 · PowerShell C15 | - |
| SVGs gerados (4) | `custo-light` C17 · `custo-dark` C17 · `fluxos-light` C18 · `fluxos-dark` C18 | - |
| temas validados (2) | light C20 · dark C20 | - |
| lados do gráfico de fluxos (3) | `toolkit` C18 · `openspec` C18 · `tlc` C18 | - |
| door: `docs/PROMPTS.md` (1) | arquivo C9 | - |

- Nenhum check afirma mais que o caso que o seu teste lê; C10 e C20 dependem de comando fora do `npm test`
  (rede e skill local)

## Swept

- validation: n/a - documentação e gerador sem entrada de usuário
- failure modes: n/a - `charts.mjs` só escreve arquivos a partir de constantes
- idempotency: C17 - regerar sobrescreve os mesmos 4 arquivos
- authorization: n/a - sem superfície chamável
- concurrency: n/a - script de execução única
- data lifecycle: n/a - nada persistido além dos SVGs versionados
- dependency failure: C10 - link de fonte quebrado reprova
- state transitions: n/a - sem estado
- observability: n/a - `charts.mjs` já imprime os arquivos gerados

## Handoff

- S1-S6 tocam `README.md` (10 KB), `docs/GUIA.md` (16 KB), `docs/PROMPTS.md` (novo, ~10 KB), `docs/charts.mjs` (4 KB),
  `bench/README.md` (12 KB), `test/` (~15 KB), `package.json` (1 KB) = ~68 KB / 4 ≈ 17k, abaixo do budget de 150k - one builder

- **Settled mid-build:** o usuário escolheu "só estrutura" no `npm test`: C2, C5-C8, C11 e C13-C16 (frases e números)
  passaram para `test/docs-conteudo.test.mjs`, rodado à mão; a afirmação de cada check não mudou
- **Settled mid-build:** legenda do gráfico de halteres desenhada com `rect rx=6` para que os `<circle>` sejam só dados (C17 conta 16)
- **Abandoned:** nada
