# Subagente de busca em Haiku, medido contra o Explore nativo

## Problem

Pergunta que exige ler muitos arquivos ("rastreie X pelo código", "onde isso é tratado?") é feita hoje pela
sessão principal, no Sonnet. Cada arquivo lido entra no contexto da conversa e é relido a cada turno seguinte,
até o próximo `/clear`. Quem paga é o usuário do Pro: a conversa encarece e a cota de 5h anda mais rápido.

Evidência medida no próprio bench:
- o lado `haiku` (`CLAUDE_CODE_SUBAGENT_MODEL=haiku`) não fez efeito porque **o Claude não delegou nada a
  subagentes** (`bench/README.md`, "O que não mostrou ganho");
- nos transcritos guardados em `bench/results/`, há 0 chamadas ao `Explore`. As únicas delegações são as que o
  prompt pediu (`cctk:spec-reviewer`, o Verifier do `tlc`);
- não se sabe em que modelo o `Explore` roda na assinatura: a pesquisa do kit registra "alias Opus na
  assinatura, segundo a doc" sem conferência.

Logo, ninguém sabe ainda se uma varredura em Haiku sai mais barata que a mesma varredura no Sonnet ou no
`Explore`, nem se o Claude delegaria sozinho. Sem esse número, o subagente não entra (regra do roadmap: medir no
bench antes de mexer em modelo).

Quando isto sair, existirá uma rodada do bench que responde três perguntas: o `busca` em Haiku custa menos por
acerto que o Sonnet sozinho e que o `Explore`? Ele erra mais? O Claude o chama sem o usuário pedir? Se a
resposta passar na regra de entrada, o kit passa a ter o subagente `cctk:busca`, e o GUIA diz quando pedir.

## Flow

Reusa o `bench/run.mjs` inteiro (homes isoladas, `FLOW_PROMPTS`, `modelUsage` por lado, custo por acerto, IC de
Wilson) e as 4 tarefas `question` que já existem. Nenhuma tarefa nova.

1. entra: `--arms toolkit,explore,busca,busca-livre`, as 4 tarefas `question` e `--reps 3` -> `bench/run.mjs` (exists)
2. `makeHome` (exists) - os lados novos são `TOOLKIT_BASED`; `busca` e `busca-livre` copiam
   `bench/agents/busca.md` (door 1) para `<home>/.claude/agents/`
3. `runOnce` (exists) - `FLOW_PROMPTS` (exists) ganha um prefixo para `explore` e outro para `busca`, que mandam
   delegar a varredura ao subagente; `busca-livre` recebe o pedido sem prefixo. Cada execução grava o prompt usado
   e quantas delegações houve para cada `subagent_type`, lidas do transcrito; turnos somam todos os eventos `result`
   (o subagente em segundo plano parte a execução em trechos) e o tempo é o relógio da execução
4. `report` (exists) - acrescenta a linha de delegações por execução e o aviso de modelo do `busca`; os modelos
   por lado já saem
5. out: `bench/results/<data>/report.md`. Se a regra de entrada passar (critério 9), `bench/agents/busca.md`
   vira `plugins/cctk/agents/busca.md` (door 2) e o GUIA e o `bench/README.md` recebem o resultado

## Impact

| Front | What changes |
| --- | --- |
| domain | novo termo: `busca` - subagente só leitura, em Haiku, que varre muitos arquivos e devolve só a conclusão com `arquivo:linha` |
| bench | `ALL_ARMS` e `TOOLKIT_BASED` ganham `explore`, `busca`, `busca-livre`; os lados atuais não mudam de comportamento |
| bench | cada execução ganha o campo `delegations`; relatórios antigos sem o campo continuam abrindo com `--report` |
| kit | nada até a regra de entrada passar. Depois: um agente a mais no plugin, sem mudar settings nem hooks |
| stored data | nada a migrar |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| onde o agente mora antes de aprovado | `bench/agents/busca.md`, copiado só nas homes de `busca` e `busca-livre` | já em `plugins/cctk/agents/`: o marketplace instala da `main`, então o agente chegaria aos usuários antes de medido, e o lado `toolkit` deixaria de ser o kit atual |
| nome que o usuário digita e o GUIA cita | `cctk:busca` (`name: busca`, `model: haiku`, `tools: Read, Grep, Glob`) | `explorador`/`scout`: em inglês ou ambíguo com o `Explore` nativo; renomear depois quebra os pedidos que as pessoas já salvaram |

- Nada mais aqui é difícil de reverter: os lados do bench e o campo `delegations` são internos

## Criteria

### S1: a rodada do bench mede o `busca` contra o Explore e o Sonnet sozinho (P1)

Um comando roda os 4 lados nas 4 tarefas de pergunta e o relatório diz custo por acerto, acertos e delegações.

**Acceptance Criteria**

1. The `bench/run.mjs` SHALL aceitar `explore`, `busca` e `busca-livre` em `--arms`, todos montados como o lado `toolkit`
2. WHEN o lado é `busca` ou `busca-livre` THEN o `makeHome` SHALL copiar `bench/agents/busca.md` para `<home>/.claude/agents/busca.md`, e nos outros lados esse arquivo SHALL não existir
3. The `bench/agents/busca.md` SHALL declarar `model: haiku`, `tools: Read, Grep, Glob` e instruir a devolver só a conclusão com `arquivo:linha`, sem conteúdo integral de arquivo
4. WHEN o lado é `explore` THEN o prompt SHALL pedir para delegar a varredura ao subagente `Explore`; WHEN o lado é `busca` THEN SHALL pedir o subagente `busca`; WHEN o lado é `busca-livre` THEN o prompt SHALL ser o da tarefa, sem acréscimo
5. The `runOnce` SHALL gravar em cada execução `delegations` como `{ <subagent_type>: <quantidade> }`, contando as chamadas da ferramenta `Agent` ou `Task` no transcrito
6. The relatório SHALL ter, por tarefa, a linha "Delegações por execução" com a mediana de chamadas de subagente de cada lado
7. IF nenhuma execução do lado `busca` registrar um modelo Haiku no `modelUsage` THEN o relatório SHALL dizer isso numa linha de atenção, como já faz com o advisor
8. WHEN o `--report` junta uma rodada antiga sem `delegations` THEN o relatório SHALL sair sem erro, tratando o campo ausente como 0 delegações
13. WHEN o transcrito tem mais de um evento `result` THEN a execução SHALL somar os turnos de todos eles, tirar custo e modelos do último e medir o tempo pelo relógio da execução

**Independent test:** `node bench/run.mjs --dry` continua passando; uma rodada com `--reps 1` gera um `report.md` com as linhas dos critérios 6 e 7.

### S2: decidir e, se passar, entregar o `cctk:busca` (P2)

O resultado da rodada vira registro no `bench/README.md` e, se passar, um agente no kit.

**Acceptance Criteria**

9. WHERE a rodada mostra o `busca` com custo por acerto ao menos 15% menor que o menor entre `toolkit` e `explore`, sem menos execuções 100% corretas que o melhor dos dois, the kit SHALL passar a ter `plugins/cctk/agents/busca.md` com o mesmo conteúdo de `bench/agents/busca.md`
10. The `bench/README.md` SHALL registrar o resultado da rodada (custo por acerto, acertos e delegações dos 4 lados, e o modelo em que o `Explore` rodou), em "Resultados" se entrou ou em "O que não mostrou ganho" se não entrou
11. WHERE o `busca` entrou e o `busca-livre` teve mediana de 0 delegações, the GUIA SHALL dizer para pedir "use o subagente busca" em perguntas que exigem ler muitos arquivos
12. IF a regra do critério 9 não passar THEN o `bench/agents/busca.md` SHALL continuar só no bench e nada em `plugins/` SHALL mudar
14. The GUIA SHALL avisar, em "Economizar cota", que no kit o Explore roda em Sonnet e quanto a mais ele custou por acerto na rodada, com link para o benchmark

**Independent test:** ler o `report.md` da rodada, aplicar a regra do critério 9 à mão e conferir que o `bench/README.md` e o `plugins/cctk/agents/` batem com ela.

## Out of scope

| Excluded | Why |
| --- | --- |
| escolher o modelo por tarefa automaticamente | trocar de modelo na sessão invalida o cache (pesquisa do kit); só o subagente tem cache próprio |
| Haiku para edição de código | o pedido é varredura só leitura; edição em Haiku seria outra medição |
| mudar `CLAUDE_CODE_SUBAGENT_MODEL` do kit | afeta todos os subagentes, inclusive o `spec-reviewer`; o `model:` da definição já vence a variável |
| tarefas novas de bench | as 4 `question` já cobrem varredura pequena (`node-*`) e grande (Humanizer, repositório real) |
| hook ou regra no CLAUDE.md que force a delegação | só se o `busca-livre` mostrar que o Claude não delega e o ganho justificar; outra medição |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| execuções por tarefa e lado | `--reps 3` (48 execuções, cerca de US$ 6–10 pelo custo médio das rodadas anteriores) | 2 deu ±20% por tarefa nas rodadas anteriores; 3 é o padrão do `run.mjs` | n |
| regra de entrada para uma peça de economia | ≥15% mais barato por acerto, sem menos acertos (critério 9) | espelha a regra do roadmap para qualidade (mais acertos com no máximo +15% de custo) | n |
| forçar a delegação no prompt dos lados `explore` e `busca` | sim, com prefixo em `FLOW_PROMPTS` | sem pedir, o Claude não delegou em nenhuma rodada anterior; o `busca-livre` mede o caso sem pedir | n |
| ferramentas do `busca` | `Read, Grep, Glob`, sem `Bash` | só leitura de verdade; `Bash` permitiria escrever e ler `.env` fora das regras de leitura | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| comando `node bench/run.mjs` | flags novas e padrões | AC 1 (só valores novos em `--arms`, nenhuma flag nova) |
| comando `node bench/run.mjs` | saída e verbosidade | existing - mesma saída de progresso dos outros lados |
| comando `node bench/run.mjs` | códigos de saída | existing - `--arms` inválido já lança erro |
| comando `node bench/run.mjs` | falha no meio da rodada | existing - execução com erro fica fora das medianas e é listada no relatório |
| documento `report.md` | estrutura | AC 6, AC 7 |
| documento `report.md` | o que o leitor faz em seguida | AC 9 (aplica a regra de entrada) |
| documento `docs/GUIA.md` | estrutura, tom, profundidade | AC 11 (uma linha na seção de economia, no tom atual do GUIA) |
| documento `docs/GUIA.md` | o que o leitor faz em seguida | AC 11 (pede o subagente pelo nome) |
| agente `cctk:busca` | o que devolve | AC 3 |

## Sources

- `bench/README.md` - "Subagentes em Haiku: o Claude não delegou nada a subagentes"
- `docs/ROADMAP.md` - "Medir no bench antes de mexer em modelo" e a regra de +15%
