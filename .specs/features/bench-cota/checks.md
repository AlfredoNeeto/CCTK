# Benchmarks de cota checks

Profile: light
Plan: `.specs/features/bench-cota/plan.md`

11 checks in 3 slices · 2 one-way doors · 0 open, of which 0 block

Os testes que não gastam cota ficam em `test/bench-cota.test.mjs` (entra no `npm test`), um por check, nomeado `C<n>`.
Os que precisam de uma rodada real ficam em `test/bench-cota-rodada.test.mjs` (fora do `npm test`, com
`BENCH_ROUND=<bench/results/...>`). A leitura do log do plugin e do `/usage` fica em `bench/medidas.mjs`, que o
`run.mjs` importa.

## Checks

### S1 - custo do security-guidance · 4 files · 40 KB · ~10k

**C1** - O `run.mjs` aceita `--arms sg-sonnet,sem-sg`; no HOME do `sg-sonnet`, o `settings.json` tem `env.SECURITY_REVIEW_MODEL` e `env.SG_AGENTIC_MODEL` iguais a `claude-sonnet-5-5`; o `sem-sg` instala o plugin `cctk` e não instala o `security-guidance` (AC 1)
Proof: `node --test --test-name-pattern "^C1 " test/bench-cota.test.mjs`
Proof: `BENCH_ROUND=<rodada> node --test --test-name-pattern "^C1 " test/bench-cota-rodada.test.mjs`

**C2** - `sgUsage` de um log com duas linhas `Review usage:` (`est_cost_usd=0.0113` e `est_cost_usd=0.0200`, modelos `claude-opus-5-5` e `claude-sonnet-5-5`) devolve `cost` 0.0313, `models` com os dois e `reviews` 2 (AC 2)
Proof: `node --test --test-name-pattern "^C2 " test/bench-cota.test.mjs`

**C3** - `sgUsage` de um log com duas linhas `Stop hook: reviewing` e uma `Review usage: review=stop` devolve `incomplete` 1; de um log vazio ou inexistente devolve `cost` 0 e `incomplete` 0 (AC 3)
Proof: `node --test --test-name-pattern "^C3 " test/bench-cota.test.mjs`

**C4** - No relatório de uma rodada sintética com `toolkit` (`cost` 0.10, `sgCost` 0.02) e `sem-sg` (`cost` 0.10, sem `sgCost`), a seção da tarefa tem as linhas "Custo do security-guidance (US$)" com `0,020` no `toolkit` e "Custo com o plugin (US$)" com `0,120`; uma execução `toolkit` sem o campo `sgCost`, ou com `sgCost: null` (o plugin não criou o log), aparece como `não medido` (AC 4)
Proof: `node --test --test-name-pattern "^C4 " test/bench-cota.test.mjs`

### S2 - advisor em sessão longa · 2 tasks · 60 KB · ~15k

**C5** - Existem no mínimo 2 pastas `bench/tasks/long-*`, cada uma com no mínimo 6 arquivos de código em `repo/` um pedido que nomeia no mínimo 3 desses arquivos, e uma solução de referência que muda no mínimo 3 deles (AC 5)
Proof: `node --test --test-name-pattern "^C5 " test/bench-cota.test.mjs`

**C6** - `node bench/run.mjs --dry --tasks <as long-*>` sai com 0: sem a solução os testes ocultos falham, com a solução passam e o check passa (AC 6)
Proof: `node bench/run.mjs --dry --tasks long-pedidos,long-folha`

**C7** - No relatório de uma rodada sintética com `toolkit` (2 execuções, uma com `claude-opus-5-5` nos modelos) e `sem-advisor` (2 execuções só Sonnet), há uma linha por lado dizendo quantas execuções consultaram o Opus: `1 de 2` e `0 de 2` (AC 7)
Proof: `node --test --test-name-pattern "^C7 " test/bench-cota.test.mjs`

### S3 - US$ → cota · 2 files · 30 KB · ~8k

**C8** - `parseUsage` do texto do `/usage` de 27/11 (`Current session: 45% used · resets ...` e `Current week (all models): 34% used · resets ...`) devolve `session.pct` 45, `week.pct` 34 e os dois textos de reset (AC 8)
Proof: `node --test --test-name-pattern "^C8 " test/bench-cota.test.mjs`

**C9** - Com `cota.json` de antes `{session 40, week 30, resets A}` e depois `{session 50, week 33, resets B ≠ A na sessão}`, o relatório marca a janela de 5 horas como inválida e calcula a da semana (AC 9)
Proof: `node --test --test-name-pattern "^C9 " test/bench-cota.test.mjs`

**C10** - Com `cota.json` de antes `{session 40, week 30}` e depois `{session 50, week 33}`, mesmos resets, e custo total da rodada US$ 6,00 (Claude mais plugin), o relatório mostra `US$ 0,60` por 1% da sessão e `US$ 2,00` por 1% da semana (AC 10)
Proof: `node --test --test-name-pattern "^C10 " test/bench-cota.test.mjs`

**C11** - `parseUsage` de um texto sem as duas porcentagens devolve `null`, e o `run.mjs` sai com 1 antes de preparar os lados quando a leitura de `--cota` não vem (AC 11)
Proof: `node --test --test-name-pattern "^C11 " test/bench-cota.test.mjs`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| lados novos (2) | `sg-sonnet` C1 · `sem-sg` C1 | - |
| linhas do log do plugin (2) | `Review usage:` C2 · `Stop hook: reviewing` C3 | - |
| tarefas longas (2) | `long-pedidos` C5 C6 · `long-folha` C5 C6 | - |
| janelas da cota (2) | sessão C8 C9 C10 · semana C8 C9 C10 | - |
| door: medição pelo log do plugin (1) | C2 C3 C4 | - |
| door: tarefas `long-*` no formato atual (1) | C5 C6 | - |

- C1 também tem prova de rodada (o `init` de cada execução lista os plugins); C6 depende de `node` e `dotnet` locais

## Swept

- validation: C11 - leitura do `/usage` sem as porcentagens reprova antes de gastar
- failure modes: C3 - revisão do plugin cancelada no fim do `-p` fica marcada como incompleta
- idempotency: n/a - cada rodada grava numa pasta nova com data e hora
- authorization: n/a - o bench usa o login copiado, como hoje
- concurrency: C9 - reset de janela no meio da rodada invalida a conta dela; uso da conta por outra sessão não é detectável pelo `/usage` e vai como aviso no relatório
- data lifecycle: n/a - `bench/results/` fora do git, como hoje
- dependency failure: C3 - log do plugin ausente vira custo 0 com `reviews` 0, não erro
- state transitions: n/a - sem estado
- observability: C4 C7 C10 - o relatório mostra custo do plugin, consultas ao Opus e US$ por 1% da cota

## Handoff

- **Round 2 (verificação de 27/11, PASS com achados):** as tarefas longas passaram a exigir mudança em 3 arquivos (C5 confere a solução); o pedido da folha exclui o desconto simplificado do IRRF; os `assert.throws` exigem erro que não seja o "não implementado"; log do plugin ausente vira `sgCost: null` e "não medido"; a leitura final do `/usage` não derruba o relatório
- S1-S3 tocam `bench/run.mjs` (25 KB), `bench/medidas.mjs` (novo, ~3 KB), `bench/tasks/long-*` (novos, ~40 KB),
  `test/bench-cota*.test.mjs` (novos, ~10 KB), `package.json` (1 KB) = ~80 KB / 4 ≈ 20k, abaixo do budget de 150k - one builder
