# Subagente de busca em Haiku checks

Profile: light
Plan: `.specs/features/subagente-busca/plan.md`

Status: C1-C14 verdes; rodada `bench/results/2026-11-27T14-45-03-319Z` (a regra não passou: valem C12 e C10; C9 e C11 só pela regra
em fixtures). Rodada 2: C3, C5, C9 e C10 reforçados e C13–C14 acrescentados, a partir das lacunas da verificação 1.
Rodada 3: C9 ganha os casos que pegam a comparação só com o `toolkit`; C13 prova o custo na rodada; C14 confere a âncora
e o "mais barato" do Haiku (lacunas G1, G2 e G4 da verificação 2).
Depois da verificação 3 (limite de rodadas): C9 ganha o caso espelho (mais acertos que o `explore`, menos que o `toolkit`) e C14
lê o link do próprio item; os dois mutantes (R1, R3) conferidos pelo autor, não por verificador. Abertos: R2 (na rodada, o
primeiro e o último `result` têm o mesmo custo, então C13 não distingue os dois) e R4 (C14 só barra o texto antigo do Haiku).

14 checks in 2 slices · 2 one-way doors · 0 open, of which 0 block

Dois arquivos de teste, um teste por check, nomeado `C<n>`:
- `test/bench.test.mjs`: sem cota, com fixtures sintéticas. Rodar um: `node --test --test-name-pattern "^C<n> " test/bench.test.mjs`
- `test/bench-rodada.test.mjs`: confere uma rodada real; `BENCH_ROUND=<pasta de bench/results>` é obrigatório e o teste falha sem ele.
  Fica fora do `npm test`, como o `docs-conteudo`.

O piloto (`--arms explore,busca`, 2 tarefas do Humanizer, `--reps 1`) é um ponto de parada no meio do build, não a
rodada que fecha C2, C4 e C9–C12: essa é a completa dos 4 lados.

## Checks

### S1 - a rodada mede o busca · 4 files · 45 KB · ~12k

**C1** - `node bench/run.mjs --arms explore,busca,busca-livre --tasks node-question --dry` sai com 0, e numa rodada os 3 lados têm `cctk` em `plugins` do evento `init` do transcrito (AC 1)
Proof: `node bench/run.mjs --arms explore,busca,busca-livre --tasks node-question --dry`
Proof: `BENCH_ROUND=<rodada> node --test --test-name-pattern "^C1 " test/bench-rodada.test.mjs`

**C2** - Na rodada, o `agents` do evento `init` contém `busca` em toda execução dos lados `busca` e `busca-livre`, e em nenhuma dos lados `toolkit` e `explore` (AC 2)
Proof: `BENCH_ROUND=<rodada> node --test --test-name-pattern "^C2 " test/bench-rodada.test.mjs`

**C3** - `bench/agents/busca.md` tem no frontmatter `name: busca`, `model: haiku` e `tools: Read, Grep, Glob`, e o corpo contém `arquivo:linha` e `Não copie arquivos inteiros` (AC 3)
Proof: `node --test --test-name-pattern "^C3 " test/bench.test.mjs`

**C4** - Na rodada, o campo `prompt` de cada execução: no lado `explore` contém `Explore` e termina com o prompt da tarefa; no `busca` contém `busca` e termina com o prompt da tarefa; no `busca-livre` é igual ao prompt da tarefa (AC 4)
Proof: `BENCH_ROUND=<rodada> node --test --test-name-pattern "^C4 " test/bench-rodada.test.mjs`

**C5** - Um transcrito com 2 chamadas `Agent` a `Explore` e 1 chamada `Task` a `busca` vira `delegations` = `{ "Explore": 2, "busca": 1 }`, e na rodada toda execução tem `delegations` como objeto (não `null`, não lista) de contagens inteiras (AC 5)
Proof: `node --test --test-name-pattern "^C5 " test/bench.test.mjs`
Proof: `BENCH_ROUND=<rodada> node --test --test-name-pattern "^C5 " test/bench-rodada.test.mjs`

**C6** - O `--report` de uma fixture com 3 execuções de um lado (1, 2 e 5 delegações) escreve, na seção da tarefa, a linha `Delegações por execução` com mediana `2` para esse lado (AC 6)
Proof: `node --test --test-name-pattern "^C6 " test/bench.test.mjs`

**C7** - O `--report` de uma fixture em que nenhuma execução do lado `busca` tem modelo com `haiku` contém a linha de atenção com `busca` e `Haiku`; com uma execução em `claude-haiku-5-5`, essa linha não aparece (AC 7)
Proof: `node --test --test-name-pattern "^C7 " test/bench.test.mjs`

**C8** - O `--report` de uma fixture com uma execução sem `delegations` e sem transcrito sai com 0 e mostra `0` delegações para ela (AC 8)
Proof: `node --test --test-name-pattern "^C8 " test/bench.test.mjs`

### S2 - decidir e entregar · 4 files · 35 KB · ~9k

**C9** - A regra (provada em fixtures: exatamente 15% mais barato passa, 14% não; vale contra o `explore` quando ele é o mais barato; menos acertos reprova mesmo muito mais barato; mais acertos que a base passa; 20% abaixo do `toolkit` mas não 15% abaixo do `explore` mais barato reprova; mais acertos que o `toolkit` e menos que o `explore` reprova), calculada sobre a rodada (custo por acerto do `busca` ≤ 0,85 × o menor entre `toolkit` e `explore`, e acertos do `busca` ≥ os do melhor dos dois): se passa, `plugins/cctk/agents/busca.md` existe com conteúdo idêntico a `bench/agents/busca.md` (AC 9)
Proof: `BENCH_ROUND=<rodada> node --test --test-name-pattern "^C9 " test/bench-rodada.test.mjs` (os dois testes `C9`)

**C10** - O `bench/README.md` tem, só dentro do bloco que a regra escolhe (`O que não mostrou ganho` até o próximo título em negrito; ou `## Resultados` fora desse bloco), uma linha por lado com custo por acerto (`US$ 0,124`), acertos (`12/12`) e mediana de delegações iguais aos recalculados da rodada, e a frase `Explore rodou em Sonnet (claude-sonnet` (AC 10)
Proof: `BENCH_ROUND=<rodada> node --test --test-name-pattern "^C10 " test/bench-rodada.test.mjs`

**C11** - Se a regra passou e a mediana de delegações do `busca-livre` é 0, o `docs/GUIA.md` contém `use o subagente busca` (AC 11)
Proof: `BENCH_ROUND=<rodada> node --test --test-name-pattern "^C11 " test/bench-rodada.test.mjs`

**C12** - Se a regra não passou, `plugins/cctk/agents/busca.md` não existe (AC 12)
Proof: `BENCH_ROUND=<rodada> node --test --test-name-pattern "^C12 " test/bench-rodada.test.mjs`

**C13** - Um transcrito com dois eventos `result` (2 e 1 turnos) dá `Turnos` = `3` no `--report`, e na rodada o `cost` de cada execução é o `total_cost_usd` do último `result` do seu transcrito (AC 13). O tempo pelo relógio não tem prova automática: só uma rodada nova o exercita
Proof: `node --test --test-name-pattern "^C13 " test/bench.test.mjs`
Proof: `BENCH_ROUND=<rodada> node --test --test-name-pattern "^C13 " test/bench-rodada.test.mjs`

**C14** - A seção `Economizar cota` do GUIA diz `o Explore roda em Sonnet`, cita `~<n>% mais por acerto` com o `n` recalculado da rodada (49), linka uma âncora que existe no `bench/README.md` e não diz que o Haiku "saiu mais barato" sem dizer por execução (AC 14)
Proof: `BENCH_ROUND=<rodada> node --test --test-name-pattern "^C14 " test/bench-rodada.test.mjs`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| lados novos (3) | `explore` C1 C4 · `busca` C1 C2 C4 · `busca-livre` C1 C2 C4 | - |
| lados sem o agente (2) | `toolkit` C2 · `explore` C2 | - |
| nome da ferramenta de delegação (2) | `Agent` C5 · `Task` C5 | - |
| execução lida pelo `--report` (3) | com `delegations` C6 · sem o campo e com transcrito C5 · sem o campo e sem transcrito C8 | - |
| eventos `result` por transcrito (2) | um C5 · vários C13 | - |
| modelo do `busca` na rodada (2) | sem Haiku C7 · com Haiku C7 | - |
| desfecho da regra de entrada (2) | passa C9 (fixtures) C11 · não passa C9 (fixtures) C12 C10 | - |
| doors do `Landing` (2) | `bench/agents/busca.md` C2 C3 · `cctk:busca` C9 | - |

- Nenhum check afirma mais que o caso que sua prova exercita; C2, C4 e C9–C12 dependem de uma rodada real e são
  provados pela rodada completa, não pelo piloto

## Swept

- validation: existing - `--arms` com nome desconhecido já lança erro (`bench/run.mjs:64`); C1 prova os nomes novos
- failure modes: existing - execução com erro fica fora das medianas e é listada no relatório; C8 para rodada antiga
- idempotency: n/a - cada rodada grava numa pasta nova com data e hora
- authorization: C3 - o agente só tem `Read, Grep, Glob`
- concurrency: n/a - as execuções rodam uma por vez
- data lifecycle: n/a - os resultados ficam em `bench/results/`, fora do git, como nas outras rodadas
- dependency failure: existing - `cachedRepo` lança erro se o clone falhar e `login` para antes do token vencer
- state transitions: n/a - não há estado além da execução
- observability: C5, C6, C7, C13

## Handoff

- S1 = `bench/run.mjs` 29 KB + `bench/agents/busca.md` ~1 KB + 2 testes ~10 KB + fixtures ~5 KB ≈ 45 KB ≈ 12k; S2 =
  `bench/README.md` 11 KB + `docs/GUIA.md` 18 KB + agente + teste ≈ 35 KB ≈ 9k; total ~21k, abaixo do orçamento de
  150k - um builder
