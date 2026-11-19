---
name: init-project
description: Prepara um repositório para o Claude Toolkit Dev. Detecta a stack, cria ou atualiza AGENTS.md e CLAUDE.md, grava o check obrigatório em .claude/toolkit.json, inicializa o OpenSpec, deixa o projeto em Sonnet e oferece Azure DevOps e banco somente leitura. Use quando pedirem "init-project", "preparar o repositório para IA", "configurar o toolkit neste projeto" ou para criar/atualizar o AGENTS.md. Prefira esta skill ao /init nativo.
disable-model-invocation: true
---

# Preparar o projeto

O AGENTS.md entra no contexto de **toda** conversa. Cada linha precisa se pagar. Para cada linha,
pergunte: *"se eu apagar isto, o agente erraria algo neste repo?"* Se a resposta for não, a linha sai.

Arquivos de apoio: [AGENTS.template.md](references/AGENTS.template.md) (modelo) e
[stacks.md](references/stacks.md) (comandos por stack).

## 1. Situação atual

1. Ache a raiz com `git rev-parse --show-toplevel` e trabalhe sempre nela.
2. Procure `AGENTS.md`, `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`, `.cursorrules`,
   `.github/copilot-instructions.md`, `.claude/toolkit.json`, `openspec/` e `.mcp.json`.
   - Se o `AGENTS.md` existe, siga o **modo atualizar** (seção 7).
   - Se existe um `CLAUDE.md` sem `@AGENTS.md`, o Claude Code lê só ele. Proponha mover o conteúdo
     útil para o AGENTS.md e deixar no CLAUDE.md só `@AGENTS.md`. Nada é apagado sem um "ok".

## 2. Descobrir (leia arquivos; ainda não rode build)

| Fato | Onde procurar |
|---|---|
| Stack e versões | `global.json`, `*.csproj` (`<TargetFramework>`: `net4x` = .NET Framework), `*.sln`, `package.json` (Angular, React, TypeScript), `angular.json`, `pubspec.yaml`, `.fvmrc`, `*.sqlproj` |
| Testes | `xunit`/`MSTest`/`NUnit`; `jest`/`vitest`/`karma`; `flutter_test`/`mocktail` |
| Comandos reais | CI (`.github/workflows/*.yml`, `azure-pipelines*.yml`, `.gitlab-ci.yml`) é a melhor fonte; scripts do `package.json`; `.ps1`/`.sh` na raiz |
| Banco | `Microsoft.EntityFrameworkCore.SqlServer`, `System.Data.SqlClient`, `Microsoft.Data.SqlClient`, `Npgsql`, `*.sqlproj` |
| Azure DevOps | `git remote get-url origin` no formato `https://<servidor>/<tfs>/<Collection>/<Projeto>/_git/<Repo>` |
| Não mexer | código gerado (`*.g.dart`, `*.freezed.dart`, `Migrations/`, `bin/`, `obj/`, `dist/`, `build/`) e legado |

## 3. Perguntar só o que os arquivos não respondem

Faça uma única rodada, com no máximo 4 perguntas, cada uma já com a sua sugestão. As típicas:
- O que o sistema faz, em uma frase (se o README não disser).
- Pastas ou legado que o agente não deve alterar.
- Uma convenção que o código não mostra.

## 4. Gravar o check obrigatório

Monte o comando com [stacks.md](references/stacks.md). Ele precisa:
- **sair com código diferente de 0 quando algo quebra** e
- terminar em poucos minutos, porque roda a cada fim de turno em que houve edição. O hook interrompe o
  check que passa de 3 minutos (ou que fica em modo watch) e libera o encerramento só com um aviso.

Rode o comando uma vez e cronometre. Se passar de 2 minutos, grave a versão rápida (só build e typecheck,
como em stacks.md) e avise o usuário, em vez de perguntar. Se falhar no estado atual do repositório, mostre a saída e pergunte se deve
gravar mesmo assim (o Claude vai ficar preso tentando consertar algo que já estava quebrado).
Grave em `.claude/toolkit.json`:

```json
{ "check": "<comando>" }
```

## 5. Escrever AGENTS.md e CLAUDE.md

- Parta do modelo e mantenha a ordem das seções. Troque todo `<...>` por valores reais. Seção que
  não se aplica é **removida**, não deixada com placeholder.
- Use comandos com os caminhos reais e as flags silenciosas de [stacks.md](references/stacks.md).
- Não copie o README e não escreva conselho genérico. Alvo: ~100 linhas. Limite: 200.
- O `CLAUDE.md` da raiz fica só com `@AGENTS.md`.

## 6. Integrações (ofereça só o que se aplica)

1. **OpenSpec:** se não houver `openspec/`, rode
   `openspec init --tools claude --scope project --language pt-BR --no-animation .`
2. **Azure DevOps:** se o remote for de um servidor Azure DevOps, escreva no AGENTS.md:
   "Este repo está na collection `<Collection>`, projeto `<Projeto>`: use o MCP `ado-<collection>`."
   O nome segue a regra do instalador: a collection em minúsculas, com tudo que não é letra ou número
   trocado por `-`. Confira em `/mcp` se ele existe. Se não existir, diga ao usuário para rodar
   `npx github:AlfredoNeeto/claude-toolkit ado add <url-da-collection>` num terminal.
3. **Banco somente leitura** (se detectou banco): ofereça o DBHub e só faça depois de um "sim".
   - Crie `dbhub.toml` a partir de [dbhub.example.toml](references/dbhub.example.toml). O usuário
     preenche o DSN; não peça a senha na conversa.
   - Acrescente `dbhub.toml` ao `.gitignore` e confira com `git check-ignore dbhub.toml`.
   - No `.mcp.json` do projeto, adicione:
     `"database": { "command": "npx", "args": ["-y", "@bytebase/dbhub@2.0.0", "--config", "dbhub.toml"] }`.
     No Windows nativo, use `"command": "cmd", "args": ["/c", "npx", ...]`.
   - Diga ao usuário: use um login do banco **só com `db_datareader`**, num banco de dev ou homologação,
     nunca de produção. Tudo o que a consulta retorna entra no contexto.
4. **Verificação de tela** (repo web: `angular.json`, ou React/Vite/Next no `package.json`): ofereça
   `playwright-cli install --skills` na raiz. A skill fica em `.claude/skills/playwright-cli/` e vai
   para o git, então o time inteiro recebe. Ela usa o Chrome já instalado. Use o CLI, não o MCP do
   Playwright: o CLI não carrega esquemas nem árvores de acessibilidade no contexto.
5. **LSP:** não instale os plugins LSP (`csharp-lsp`, `typescript-lsp`). No benchmark do toolkit, o
   Claude não chamou a ferramenta LSP nenhuma vez num rastreio por 5 arquivos (preferiu `Grep`) e o custo
   por acerto subiu 11%. Para Dart/Flutter, use o MCP `dart` (`dart mcp-server`).
6. **Time:** em `.claude/settings.json` do projeto, mescle (sem apagar o que existe; se já houver
   `model`, mantenha o do time):
   ```json
   {
     "model": "sonnet",
     "extraKnownMarketplaces": { "claude-toolkit": { "source": { "source": "github", "repo": "AlfredoNeeto/claude-toolkit", "ref": "v1.0.1" } } },
     "enabledPlugins": { "toolkit-dev@claude-toolkit": true }
   }
   ```
   Assim, quem clonar o repositório recebe a sugestão de instalar o toolkit e trabalha em Sonnet, que no
   benchmark custou cerca de metade do Opus em custo de API, pela mesma qualidade. Para planejar, `claude --model opus`
   continua valendo, porque a opção de linha de comando tem precedência sobre o `settings.json`.

## 7. Modo atualizar (AGENTS.md já existe)

Nunca sobrescreva o que o time escreveu. Compare o arquivo com o modelo e com o que você descobriu.
Proponha só o que falta ou está desatualizado, mostre como diff resumido e aplique depois do "ok".

## 8. Verificar antes de entregar

1. O check do `.claude/toolkit.json` rodou e o resultado foi mostrado.
2. Não sobrou placeholder: `grep -nE '<[^>]+>' AGENTS.md` não deve achar nada além dos padrões de
   commit e branch (`<tipo>`, `<resumo>`, `<id>`, `<slug>`).
3. Conte as linhas do AGENTS.md.
4. Termine com 3 linhas: o que foi detectado, o que foi perguntado ou assumido e o que o usuário deve
   revisar. Não faça commit sem pedido.
