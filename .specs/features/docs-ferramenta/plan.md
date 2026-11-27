# Documentação como produto: README, situações, prompts e gráficos do benchmark

## Problem

O README do cctk funciona como página de pacote, mas não como porta de entrada de uma ferramenta: não tem um mapa
da documentação, não responde as dúvidas de quem está decidindo instalar (perguntas frequentes), e a tabela de
comandos não lista todas as flags que a CLI aceita (falta `--yes`). No npmjs.com, as imagens do README são
caminhos relativos dentro de `<picture>`, e o pacote não publica `docs/`; a reescrita de links do npm cobre
links e `<img>` de Markdown, e não há garantia para `srcset` em HTML cru, então o gráfico pode não aparecer lá.

Quem já instalou tem o GUIA (primeiro uso e duas trilhas) e o guia de prompts (princípios), mas nada organizado
pela situação concreta do dia: "caí num projeto que não conheço", "tenho um stack trace", "o requisito veio em
PDF", "quero consultar o banco", "o card está no Azure DevOps", "quero conferir a tela". Várias ferramentas do kit
(DBHub, Playwright CLI, context7, `security-guidance`, `/cctk:audit`, `cctk stats`) aparecem só numa linha de
tabela, sem dizer quando e como usar.

O guia de prompts ensina princípios, mas não entrega um modelo pronto por tipo de pedido (bug, feature, pergunta,
refatoração, revisão, a partir de documento), nem diz o que fazer quando o Claude saiu do rumo.

O benchmark tem 12 experimentos decididos (entrou ou ficou de fora) e 4 rodadas de regressão por versão, e só dois
gráficos. A decisão de cada experimento está espalhada em parágrafos; quem quer saber "por que o kit é assim"
precisa ler o `bench/README.md` inteiro. Ele também abre pelo método, não pelo resultado.

Evidência: pedido do mantenedor (27/11/2026). Não há issue nem métrica de dúvida de usuário.

Quando isto sair: o README é uma página de ferramenta (o que é, resultado, instalar, mapa da documentação,
comandos com flags, perguntas frequentes) com gráfico que aparece também no npm; existe um guia por situação com
prompt pronto e o que conferir; o guia de prompts tem modelos por tipo de pedido e como corrigir o rumo; e o
benchmark abre com um resumo e dois gráficos novos: o placar dos experimentos e a estabilidade entre versões.

## Flow

Reusa o GUIA, o PROMPTS, o gerador `docs/charts.mjs` (sem dependência nova) e o par de testes
`test/docs.test.mjs` / `test/docs-conteudo.test.mjs` com `test/docs-lib.mjs`. A estrutura segue o Diátaxis:
tutorial (GUIA, primeiro uso), guias por objetivo (GUIA trilhas + SITUACOES), referência (README comandos) e
explicação (benchmark).

1. leitor entra pelo `README.md` (exists) - ganha "Documentação" (mapa), comandos com todas as flags,
   "Perguntas frequentes" e imagens com URL absoluta do GitHub
2. `docs/SITUACOES.md` (new, door 1) - uma receita por situação: quando, prompt pronto, comandos do kit, o que
   conferir; linkado do README e do índice do GUIA
3. `docs/GUIA.md` (exists) - o índice "O que você quer fazer?" ganha a linha para as situações; nenhuma âncora muda
4. `docs/PROMPTS.md` (exists) - ganha "Modelos por situação" e "Corrigir o rumo"
5. `docs/charts.mjs` (exists) - passa a gerar também `experimentos-{light,dark}.svg` e `versoes-{light,dark}.svg`
6. `bench/README.md` (exists) - abre com "Resumo" e exibe os dois gráficos novos; a âncora
   `#resultados-19112026` fica
7. `test/docs.test.mjs` (exists) - ganha os testes desta feature e um verificador de links relativos em todos os
   `.md` da documentação

## Impact

| Front | What changes |
| --- | --- |
| docs | âncoras existentes do GUIA, do PROMPTS e do `bench/README.md` ficam; seções novas são aditivas. Quem linka hoje: README, skills (`plugins/cctk/skills/*/SKILL.md`), GUIA, PROMPTS |
| docs | README muda `src`/`srcset` das imagens para `https://raw.githubusercontent.com/AlfredoNeeto/cctk/main/docs/img/...`: no GitHub aparece igual; um fork vê a imagem do repositório original |
| testes | C1-C21 do `docs-uso` continuam valendo e não são editados; os novos testes entram nos mesmos arquivos |
| pacote npm | `package.json` `files` não muda: `docs/` segue fora do pacote, e o README aponta para o GitHub |
| stored data | nada a migrar |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| novo arquivo de doc que vira link externo | `docs/SITUACOES.md` | seção dentro do GUIA: com 12+ receitas o GUIA passaria de 450 linhas e deixaria de ser o "leva 5 minutos para ler" que ele promete na primeira linha |

- Nada mais é difícil de reverter: seções novas são aditivas, e as âncoras atuais ficam (critério 9)

## Criteria

### S1: README de ferramenta (P1)

Quem chega pelo GitHub ou pelo npm entende o que é, vê o resultado, instala e acha o resto da documentação.

**Acceptance Criteria**

1. The README SHALL ter uma seção "Documentação" antes de "Comandos" com uma linha para cada: primeiro uso (`docs/GUIA.md#primeiro-uso`), situações (`docs/SITUACOES.md`), prompts (`docs/PROMPTS.md`), guia completo (`docs/GUIA.md`) e benchmark (`bench/README.md`), cada linha dizendo em uma frase para quando serve
2. The tabela de comandos do terminal no README SHALL citar toda flag que o `cctk` aceita (as da linha `Uso:` de `cli.mjs`: `--dry-run` e `--yes`)
3. The README SHALL ter uma seção "Perguntas frequentes" com no mínimo 5 perguntas, cada resposta com no máximo 3 linhas e sem afirmação que não esteja no repositório
4. The todo `src` e `srcset` de imagem do README SHALL começar por `https://raw.githubusercontent.com/AlfredoNeeto/cctk/main/`
5. The README SHALL ter no máximo 200 linhas

**Independent test:** abrir o README no GitHub e no preview do npm (`npm pack --dry-run` não renderiza; conferir o `<img>` absoluto).

### S2: guia por situação (P1)

**Acceptance Criteria**

6. The repositório SHALL ter `docs/SITUACOES.md` com no mínimo 12 situações, cada uma (`###`) com as partes "Quando", um bloco ```` ```text ```` com o prompt pronto, e "Confira"
7. The `docs/SITUACOES.md` SHALL cobrir, cada uma em ao menos uma situação: `/cctk:convert`, `/cctk:audit`, `/cctk:prototipo`, `/cctk:init-project`, `cctk secret`, `cctk ado`, `cctk stats`, DBHub, Playwright, context7, `security-guidance` e o OpenSpec
8. IF uma situação citar um comando `cctk <sub>` ou uma skill `/cctk:<nome>` THEN o `<sub>` SHALL existir em `cli.mjs` e o `<nome>` SHALL existir em `plugins/cctk/skills/`
9. The índice "O que você quer fazer?" do GUIA e a seção "Documentação" do README SHALL linkar `SITUACOES.md`, e as âncoras do GUIA citadas hoje SHALL continuar existindo

**Independent test:** escolher 3 situações e seguir cada uma num projeto de exemplo sem abrir outra página.

### S3: prompts por situação (P2)

**Acceptance Criteria**

10. The `docs/PROMPTS.md` SHALL ter a seção "Modelos por situação" com no mínimo 6 modelos (bug, feature, pergunta sobre o código, refatoração, revisão, a partir de documento), cada um num bloco ```` ```text ````
11. The `docs/PROMPTS.md` SHALL ter a seção "Corrigir o rumo" com no mínimo 3 ações (parar com `Esc`, voltar com `/rewind` ou `Esc Esc`, e `/clear` com um pedido reescrito depois de duas correções sem efeito), cada uma com link para a documentação do Claude Code
12. The todo link `https://` de `docs/PROMPTS.md` SHALL continuar sendo de domínio da Anthropic (o C10 do `docs-uso` segue valendo) e cada link novo SHALL ter sido aberto e conferido no build

**Independent test:** reescrever 3 pedidos reais com os modelos.

### S4: gráficos do benchmark (P2)

**Acceptance Criteria**

13. The `node docs/charts.mjs` SHALL gerar `experimentos-{light,dark}.svg`: uma linha por mudança testada que tem número de custo, a variação de custo contra a base em %, com a cor dizendo "entrou no kit" ou "ficou de fora", ordenado pela variação, e cada linha com a métrica usada (por execução ou por acerto) no rótulo
14. The cada valor dos gráficos de experimentos e de versões SHALL vir de um número escrito no `bench/README.md` (o par base/lado em US$ ou a variação em %), e o comentário de `charts.mjs` SHALL citar a seção de onde veio
15. The `node docs/charts.mjs` SHALL gerar `versoes-{light,dark}.svg` com uma marca por rodada de regressão (1.0.2, 1.1.0, 1.1.1, 1.4.0): custo por execução e execuções corretas rotuladas, todas nas mesmas 24 tarefas, e o subtítulo dizendo isso
16. The cada SVG novo SHALL ter `role="img"` e `aria-label` com as grandezas e a conclusão, e as cores SHALL vir de `THEMES`: o azul de destaque validado pela dataviz, e o cinza de contexto (`muted`) passando no contraste e na separação CVD do validador (o piso de croma não se aplica a uma cor que é cinza de propósito)
17. The `bench/README.md` SHALL abrir com a seção "Resumo" (no máximo 8 linhas, antes de "Lados") e exibir `experimentos-*.svg` e `versoes-*.svg` com `<picture>` claro/escuro

**Independent test:** `node docs/charts.mjs` e abrir os SVGs nos dois temas.

### S5: links que não quebram (P2)

**Acceptance Criteria**

18. IF um link relativo (`](caminho)` ou `src=`/`srcset=` relativo) em `README.md`, `docs/*.md` ou `bench/README.md` apontar para um arquivo que não existe THEN o `npm test` SHALL falhar citando o arquivo e o link
19. IF um link `arquivo.md#âncora` entre esses arquivos apontar para uma âncora que não existe THEN o `npm test` SHALL falhar citando o link

**Independent test:** apagar um título do PROMPTS e ver o `npm test` falhar.

## Out of scope

| Excluded | Why |
| --- | --- |
| tradução para inglês | público atual é pt-BR (Azure DevOps on-prem, regras de negócio brasileiras) |
| site de documentação (GitHub Pages, Docusaurus) | o GitHub renderiza os `.md`; um site é mais uma coisa para manter |
| CHANGELOG.md e logo | não pedidos; o histórico está nos commits e nas rodadas do bench |
| GIF ou vídeo novo de demo | o `demo/toolkit.gif` já cobre a instalação |
| rodar o benchmark de novo | os gráficos usam números já medidos e escritos no `bench/README.md` |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| situações em arquivo novo ou no GUIA | arquivo novo `docs/SITUACOES.md` | ver Landing; o GUIA continua sendo o tutorial e as trilhas; usuário seguiu a recomendação | y |
| idioma | só pt-BR | mesma decisão do `docs-uso`; o kit fala de Azure DevOps on-prem e regra de negócio brasileira; usuário seguiu a recomendação | y |
| métrica do gráfico de experimentos | custo por acerto quando o `bench/README.md` dá o par; senão custo por execução, marcado no rótulo | misturar sem marcar engana; deixar de fora esconde metade dos experimentos | n |
| fluxos de spec (+350% e +527%) no gráfico de experimentos | eixo cortado em +100% com o valor escrito na ponta da barra | numa escala linear eles achatam todas as outras barras | n |
| imagens do README no npm | URL absoluta do `raw.githubusercontent.com` | a reescrita de links do npm não é documentada para `srcset` em HTML | n |
| fonte de padrão de mercado | Diátaxis para a divisão dos documentos; para o README de CLI, frase de uma linha, demo, instalar, uso com exemplos, flags documentadas | é o que as referências pesquisadas concordam | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| doc `README.md` | estrutura | AC 1, 3, 5 |
| doc `README.md` | tom e profundidade | existing - frases curtas, pt-BR, números com data |
| doc `README.md` | o que o leitor faz em seguida | AC 1 (mapa da documentação) |
| doc `SITUACOES.md` | estrutura | AC 6 |
| doc `SITUACOES.md` | tom | existing - o do GUIA |
| doc `SITUACOES.md` | o que o leitor faz em seguida | AC 6 ("Confira") e AC 9 |
| doc `PROMPTS.md` | estrutura, próximo passo | AC 10, 11 |
| doc `bench/README.md` | estrutura, profundidade | AC 17 |
| gráfico `experimentos-*.svg` | leitura sem legenda externa | AC 13, 16 |
| gráfico `versoes-*.svg` | leitura sem legenda externa | AC 15, 16 |
| gráficos | tema claro/escuro | AC 16, 17 |
| comando `node docs/charts.mjs` | saída, flags, exit code | existing - sem flags, imprime os arquivos gerados |

## Sources

- Pedido do mantenedor (27/11/2026): README no padrão de mercado, gráficos do benchmark, prompts e guia por situação
- Diátaxis, https://diataxis.fr/start-here/ - os quatro tipos de documento
- npm, "nicely presented markup", https://blog.npmjs.org/post/109508231330/nicely-presented-markup.html - reescrita de links relativos para o GitHub
