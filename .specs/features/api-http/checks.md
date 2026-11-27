# Testar a API por HTTP no check checks

Profile: light
Plan: `.specs/features/api-http/plan.md`

10 checks in 3 slices · 2 one-way doors · 0 open, of which 0 block

Os testes do `api-check.js` ficam em `test/api-check.test.mjs` (entra no `npm test`) e sobem uma API de exemplo
(`node:http`) numa porta livre. Eles trocam o httpyac por um corretor falso com `CCTK_HTTP_RUNNER`, para o `npm test`
não depender de rede; o httpyac de verdade é provado em `test/api-check-httpyac.test.mjs` (fora do `npm test`: o
primeiro uso baixa o pacote). Um teste por check, nomeado `C<n>`.

## Checks

### S1 - o check sobe e testa a API · 3 files · 30 KB · ~8k

**C1** - Com uma API que responde em `--url`, o `api-check.js` roda o corretor sobre os arquivos de `--files` e sai com 0 quando o corretor sai com 0; com o httpyac de verdade, um `.http` com `?? status == 200` contra a API passa e um com `?? status == 404` numa rota que devolve 200 falha (AC 1)
Proof: `node --test --test-name-pattern "^C1 " test/api-check.test.mjs`
Proof: `node --test --test-name-pattern "^C1 " test/api-check-httpyac.test.mjs`

**C2** - Com um `--start` que nunca abre a porta e `--wait 2`, o `api-check.js` sai com 1 em menos de 10 s, e a saída de erro traz "não respondeu" e a última linha que a API imprimiu (AC 2)
Proof: `node --test --test-name-pattern "^C2 " test/api-check.test.mjs`

**C3** - Com o corretor saindo com 1, o `api-check.js` sai com 1 e imprime a saída do corretor (AC 3)
Proof: `node --test --test-name-pattern "^C3 " test/api-check.test.mjs`

**C4** - Depois de o `api-check.js` terminar (passando ou falhando), e depois de o processo dele ser derrubado com a árvore inteira, como o check-gate faz no limite, a porta da API não aceita mais conexão (AC 4)
Proof: `node --test --test-name-pattern "^C4 " test/api-check.test.mjs`

**C5** - Sem arquivo que bata com `--files`, o `api-check.js` sai com 0, diz que não há teste HTTP e não sobe a API (AC 5)
Proof: `node --test --test-name-pattern "^C5 " test/api-check.test.mjs`

**C6** - O `check-gate` troca `${CLAUDE_PLUGIN_ROOT}` no comando do check pela pasta do plugin antes de rodar, e o bench faz o mesmo no check das tarefas (AC 1)
Proof: `node --test --test-name-pattern "^C6 " test/api-check.test.mjs`
Proof: `node bench/run.mjs --dry --tasks api-contrato` (o check da tarefa usa `${CLAUDE_PLUGIN_ROOT}`)

### S2 - o init-project cria os testes · 1 file · 12 KB · ~3k

**C7** - A seção de integrações do `init-project/SKILL.md` tem o passo de testes HTTP, que manda criar `http/<recurso>.http` com `?? status ==` e uma asserção de corpo por requisição, e `http/http-client.env.json` com a URL local (AC 6)
Proof: `node --test --test-name-pattern "^C7 " test/api-check.test.mjs`

**C8** - O mesmo passo grava o check composto com `node "${CLAUDE_PLUGIN_ROOT}/hooks/api-check.js" --start` e manda lembrar o `cctk trust` (AC 7)
Proof: `node --test --test-name-pattern "^C8 " test/api-check.test.mjs`

### S3 - entra só se medir bem · 1 task · 30 KB · ~8k

**C9** - `node bench/run.mjs --dry --tasks api-contrato` sai com 0: sem a solução os testes ocultos (que chamam a API por HTTP) falham, com a solução passam, e o check, que roda o `api-check.js`, passa (AC 8)
Proof: `node bench/run.mjs --dry --tasks api-contrato`

**C10** - Numa rodada real de `api-contrato` com os lados `toolkit` (com os testes HTTP no check) e `sem-http` (sem eles), o `toolkit` acerta mais com no máximo +15% de custo por acerto; se não, o passo de testes HTTP sai do `init-project` (AC 9)
Proof: `BENCH_ROUND=<rodada> node --test --test-name-pattern "^C10 " test/api-check-rodada.test.mjs`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| saídas do api-check (5) | passa C1 · API não sobe C2 · corretor falha C3 · sem arquivos C5 · derrubado no limite C4 | - |
| door: httpyac fixado (1) | C1 (prova com o httpyac de verdade) | - |
| door: contrato do api-check.js (1) | C1 C2 C3 C4 C5 | - |

- C1 tem duas provas: a do `npm test`, com o corretor falso, e a do httpyac de verdade, fora dele (rede no primeiro uso)
- C10 depende de uma rodada real (custo)

## Swept

- validation: C5 - sem arquivos não sobe nada
- failure modes: C2 C3 - API que não sobe e teste que falha saem com 1 e mostram o motivo
- idempotency: n/a - cada check sobe e derruba a sua API
- authorization: n/a - a API local de dev; credencial fica no `http-client.env.json`, fora do escopo
- concurrency: C4 - API derrubada no fim, para o próximo check achar a porta livre
- data lifecycle: n/a - nada persiste
- dependency failure: C1 - httpyac fixado na versão; sem rede no primeiro uso, o npx falha e o check reprova com a mensagem dele
- state transitions: n/a - sem estado
- observability: C2 C3 - a saída diz se foi a API que não subiu ou o teste que falhou

## Handoff

- **Settled mid-build:** o `api-check.js` passa `--env dev` ao httpyac quando existe `http/http-client.env.json`, para o `{{baseUrl}}` resolver (provado com o httpyac de verdade); o C6 mata o mutante "check-gate sem a troca" (saída 2 contra 0 esperado)

- S1-S3 tocam `api-check.js` (novo, ~4 KB), `check-gate.js` (6 KB), `init-project/SKILL.md` (12 KB), `bench/run.mjs`
  (30 KB), a tarefa `api-contrato` (~15 KB), testes (~10 KB) = ~77 KB / 4 ≈ 19k, abaixo do budget de 150k - one builder
