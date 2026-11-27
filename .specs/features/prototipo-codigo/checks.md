# Do protótipo aprovado ao código checks

Profile: light
Plan: `.specs/features/prototipo-codigo/plan.md`

10 checks in 3 slices · 2 one-way doors · 0 open, of which 0 block

Os testes ficam em `test/prototipo-codigo.test.mjs` (entra no `npm test`), um por check, nomeado `C<n>`. Eles chamam
a função `codigo` exportada de `render.mjs` sobre projetos de exemplo criados numa pasta temporária. A regra de
entrada (C9) é conferida sobre uma rodada real, em `test/prototipo-codigo-rodada.test.mjs` (fora do `npm test`).

## Checks

### S1 - tema gerado por script · 2 files · 30 KB · ~8k

**C1** - Num projeto com `angular.json` (um projeto com `architect.build.options.styles: ["src/styles.css"]`), `codigo('angular')` grava `src/styles/prototipo.css` com as regras de `estilo.css` seguidas das de `tema.css` (a regra de `--cor` do tema vem depois da do estilo), e o `styles` do `build` e do `test` passa a ser `["src/styles/prototipo.css", "src/styles.css"]` (AC 1)
Proof: `node --test --test-name-pattern "^C1 " test/prototipo-codigo.test.mjs`

**C10** - No CSS gerado, todo seletor fora de `@keyframes` começa por `.prototipo` (`.btn` vira `.prototipo .btn`, `:root` e `body` viram `.prototipo`, `body.mobile` vira `.prototipo.mobile`, e as regras dentro de `@media` também), `@keyframes pulso` fica como está, um `@import` do tema vai para o topo e `@layer base;` fica, e a regra depois deles continua com escopo, inclusive depois do `@import` do Google Fonts (com `;` dentro do `url(...)`), e as regras dentro de um bloco `@layer` também ganham escopo (AC 10)
Proof: `node --test --test-name-pattern "^C10 " test/prototipo-codigo.test.mjs`

**C2** - Num projeto com `package.json` que depende de `react` e tem `src/main.jsx`, `codigo('react')` grava `src/styles/prototipo.css` e devolve um aviso com `import './styles/prototipo.css'` e `src/main.jsx` (AC 2)
Proof: `node --test --test-name-pattern "^C2 " test/prototipo-codigo.test.mjs`

**C3** - Num projeto com `pubspec.yaml` e um `tema.css` com `--cor:#0a7d4f;--erro:#c00`, `codigo('flutter')` grava `lib/tema/tema_prototipo.dart` com `ThemeData`, `ColorScheme`, `Color(0xFF0A7D4F)` como `primary`, `Color(0xFFCC0000)` como `error`, as cores de `--superficie` (`surface`), `--fundo` (`surfaceContainer` e `scaffoldBackgroundColor`) e `--texto` (`onSurface`) do `estilo.css`, e o aviso de Flutter 3.22 ou mais novo (AC 3)
Proof: `node --test --test-name-pattern "^C3 " test/prototipo-codigo.test.mjs`

**C4** - Com o arquivo de destino já existente, `codigo` lança erro com o caminho dele e não muda o arquivo; pela linha de comando, `R codigo react` sai com 1 (AC 4)
Proof: `node --test --test-name-pattern "^C4 " test/prototipo-codigo.test.mjs`

**C5** - Sem `prototipo/tema.css`, ou com `codigo('angular')` num projeto sem `angular.json`, `codigo` lança erro que diz o que falta; pela linha de comando, sai com 1 (AC 5)
Proof: `node --test --test-name-pattern "^C5 " test/prototipo-codigo.test.mjs`

### S2 - mapa do catálogo · 4 files · 20 KB · ~5k

**C6** - `references/codigo-angular.md`, `codigo-react.md` e `codigo-flutter.md` existem, e cada um tem uma linha de tabela para cada um dos 17 componentes: menu, topo, cards, filtros, caixa, tabela, campo, botões, selos, avisos, vazio, carregando, abas, modal, barras, login, mobile (AC 6)
Proof: `node --test --test-name-pattern "^C6 " test/prototipo-codigo.test.mjs`

**C7** - O `SKILL.md` tem a seção "Levar ao código", que cita `R codigo`, `references/codigo-` e "componentes base", e manda não reescrever o estilo (AC 7)
Proof: `node --test --test-name-pattern "^C7 " test/prototipo-codigo.test.mjs`

### S3 - entra só se medir bem · 1 task · 40 KB · ~10k

**C8** - `node bench/run.mjs --dry --tasks proto-react` sai com 0: sem a solução os testes ocultos (textos, ids e navegação das 2 telas) falham, com a solução passam, e o check passa (AC 8)
Proof: `node bench/run.mjs --dry --tasks proto-react`

**C9** - Numa rodada real de `proto-react` com os lados `toolkit` (pedido comum) e `proto-codigo` (pedido que usa a etapa nova), o `proto-codigo` acerta no mínimo o mesmo que o `toolkit`, com custo por acerto no mínimo 15% menor; se não, a seção "Levar ao código" sai do `SKILL.md` (AC 9)
Proof: `BENCH_ROUND=<rodada> node --test --test-name-pattern "^C9 " test/prototipo-codigo-rodada.test.mjs`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| frameworks (3) | angular C1 · react C2 · flutter C3 | - |
| falhas do comando (3) | destino existe C4 · falta tema C5 · framework errado C5 | - |
| componentes do catálogo (17) | menu C6 · topo C6 · cards C6 · filtros C6 · caixa C6 · tabela C6 · campo C6 · botões C6 · selos C6 · avisos C6 · vazio C6 · carregando C6 · abas C6 · modal C6 · barras C6 · login C6 · mobile C6 | - |
| door: destino do tema por framework (1) | C1 C2 C3 | - |
| door: mesmas classes no web, com escopo (1) | C10 | - |
| tipos de regra no escopo (4) | seletor comum C10 · `:root`/`body` C10 · `@media` C10 · `@keyframes` C10 | - |

- C9 depende de uma rodada real (custo); até lá a etapa fica no `SKILL.md` marcada como em medição

## Swept

- validation: C5 - falta o tema ou o projeto não é do framework pedido
- failure modes: C4 - não sobrescreve arquivo existente
- idempotency: C4 - rodar de novo não muda nada e avisa
- authorization: n/a - comando local no projeto do usuário
- concurrency: n/a - comando de execução única
- data lifecycle: n/a - nada persiste além dos arquivos gerados no projeto
- dependency failure: n/a - o comando não chama rede nem binário
- state transitions: n/a - sem estado
- observability: C2 - o comando diz a linha a pôr no arquivo de entrada

## Handoff

- **Rodada real (27/11):** C9 provado em `bench/results/2026-11-27-proto-react-6reps` (junção de `2026-11-27T18-41-36-178Z` e `2026-11-27T18-54-05-969Z`): `toolkit` 6/6 por US$ 0,264 por acerto, `proto-codigo` 6/6 por US$ 0,221 (−16%). A primeira rodada sozinha (3 por lado) deu −14%; o usuário pediu mais 3 por lado antes de decidir. A etapa fica

- **Depois da rodada 3 (achados baixos N1-N3):** `<dialog class="modal" open>` deixou de contar como aberto nos testes ocultos (o CSS do catálogo ainda o esconde); o C10 testa a proteção de aspas e a de parênteses separadas; vírgula dentro de `:not(...)` não divide mais o seletor. Não passou por nova rodada de verificação: as 3 rodadas acabaram

- **Round 3 (verificação de 27/11, FAIL só por C9 pendente):** o escopo acha o fim do `@import` fora de aspas e parênteses (o endereço do Google Fonts tem `;`) e escopa blocos `@layer`/`@container`; o modal dos testes ocultos também conta como aberto por `style.display` e `<dialog open>` (5 variantes conferidas: 4 jeitos válidos passam 7/7, o modal que nunca abre falha); C1 cobre o alvo `test` do Angular

- **Round 2 (verificação de 27/11, FAIL só por C9 pendente, com achados):** os testes ocultos do `proto-react` passam a aceitar o modal aberto por `:target` (cópia fiel do protótipo) além do aberto por estado, e normalizam o espaço inquebrável do `toLocaleString`; o escopo sobe `@import` e mantém `@layer` de uma linha; no Flutter, `--fundo` vira `surfaceContainer` (era `surfaceContainerLowest`, papel invertido), com aviso de versão e de registrar a fonte; o Angular também põe o estilo no alvo `test`; os mapas avisam sobre portal e overlay; o cache de dependências só vale com a marca `.ok`
- **Limite conhecido do C9:** os testes ocultos conferem texto, `id` e navegação, não o visual; o C9 mede o custo de levar as telas ao código com o comportamento certo

- S1-S3 tocam `render.mjs` (18 KB), `SKILL.md` (10 KB), 3 mapas novos (~12 KB), a tarefa `proto-react` (~30 KB sem
  dependências), testes (~8 KB) = ~78 KB / 4 ≈ 20k, abaixo do budget de 150k - one builder
