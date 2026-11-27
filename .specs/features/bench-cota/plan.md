# Benchmarks de cota: security-guidance, advisor em sessão longa e US$ → cota do Pro

## Problem

O kit promete fazer a cota do Pro render mais, mas tudo o que o benchmark mede é custo em dólar da API, e três
coisas que pesam na cota nunca foram medidas:

- O plugin `security-guidance`, que o kit instala, revisa as mudanças no fim de cada resposta e a cada commit
  usando o **Opus** por padrão (`llm.py:191`, `default_review_model`), numa chamada separada com o login do usuário.
  Esse custo não entra no `total_cost_usd` do `claude -p`. Pior: no `-p`, a documentação diz que hooks
  assíncronos são encerrados quando a sessão termina, então a revisão do fim da resposta (`asyncRewake`) provavelmente
  nem roda no bench. O lado `toolkit` parece mais barato do que o kit é no uso interativo.
- O advisor (o Sonnet consultando o Opus) foi medido só em tarefas curtas, em que ele nunca consultou o Opus. O custo
  numa sessão longa e difícil é desconhecido, e é o que o README manda o usuário vigiar.
- Ninguém sabe quanto um dólar de custo da API consome da cota de 5 horas e da semana. Sem isso, "custou 52% menos"
  não diz quantas tarefas a mais cabem na semana.

Evidência: o código do plugin (`hooks/llm.py`, `hooks/hooks.json`), a doc de hooks
(https://code.claude.com/docs/en/hooks, "Run hooks in the background") e um teste de 27/11 (US$ 0,08): o rodapé não
roda no `-p`, e o `/usage` no `-p` responde de graça com "Current session: 45% used" e "Current week (all models):
34% used".

Quando isto sair: o bench diz quanto o `security-guidance` custa por tarefa (com Opus, com Sonnet e sem ele), quanto o
advisor custa e acerta em sessão longa, e quantos dólares de API cabem em 1% da cota de 5 horas e de 7 dias.

## Flow

Reusa `bench/run.mjs` (lados, HOMEs isolados, login copiado, `runOnce`, relatório) e o formato de tarefa de `bench/tasks/`.

1. `bench/run.mjs` (exists) - ganha os lados `sg-sonnet` (revisão do plugin no Sonnet) e `sem-sg` (kit sem o plugin)
2. `bench/run.mjs` (exists) - depois de cada execução nos lados com o plugin, roda a revisão do fim de resposta do
   plugin de forma síncrona sobre o diff do workspace e soma o custo que ela informa (door 1) em `run.sgCost`
3. `bench/tasks/long-*` (new, door 2) - duas ou três tarefas longas com regra que o pedido não diz, para `toolkit` × `sem-advisor`
4. `bench/run.mjs` (exists) - opção `--cota`: lê o `/usage` no `-p` antes e depois da rodada e grava as leituras no relatório
5. out: `report.md` com custo do plugin por execução, custo total (Claude + plugin) e, com `--cota`, US$ por 1% da cota

## Impact

| Front | What changes |
| --- | --- |
| domain | "custo da execução" passa a ter duas partes nos lados com o plugin: a do Claude (`cost`) e a do plugin (`sgCost`); o relatório mostra a soma |
| bench | as rodadas anteriores do lado `toolkit` não têm `sgCost`: o relatório marca a coluna como "não medido" nelas, não como zero |
| bench | `--cota` exige que ninguém use a conta durante a rodada; a leitura é em % inteiro |
| stored data | nada a migrar; `bench/results/` fica fora do git |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside (o bench é ferramenta interna; as flags novas estão em Observable)

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| como o bench mede a revisão do plugin | depois do `claude -p`, `python <plugin>/hooks/security_reminder_hook.py` com a entrada de um evento `Stop` no workspace, `SECURITY_GUIDANCE_DEBUG_LOG` por execução, custo lido do `cost_usd` da linha de métricas que o hook imprime | medir dentro do `-p`: a doc diz que o hook assíncrono é cancelado no fim da sessão, então mediria zero; proxy de rede na API: frágil e depende de certificado |
| tarefas longas novas | `bench/tasks/long-<nome>/` com `task.json`, `repo/`, `hidden/`, `solution/`, como as atuais, e `"kind": "edit"` | um formato novo de tarefa "longa": o `run.mjs` e o `--dry` já sabem provar e corrigir o formato atual |

## Criteria

### S1: custo do security-guidance (P1)

**Acceptance Criteria**

1. The `bench/run.mjs` SHALL aceitar os lados `sg-sonnet` (kit com `SECURITY_REVIEW_MODEL` e `SG_AGENTIC_MODEL` iguais a `claude-sonnet-5-5`) e `sem-sg` (kit sem o plugin `security-guidance`)
2. WHEN uma execução de um lado com o plugin termina THEN o bench SHALL rodar a revisão do fim de resposta do plugin sobre o diff do workspace e gravar em `run.sgCost` o custo em US$ que o plugin informa
3. IF a revisão do plugin não informar custo ou falhar THEN o bench SHALL gravar `sgCost: null` e o motivo em `run.sgError`, sem derrubar a rodada
4. The relatório SHALL mostrar, por lado, o custo do Claude, o custo do plugin e a soma, e marcar "não medido" onde não houver `sgCost`

**Independent test:** uma execução de `node-bugfix` nos três lados mostra `sgCost` > 0 no `toolkit`, menor no `sg-sonnet` e ausente no `sem-sg`.

### S2: advisor em sessão longa (P1)

**Acceptance Criteria**

5. The bench SHALL ter no mínimo 2 tarefas `long-*`, cada uma com repositório de no mínimo 6 arquivos de código, pedido que exige mudar no mínimo 3 deles e no mínimo uma regra que um especialista esperaria e o pedido não diz, coberta por teste oculto
6. The `node bench/run.mjs --dry` SHALL provar cada tarefa `long-*`: testes ocultos falham sem a solução e passam com ela, e o check passa com a solução
7. The relatório SHALL mostrar, por lado, quantas execuções consultaram o Opus (modelo Opus no `modelUsage`)

**Independent test:** `--dry` passa nas tarefas novas.

### S3: US$ → cota (P2)

**Acceptance Criteria**

8. WHERE a flag `--cota` estiver presente the bench SHALL rodar `claude -p "/usage"` antes da primeira e depois da última execução e gravar os % de "Current session" e "Current week (all models)" e os horários de reset
9. IF um reset de janela acontecer entre as duas leituras THEN o relatório SHALL marcar a janela como inválida para a conta
10. The relatório SHALL mostrar, por janela válida, o custo total da rodada dividido pelos pontos de % consumidos (US$ por 1%)
11. IF o `/usage` não devolver os dois % THEN o bench SHALL sair com 1 antes de rodar qualquer tarefa

**Independent test:** `--cota` numa rodada de uma tarefa grava as duas leituras.

## Out of scope

| Excluded | Why |
| --- | --- |
| trocar o padrão do kit para revisão no Sonnet ou tirar o plugin | decisão vem depois dos números, pela regra de entrada do roadmap |
| medir a revisão por commit (`ENABLE_COMMIT_REVIEW`) | só a `security-commit-secret` faz commit; entra se a revisão do fim de resposta pesar |
| prever a cota de outros planos (Max) | o usuário do kit é o Pro |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| revisão do plugin no bench | replay síncrono do hook de `Stop` depois do `-p` | ver Landing | n |
| leitura da cota | `claude -p "/usage"` em HOME com o login copiado | testado em 27/11: funciona, custo US$ 0 | y |
| nome do modelo no `sg-sonnet` | `claude-sonnet-5-5` | pelo login, a chamada vai direto à API, que não aceita apelido (`llm.py`) | n |
| quantas tarefas longas | 2, uma Node e uma .NET | cobrem as duas stacks do kit; uma terceira se o custo por execução for baixo | n |
| rodada de cota | as 25 tarefas no lado `toolkit`, 2 execuções, em horário sem outro uso | ~US$ 5, o bastante para mover vários % da janela de 5 horas | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| comando `node bench/run.mjs` | flags novas e default | AC 1, 8 |
| comando `node bench/run.mjs` | o que imprime ao falhar no meio | AC 3, 11 |
| comando `node bench/run.mjs` | exit codes | AC 11; existing - 0 ok, 1 erro |
| doc `report.md` | estrutura | AC 4, 7, 10 |

## Sources

- Pedido do usuário (27/11/2026): benchmarks 1, 2 e 3
- https://code.claude.com/docs/en/hooks - hooks assíncronos cancelados no fim do `-p`
- `security-guidance` 2.0.21, `hooks/llm.py` e `hooks/security_reminder_hook.py`
