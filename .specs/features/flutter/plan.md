# Flutter de verdade

## Problem

O kit trata Flutter só no protótipo (tela de 390 px, visual Material) e com uma menção ao MCP do Dart no
`/cctk:init-project`. Quem desenvolve o app em Flutter não recebe nada do kit: nem as skills de teste de widget, de
layout e de arquitetura, nem um check que rode `flutter analyze` e `flutter test`. O Claude escreve código Flutter
sem saber as práticas do time do Flutter e encerra sem rodar a análise.

Evidência: pedido do usuário (27/11/2026). O time do Flutter mantém o plugin oficial `dart-flutter`
(github.com/flutter/agent-plugins, BSD-3-Clause, v1.0.7), com 25 skills e o MCP `dart mcp-server`, instalável no
Claude Code por marketplace. As skills que o usuário já tem em `~/.claude/skills` são cópias dessas.

Quando isto sair: num projeto com `pubspec.yaml`, o `/cctk:init-project` grava o check com `flutter analyze` e
`flutter test` e liga o plugin oficial no projeto, então quem clona recebe as skills e o MCP do Dart.

## Flow

Reusa o `/cctk:init-project` (detecção da stack, check, `.claude/settings.json` do projeto com
`extraKnownMarketplaces` e `enabledPlugins`, como já faz para o plugin `cctk`).

1. `/cctk:init-project` (exists) - detecta `pubspec.yaml`
2. `/cctk:init-project` (exists) - grava o check `flutter analyze && flutter test` (com `--no-pub` quando já houver `.dart_tool/`)
3. `/cctk:init-project` (exists) - mescla no `.claude/settings.json` do projeto o marketplace `flutter/agent-plugins` e `"dart-flutter@dart-flutter": true` (door 1)
4. out: o Claude Code oferece o plugin a quem abre o projeto; as skills e o MCP do Dart passam a valer

## Impact

| Front | What changes |
| --- | --- |
| projetos Flutter | ganham check e plugin; nada muda em projeto sem `pubspec.yaml` |
| instalação do kit | nada muda: o plugin entra por projeto, não no `cctk install`, então quem não usa Flutter não carrega um MCP que falharia sem o `dart` |
| skills locais do usuário | as cópias em `~/.claude/skills` continuam; o `cctk install` as remove na primeira instalação, como qualquer skill de usuário |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| como o kit entrega as skills do Flutter | referência ao marketplace oficial no `.claude/settings.json` do projeto: `"extraKnownMarketplaces": { "dart-flutter": { "source": { "source": "github", "repo": "flutter/agent-plugins" } } }` e `"enabledPlugins": { "dart-flutter@dart-flutter": true }` | copiar as 25 skills para o plugin `cctk`: a licença BSD-3 permite, mas o time do Flutter regera as skills e as cópias ficariam velhas; instalar no `cctk install` para todos: o MCP falharia em máquina sem Dart |

## Criteria

### S1: check e plugin no projeto Flutter (P1)

**Acceptance Criteria**

1. WHEN o `/cctk:init-project` acha `pubspec.yaml` THEN ele SHALL gravar em `.claude/cctk.json` o check `flutter analyze && flutter test`
2. WHEN o `/cctk:init-project` acha `pubspec.yaml` THEN ele SHALL mesclar no `.claude/settings.json` do projeto o marketplace `flutter/agent-plugins` e `"dart-flutter@dart-flutter": true`, sem apagar chaves que já existem
3. IF o comando `flutter` não estiver no PATH THEN o `/cctk:init-project` SHALL gravar o check mesmo assim e dizer ao usuário que instale o Flutter SDK para o check rodar
4. The `AGENTS.md` gerado para projeto Flutter SHALL dizer que as skills `flutter-*` e `dart-*` vêm do plugin oficial e quando usar o MCP do Dart (erro em tempo de execução, árvore de widgets)

### S2: entra só se medir bem (P2)

**Acceptance Criteria**

5. The bench SHALL ter uma tarefa `flutter-widget` com um app Flutter pequeno e testes de widget ocultos
6. The peça SHALL entrar no kit só se, na tarefa `flutter-widget`, o kit com o plugin acertar no mínimo o mesmo que sem ele, com no máximo +15% de custo por acerto

**Independent test:** `/cctk:init-project` num app criado com `flutter create` grava o check e o settings, e `flutter analyze && flutter test` passa.

## Out of scope

| Excluded | Why |
| --- | --- |
| rodar o app em emulador no check | lento demais para 3 minutos; o MCP do Dart cobre a inspeção quando o app roda |
| copiar as regras do `rules/` do plugin para o `CLAUDE.md` | o kit mantém o `CLAUDE.md` curto; o AGENTS.md aponta para as skills |
| protótipo Flutter → código | está na peça "do protótipo ao código" |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| plugin por projeto ou para todos | por projeto, pelo `init-project` | ver Landing | n |
| versão do plugin | sem fixar `ref` (o marketplace oficial) | o time do Flutter publica correções; fixar pararia nelas | n |

**Open questions:** one, listed below.

| # | Kind | Question | Until answered |
| --- | --- | --- | --- |
| 1 | blocks go-live | O Flutter SDK não está instalado nesta máquina (27/11). Instalar para o bench medir a peça? | AC 5 e 6 não rodam; a peça fica fora do kit até medir |

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| doc `AGENTS.md` de projeto Flutter | o que o leitor faz em seguida | AC 4 |
| `/cctk:init-project` em projeto Flutter | o que diz quando falta o SDK | AC 3 |
| `.claude/settings.json` do projeto | mescla sem apagar | AC 2 |

## Sources

- Pedido do usuário (27/11/2026)
- https://github.com/flutter/agent-plugins (BSD-3-Clause) e https://docs.flutter.dev/ai/get-started
