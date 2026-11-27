# Do protótipo aprovado ao código

## Problem

Depois que o cliente aprova o protótipo do `/cctk:prototipo`, as telas precisam virar código no framework do projeto
(Angular, React ou Flutter). Hoje não há caminho no kit: o Claude lê os HTML e reescreve cada tela do zero, inclusive
o estilo, que já existe pronto no protótipo (`estilo.css`, 145 linhas, e o `tema.css` com as cores do cliente). É
trabalho repetido que gasta cota, e o resultado pode sair com outra cara: cor, espaçamento e componente diferentes do
que o cliente aprovou.

Evidência: pedido do usuário (27/11/2026), que pôs esta peça em primeiro; o catálogo fixo de classes do protótipo
(`plugins/cctk/skills/prototipo/SKILL.md`, seção 3). Não há medição do custo atual de portar uma tela.

Quando isto sair: com o protótipo aprovado, o usuário pede "leve o protótipo para o código" e o kit (1) gera por script,
sem gastar cota, o tema do framework a partir do `tema.css`, (2) leva o `estilo.css` para o projeto web como estilo
global com os mesmos nomes de classe, e (3) dá ao Claude o mapa de cada classe do catálogo para o componente do
framework. O Claude só monta as telas e liga os dados.

## Flow

Reusa a skill `prototipo` (o script `render.mjs`, comandos `R ...`) e o catálogo de classes que ela já define.

1. pedido "leve o protótipo para o código" -> `plugins/cctk/skills/prototipo/SKILL.md` (exists) - nova seção "Levar ao código"
2. `render.mjs` (exists) - novo comando `R codigo <angular|react|flutter>` (door 1): lê `prototipo/estilo.css` e `prototipo/tema.css`
   e grava o tema no projeto
3. `plugins/cctk/skills/prototipo/references/codigo-<framework>.md` (new, no door - placement) - mapa classe do catálogo -> componente
4. o Claude cria os componentes base uma vez e monta cada tela com eles; o check do projeto confere build e testes
5. out: telas no código do projeto com o mesmo visual do protótipo

## Impact

| Front | What changes |
| --- | --- |
| domain | "levar ao código" é uma etapa nova da skill `prototipo`, depois da especificação; nada muda nas etapas atuais |
| projeto do usuário | ganha um arquivo de tema; no web, o `estilo.css` e o `tema.css` com escopo `.prototipo`, então as telas que já existem não mudam de cara; o comando não sobrescreve arquivo existente |
| stored data | nada a migrar |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside (comando da skill, documentado em Observable)

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| onde o tema gerado vai em cada framework | Angular: `src/styles/prototipo.css` (o `estilo.css` + `tema.css`) e a linha em `angular.json` `styles`; React: `src/styles/prototipo.css` importado em `src/main.*`; Flutter: `lib/tema/tema_prototipo.dart` com `ThemeData` | gerar componentes prontos por script para os três frameworks: são ~12 componentes × 3 frameworks para manter, e quebram a cada versão do framework |
| mesma classe no web, com escopo | as telas Angular/React usam os nomes de classe do catálogo (`btn primario`, `tabela`, `campo`) dentro de um contêiner `class="prototipo"`; o script reescreve cada seletor para valer só ali (`.btn` → `.prototipo .btn`, `:root` e `body` → `.prototipo`, `body.mobile` → `.prototipo.mobile`) | estilo global: `.btn`, `.card` e `.modal` colidem com o estilo que o app já tem (Bootstrap usa os mesmos nomes); prefixar as classes (`.proto-btn`): obriga o Claude a renomear tudo nas telas, que é o custo que a peça quer tirar; Tailwind ou CSS modules: reescrever todo o estilo |

## Criteria

### S1: tema gerado por script (P1)

**Acceptance Criteria**

1. WHEN o usuário roda `R codigo angular` num projeto com `angular.json` THEN o script SHALL gravar `src/styles/prototipo.css` com as regras de `estilo.css` seguidas das de `tema.css`, cada seletor com escopo `.prototipo`, e acrescentar esse caminho ao `styles` do projeto no `angular.json`
10. The CSS gerado SHALL não ter regra que valha fora de `.prototipo`, exceto `@keyframes`
2. WHEN o usuário roda `R codigo react` num projeto com `package.json` que depende de `react` THEN o script SHALL gravar `src/styles/prototipo.css` e dizer qual linha de `import` pôr no arquivo de entrada
3. WHEN o usuário roda `R codigo flutter` num projeto com `pubspec.yaml` THEN o script SHALL gravar `lib/tema/tema_prototipo.dart` com um `ThemeData` cujo `ColorScheme` usa as cores `--cor`, `--superficie`, `--fundo`, `--erro` e `--texto` do `tema.css` (o `tema.css` vence o `estilo.css`)
4. IF o arquivo de destino já existir THEN o script SHALL sair com 1 sem sobrescrever e dizer o caminho
5. IF não houver `prototipo/tema.css` ou o framework pedido não bater com o projeto THEN o script SHALL sair com 1 e dizer o que falta

### S2: mapa do catálogo (P1)

**Acceptance Criteria**

6. The skill SHALL ter um `references/codigo-<framework>.md` para Angular, React e Flutter, cada um com uma linha para cada componente do catálogo (menu, topo, cards, filtros, caixa, tabela, form/campo, botões, selos, avisos, vazio, carregando, abas, modal, barras, login, mobile)
7. The seção "Levar ao código" do `SKILL.md` SHALL mandar ler só o mapa do framework do projeto, criar os componentes base uma vez, e montar cada tela com eles, sem reescrever estilo

### S3: entra só se medir bem (P1)

**Acceptance Criteria**

8. The bench SHALL ter uma tarefa `proto-react` com um protótipo de 2 telas e um projeto React, cujos testes ocultos conferem textos, ids e navegação das telas
9. The peça SHALL entrar no kit só se, na tarefa `proto-react`, pedir com a skill acertar no mínimo o mesmo que pedir sem ela, com custo por acerto no mínimo 15% menor

**Independent test:** `R codigo react` num projeto Vite de exemplo grava o tema e o `npm run build` passa.

## Out of scope

| Excluded | Why |
| --- | --- |
| Vue, Svelte, Blazor | o público do kit usa Angular, React e Flutter |
| componentes gerados por script | ver Landing |
| comparação visual automática (screenshot do protótipo contra a tela) | fica para depois, com o Playwright, se a medição pedir |
| Angular Material: mapear as variáveis para `--mat-sys-*` | só quando o projeto usa Material; o mapa do Angular cita como fazer, sem script |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| uma skill nova ou etapa da `prototipo` | etapa da `prototipo` | o usuário já conhece o comando; o protótipo e o tema estão lá | n |
| Style Dictionary para o Flutter | não; o script escreve o `ThemeData` direto | são 5 cores e uma fonte; o `flutter/class.dart` dele não gera `ThemeData` (pesquisa de 27/11) | n |
| bench em React, não em Angular | React com Vite | instalar dependência do Angular por execução pesa mais; o fluxo é o mesmo | n |
| dependências do projeto no bench | `node_modules` instalado uma vez em `bench/.cache` e copiado | instalar a cada execução custaria minutos | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| comando `R codigo <framework>` | saída, exit codes | AC 1-5 |
| comando `R codigo <framework>` | o que imprime ao falhar | AC 4, 5 |
| doc `codigo-<framework>.md` | estrutura | AC 6 |
| doc seção "Levar ao código" | o que o leitor faz em seguida | AC 7 |

## Sources

- Pedido do usuário (27/11/2026)
- Pesquisa de 27/11: nada maduro converte HTML+CSS para os três frameworks; Style Dictionary 5.8.0 `flutter/class.dart` não gera `ThemeData`
