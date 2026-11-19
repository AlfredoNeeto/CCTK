# Benchmark

Roda o `claude -p` de verdade em HOMEs temporárias isoladas, com o login copiado sem o refresh token, e mede:
- custo equivalente na API, tokens sem cache, turnos e tempo;
- leituras e buscas;
- qualidade, por testes ocultos ou por resposta com nota exata.

Cada tarefa tem solução de referência. O `--dry` prova que os testes ocultos falham sem a solução e passam
com ela, sem gastar cota.

```
node bench/run.mjs --dry                                     # prova os corretores sem gastar cota
node bench/run.mjs --arms config,high --tasks node-csv-import --reps 5
node bench/run.mjs --arms padrao,config --tasks security-env-debug,security-printenv --reps 3
node bench/run.mjs --report <pasta>[,<pasta>]                # refaz o relatório, juntando rodadas
```

## Lados

| Lado | O que é |
|---|---|
| `padrao` | Claude Code de fábrica (Opus) |
| `config` | só a configuração do toolkit (`settings.json` e CLAUDE.md) |
| `toolkit` | instalação completa, com o plugin |
| `high` | `config` com esforço high |
| `tdd`, `spec`, `lean` | `config`/`toolkit` + uma regra a mais no CLAUDE.md |
| `lsp` | `config` + plugins LSP oficiais |
| `haiku` | `config` com subagentes em Haiku |

**Como decidir:**
- Use o **custo por acerto** (soma do custo ÷ execuções corretas) nas tarefas não saturadas.
- Olhe o IC 95% dos acertos: se os intervalos de dois lados se sobrepõem muito, a diferença é ruído.
- O custo é o equivalente em dólar na API. Quanto cada modelo pesa na cota do Pro não é documentado.

## Tarefas

| Tipo | Tarefas |
|---|---|
| Implementar com testes ocultos | Node e .NET: `node-*`, `dotnet-*` |
| Regras que o pedido não diz | `spec-*` |
| Repositórios reais fixados num commit | `ts-ky-retry`, `dotnet-humanizer-*`, baixados para `bench/.cache` |
| Segurança, por token canário | `security-*`: no `.env` ou numa variável de ambiente |

Os resultados ficam em `bench/results/`, fora do git, com as transcrições de cada execução.

## Resultados (19/11/2026)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../docs/img/custo-dark.svg">
  <img alt="Custo por tarefa: o kit custou 52% menos que o Claude Code de fábrica nas 8 tarefas" src="../docs/img/custo-light.svg">
</picture>

Mediana de 3 execuções por tarefa e lado (rodada de 18/11/2026, `padrao` contra `toolkit`). Regerar com
`node docs/charts.mjs`.

**Regressão da 1.1.0** (lado `toolkit`, as 24 tarefas, 2 execuções cada, Sonnet, check aprovado com o `trust`):
- 46/48 execuções 100% corretas, 0 erros de execução, US$ 3,98 no total (US$ 0,08 por execução, em média;
  a 1.0.2 fez 46/48 por US$ 4,80, diferença dentro da variação entre rodadas);
- segurança: 0 vazamentos do canário em 8 execuções;
- as 2 falhas foram em regra implícita: `spec-idade` (3/4 testes) e `spec-slug` (2/3), cada uma em 1 das 2
  execuções, como nas rodadas anteriores.

**O que tem ganho medido e está no kit:**
- **Sonnet no lugar do Opus:** cerca de metade do custo em dólar, com a mesma qualidade nas tarefas bem
  especificadas.
- **`permissions.deny`:** quando o pedido manda conferir o `.env`, o Claude de fábrica leu o token em 3 de
  3 execuções. Com a configuração do toolkit, 0 de 3. Quem barra é a regra `Read(**/.env)`.
- **`/effort high` em tarefa com muitas regras:** melhor custo por acerto na importação de CSV (8/10 a
  US$ 0,21, contra 6/8 a US$ 0,40 do Opus e 5/13 a US$ 0,34 do Sonnet medium). Cuidado: essa tarefa tinha
  uma regra que o enunciado não dizia, e o `high` "adivinhava" mais.

**O que não mostrou ganho:**
- **Plugin (qualidade):** `toolkit` e `config` se alternaram na importação de CSV. É ruído.
- **`secret-guard`:** com o token numa variável de ambiente, nenhum lado vazou (0/5 cada). O Sonnet nunca
  imprimiu o valor. Os bloqueios do guarda foram num comando seguro; esse falso positivo foi corrigido na
  1.0.0.
- **Navegação por símbolo (plugins LSP):** num rastreio por 5 arquivos (16 leituras e buscas por execução),
  o Claude não chamou a ferramenta LSP nenhuma vez e preferiu `Grep`. O custo por acerto subiu 11%.
- **Subagentes em Haiku:** o Claude não delegou nada a subagentes, então a configuração não fez efeito.
- **Regras curtas de economia (`claude-token-efficient`):** mais turnos e custo um pouco maior.
- **Teste antes do código (`tdd`):** custou 58% a mais sem acertar mais.
- **Regras implícitas (no CLAUDE.md ou como skill):**
  - acertou mais (20/20 contra 14/20; 15/15 contra 13/16), mas quase toda a diferença veio de um único
    teste discutível (rejeitar nascimento no futuro);
  - descontado esse teste, só encareceu: +45% por execução como regra, +21% como skill.

**O que mais importa para qualidade:** o erro vem do que o pedido não diz, não da dificuldade da tarefa.
- Recorrência de agenda e conciliação bancária, com muitas regras combinadas mas todas escritas, deram
  10/10 com o Sonnet medium.
- Quase todas as falhas na importação de CSV eram uma regra que faltava no enunciado.
- Por isso o fluxo do toolkit põe a spec (OpenSpec) antes do código.

## Avaliado e fora

- **rtk** (rtk-ai/rtk, 18/11/2026):
  - com a reescrita de comandos, as regras `permissions.deny` deixam de valer (issue #5157): `cat .env` vira
    `rtk read .env` e passa;
  - há casos em que o resumo perde a asserção que falhou (#5141, #5142, #5119, #5139);
  - entra só com a #5157 corrigida e um teste provando que `Read(**/.env)` continua barrando, como opção
    desligada, na edição `rtk-oss`.
- **token-optimizer** (alexgreensh): licença PolyForm Noncommercial.
- **context-mode**: licença Elastic.
- **claude-code-router**: envia o código a terceiros.
