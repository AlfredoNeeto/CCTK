# Testar a API por HTTP no check

## Problem

O check do kit roda build e testes unitários. Um erro de contrato da API (rota que devolve 200 em vez de 404, campo
que mudou de nome, JSON sem o campo que o front usa) passa no teste unitário e só aparece quando alguém chama a API.
O Claude diz "pronto" com a API quebrada para quem consome.

Evidência: pedido do usuário (27/11/2026). Nenhuma tarefa do bench cobre API hoje.

Quando isto sair: num projeto com API, o `/cctk:init-project` cria `http/*.http` com as rotas principais e
asserções de status e corpo, e o check sobe a API, roda os `.http` e derruba a API, tudo dentro dos 3 minutos. Os
mesmos arquivos `.http` abrem no Visual Studio e no VS Code.

## Flow

Reusa o check (`.claude/cctk.json`, `check-gate.js`, aprovação por `cctk trust`) e o `/cctk:init-project`.

1. `/cctk:init-project` (exists) - detecta API (.NET `WebApplication`, Express/Fastify/Nest) e oferece os testes HTTP
2. `plugins/cctk/hooks/api-check.js` (new, door 1) - sobe a API com o comando do projeto, espera a URL responder, roda `npx -y httpyac@6.16.7 send http/*.http --all --bail`, derruba a API e sai com o código do httpyac
3. `.claude/cctk.json` (exists) - o check do projeto passa a ser `<build e testes> && node <plugin>/hooks/api-check.js`
4. `check-gate.js` (exists) - roda o check como hoje, com o limite de 3 minutos

## Impact

| Front | What changes |
| --- | --- |
| domain | o check pode subir um processo (a API); ele tem que morrer em qualquer saída, inclusive no limite de 3 minutos |
| projetos existentes | nada muda até o `init-project` rodar de novo e o usuário aceitar; o check novo pede `cctk trust` de novo, porque o comando muda |
| stored data | nada a migrar |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside (o script é chamado pelo check; contrato em Landing e Observable)

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| ferramenta que roda os `.http` | `npx -y httpyac@6.16.7`, falha em qualquer exit ≠ 0 | Hurl: mais mantido, mas baixa um binário no `postinstall` (proxy corporativo bloqueia) e no Windows exige o VC++ Redistributable; .NET: não existe runner oficial de `.http` |
| contrato do `api-check.js` | `node api-check.js --start "<cmd>" --url <url de saúde> [--wait 60] [--files "http/*.http"]` | o Claude escrever um script por projeto: cada projeto teria um script diferente para manter e aprovar |

## Criteria

### S1: o check sobe e testa a API (P1)

**Acceptance Criteria**

1. WHEN o `api-check.js` roda THEN ele SHALL subir a API com `--start`, esperar `--url` responder qualquer status HTTP por até `--wait` segundos (padrão 60), rodar o httpyac nos `--files` e sair com 0 se o httpyac sair com 0
2. IF a API não responder dentro de `--wait` THEN o `api-check.js` SHALL derrubar o processo e sair com 1, imprimindo as últimas 20 linhas da saída da API
3. IF o httpyac sair com código ≠ 0 THEN o `api-check.js` SHALL sair com 1 e imprimir a saída do httpyac
4. The `api-check.js` SHALL derrubar a árvore de processos da API em toda saída, e a API SHALL ficar no grupo de processos do check, para cair junto quando o check-gate mata a árvore no limite de 3 minutos (exceto um `--start` que vira daemon e sai, limite registrado no código)
5. IF não houver arquivo que bata com `--files` THEN o `api-check.js` SHALL sair com 0 e avisar que não há teste HTTP

### S2: o init-project cria os testes (P1)

**Acceptance Criteria**

6. WHEN o `/cctk:init-project` detecta uma API e o usuário aceita THEN ele SHALL criar `http/<recurso>.http` para as rotas principais, cada requisição com no mínimo uma asserção de status (`?? status ==`) e uma de corpo, e `http/http-client.env.json` com a URL local
7. The `/cctk:init-project` SHALL gravar o check composto e lembrar o usuário de rodar `cctk trust`

### S3: entra só se medir bem (P1)

**Acceptance Criteria**

8. The bench SHALL ter uma tarefa `api-contrato` (Node) em que a mudança pedida, feita do jeito óbvio, passa nos testes unitários e quebra o contrato HTTP que os testes ocultos conferem
9. The peça SHALL entrar no kit só se, na tarefa `api-contrato`, o kit com os testes HTTP acertar mais que sem eles, com no máximo +15% de custo por acerto

**Independent test:** num projeto Express de exemplo, uma rota alterada para devolver 200 onde o `.http` espera 404 faz o check falhar.

## Out of scope

| Excluded | Why |
| --- | --- |
| Schemathesis (testes gerados do OpenAPI) | segundo passo, se a API servir OpenAPI e a medição da S3 mostrar ganho; o check já fica perto dos 3 minutos |
| subir banco de dados para a API | o check usa o banco que o projeto já usa em dev; Docker fica na peça de pipeline |
| teste de carga | não é contrato |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| httpyac ou Hurl | httpyac 6.16.7 fixado | sem binário, roda os `.http` que o time já escreve no VS; risco: última versão de 20 meses atrás e exit codes não documentados (gate em ≠ 0) | n |
| onde ficam os `.http` | pasta `http/` na raiz | um lugar para o check achar; o VS e o VS Code abrem de qualquer pasta | n |
| esperar a API | tentar a URL a cada 1 s | simples e funciona com .NET e Node | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| comando `api-check.js` | flags e padrões | AC 1, 5 |
| comando `api-check.js` | exit codes | AC 1-3, 5 |
| comando `api-check.js` | o que imprime ao falhar no meio | AC 2, 3 |
| comando `api-check.js` | processo filho órfão | AC 4 |
| doc arquivos `http/*.http` | estrutura | AC 6 |

## Sources

- Pedido do usuário (27/11/2026)
- Pesquisa de 27/11: httpyac (https://github.com/AnWeber/httpyac, MIT), Hurl (Apache-2.0), Microsoft Learn sobre `.http` (sem CLI)
