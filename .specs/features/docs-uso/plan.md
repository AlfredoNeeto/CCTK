# Documentação de uso, guia de prompts e gráficos do benchmark

## Problem

Quem instala o cctk encontra as peças descritas, mas não um caminho: o README tem 4 "Primeiros passos" e o
GUIA é organizado por assunto (statusline, check, cofre...), não pelo que a pessoa quer fazer. Para
desenvolver, prototipar ou especificar, ela tem que montar a sequência sozinha a partir de seções soltas — e
o fluxo protótipo → especificação → OpenSpec está numa célula de tabela.

O guia de pedido bom hoje são 3 linhas em "Tarefa pequena", sem fonte. O benchmark mostra que o erro vem "do
que o pedido não diz", então escrever o pedido é a alavanca mais barata que o usuário tem, e não há material
sobre isso.

A seção do cofre diz os comandos, mas não diz onde a variável chega (só no shell do Claude; não no MCP, não
no app que você roda fora), nem como usar num projeto real. Quem tenta usar `$NOME` num MCP ou num
`npm run dev` da IDE fica sem resposta.

O gráfico do README é de barras agrupadas: 16 barras para mostrar 8 diferenças, e o único gráfico do
benchmark. O resultado dos fluxos de spec (mesmo acerto, 5–7× o custo) só existe em tabela.

Evidência: nenhuma além do pedido do mantenedor; não há issue nem métrica de dúvida de usuário.

Quando isto sair: a pessoa abre o GUIA, escolhe "quero desenvolver / prototipar / especificar" e segue
passos numerados com um exemplo; tem um guia de prompts com fontes da Anthropic; sabe exatamente onde o
cofre funciona; e vê em um gráfico quanto o kit economiza por tarefa.

## Flow

Reusa o GUIA existente (reorganizado, sem duplicar conteúdo), o gerador `docs/charts.mjs` sem dependência
nova, e o teste de links de `test/toolkit.test.mjs`.

1. leitor entra pelo `README.md` (exists) - "Primeiros passos" aponta para as trilhas do GUIA
2. `docs/GUIA.md` (exists) - ganha um índice por objetivo e três trilhas numeradas (primeiro uso,
   desenvolver, prototipar e especificar); seções de referência atuais ficam abaixo, sem perder conteúdo
3. `docs/PROMPTS.md` (new, door 1) - guia de prompts com fontes, linkado do GUIA e do README
4. `docs/GUIA.md` (exists) - seção do cofre reescrita a partir do comportamento de `plugins/cctk/hooks/secrets.js` e `vault.js`
5. `docs/charts.mjs` (exists) - passa a gerar `custo-{light,dark}.svg` como dumbbell e
   `fluxos-{light,dark}.svg` (custo × acerto dos fluxos de spec); out: SVGs em `docs/img/`, citados no
   README e no `bench/README.md`
6. `test/toolkit.test.mjs` (exists) - o teste de links passa a cobrir `docs/PROMPTS.md` e `bench/README.md`

## Impact

| Front | What changes |
| --- | --- |
| domain | nenhum termo novo; "trilha" é só título de seção |
| docs | âncoras do GUIA mudam se seções forem renomeadas - quem linka hoje: `README.md` (`#tokens-e-senhas-cofre`, `#azure-devops-server`) e o próprio GUIA; as skills não linkam âncoras |
| docs | `docs/img/custo-*.svg` mantém o nome; o desenho muda. README e `bench/README.md` seguem apontando para ele |
| stored data | nada a migrar |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| novo arquivo de doc que vira link externo | `docs/PROMPTS.md` | seção dentro do GUIA: o guia de prompts é longo e com fontes; dentro do GUIA quebraria o "leva 5 minutos para ler" |

- Nada mais aqui é difícil de reverter: âncoras novas são aditivas e as atuais ficam (critério 4)

## Criteria

### S1: passo a passo do primeiro uso (P1)

Quem acabou de instalar segue uma lista numerada até o primeiro pedido feito.

**Acceptance Criteria**

1. The GUIA SHALL abrir com um índice "O que você quer fazer?" com três entradas: primeiro uso, desenvolver, prototipar e especificar, cada uma linkando a sua trilha
2. The trilha "Primeiro uso" SHALL ter passos numerados de `cctk install` até o primeiro pedido concluído, incluindo `/cctk:init-project`, commit, `cctk trust` e o que conferir na statusline
3. The README "Primeiros passos" SHALL linkar para a trilha "Primeiro uso" do GUIA
4. The GUIA SHALL manter as âncoras hoje citadas pelo README e pelas skills (`#tokens-e-senhas-cofre`, `#azure-devops-server`, `#o-check-antes-de-encerrar`, `#feature-ou-bug-com-regra-de-negócio`)

**Independent test:** seguir a trilha num projeto vazio sem abrir outra seção.

### S2: desenvolver (P1)

**Acceptance Criteria**

5. The trilha "Desenvolver" SHALL dizer em uma tabela quando pedir direto e quando usar o OpenSpec, com o critério de decisão (tamanho e regra de negócio) e o custo medido (~5×)
6. The trilha "Desenvolver" SHALL ter um exemplo completo do caminho OpenSpec: o pedido de entrada, o que revisar em Dimensões, e os comandos na ordem até o archive

**Independent test:** dar a trilha a alguém e pedir que diga qual caminho usaria para 3 pedidos de exemplo.

### S3: prototipar e especificar (P1)

**Acceptance Criteria**

7. The trilha "Prototipar e especificar" SHALL ter passos numerados: pedir o protótipo, ajustar, gerar a especificação, e levar a especificação ao OpenSpec citando `especificacao.md`
8. The trilha SHALL manter os números medidos e os avisos de dados reais que a seção "Protótipo de tela" tem hoje

**Independent test:** seguir os passos de um protótipo de 1 tela até o `/openspec-propose`.

### S4: guia de prompts (P2)

**Acceptance Criteria**

9. The repositório SHALL ter `docs/PROMPTS.md` com princípios de prompt, cada um com um exemplo ❌/✅ no contexto do kit e o link da fonte
10. The `docs/PROMPTS.md` SHALL citar só fontes da Anthropic (docs da plataforma e do Claude Code) ou do benchmark deste repositório, e cada link SHALL ter sido aberto e conferido no build
11. The `docs/PROMPTS.md` SHALL incluir uma seção de prompts para Claude Code (contexto com `@arquivo`, critério de pronto verificável, `/clear` entre assuntos, planejar antes em tarefa grande)
12. The GUIA e o README SHALL linkar `docs/PROMPTS.md`

**Independent test:** cada princípio tem fonte clicável e exemplo.

### S5: cofre (P2)

**Acceptance Criteria**

13. The seção do cofre SHALL explicar o caminho do valor: `cctk secret set` → cofre do sistema → `/clear` ou sessão nova → exportado só para o shell que o Claude usa → `$NOME` no comando
14. The seção SHALL dizer onde a variável NÃO chega (MCPs, programas que você roda fora do Claude, a IDE) e o que fazer em cada caso
15. The seção SHALL ter um exemplo de uso num projeto (token de API num `curl` ou num script de teste) em bash e em PowerShell
16. The seção SHALL dizer como trocar um valor (rodar `set` de novo sobrescreve) e manter os limites atuais (só credencial de dev; `/` e `\` no Windows)

**Independent test:** gravar `API_TOKEN`, abrir sessão, pedir um `curl` que usa o token, sem o valor aparecer.

### S6: gráficos do benchmark (P2)

**Acceptance Criteria**

17. The `node docs/charts.mjs` SHALL gerar `custo-{light,dark}.svg` como gráfico de halteres: um ponto de fábrica e um do kit por tarefa, ligados, ordenados pela economia, com o rótulo de % e um subtítulo com o total
18. The `node docs/charts.mjs` SHALL gerar `fluxos-{light,dark}.svg`: custo por execução (eixo x) × execuções corretas (eixo y) para `toolkit`, `openspec` e `tlc`, com os valores rotulados em cada ponto
19. The cada SVG SHALL ter `role="img"` e `aria-label` que diga as duas grandezas comparadas e a conclusão
20. The cores SHALL passar no validador de paleta da skill dataviz nos dois modos
21. The `bench/README.md` SHALL exibir `fluxos-*.svg` na seção "Fluxos de spec de ponta a ponta", com `<picture>` claro/escuro como o gráfico atual

**Independent test:** `node docs/charts.mjs` e abrir os 4 SVGs nos dois temas.

## Out of scope

| Excluded | Why |
| --- | --- |
| tradução para inglês | público atual é pt-BR |
| gráfico interativo ou página publicada | o README do GitHub só mostra imagem estática |
| gráficos das demais rodadas (1.1.1, 1.4.0, advisor) | o pedido é melhorar a apresentação; esses números estão em texto e não têm par direto para comparar |
| vídeo ou GIF novo de demo | o `demo/toolkit.gif` já cobre a instalação |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| passo a passo em arquivo novo ou no GUIA | trilhas dentro do GUIA, conteúdo atual vira referência abaixo | um só lugar para o usuário; arquivo novo duplicaria o GUIA | n |
| quais gráficos | halteres no lugar das barras agrupadas + custo × acerto dos fluxos de spec | halteres mostram 8 diferenças com 8 marcas em vez de 16 barras; os fluxos são o resultado mais contraintuitivo e hoje só existem em tabela | n |
| escala do eixo de custo nos fluxos | linear | só 3 pontos e faixa de 0,10 a 0,71; log esconderia que é 7× | n |
| MCP recebe o cofre? | não recebe; conferir no build pela doc de `CLAUDE_ENV_FILE` antes de escrever | `secrets.js` grava só no `CLAUDE_ENV_FILE`, que alimenta o shell do Claude | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| doc `GUIA.md` | estrutura | AC 1, 2, 5, 7 |
| doc `GUIA.md` | tom e profundidade | existing - frases curtas, tabela "Para / Faça", pt-BR |
| doc `GUIA.md` | o que o leitor faz em seguida | AC 1 (índice por objetivo) |
| doc `PROMPTS.md` | estrutura | AC 9, 11 |
| doc `PROMPTS.md` | tom | existing - mesmo do GUIA |
| doc `PROMPTS.md` | o que o leitor faz em seguida | AC 12 (volta para a trilha) |
| doc seção cofre | estrutura, próximo passo | AC 13-16 |
| gráfico `custo-*.svg` | leitura sem legenda externa | AC 17, 19 |
| gráfico `fluxos-*.svg` | leitura sem legenda externa | AC 18, 19 |
| gráficos | tema claro/escuro | AC 20, 21 |
| comando `node docs/charts.mjs` | saída, flags, exit code | existing - sem flags, imprime os arquivos gerados |

## Sources

- Pedido do mantenedor (27/11/2026): os seis pontos
- Anthropic, Prompting best practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview (conferir no build)
- Referência de gráfico de halteres: https://www.highcharts.com/blog/tutorials/why-you-need-to-start-using-dumbbell-charts/
