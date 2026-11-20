# AGENTS.md
<!-- Modelo do Claude Code Toolkit: /cctk:init-project preenche este arquivo.
     Claude Code e outras ferramentas leem AGENTS.md; o CLAUDE.md da raiz fica só com @AGENTS.md.
     Mantenha curto (< 200 linhas): tudo aqui entra no contexto em TODA conversa.
     Comentários HTML como este não entram no contexto. -->

## Projeto
<Uma ou duas frases: o que o sistema faz e para quem.>

- Backend: <.NET 8 / ASP.NET Core / EF Core / SQL Server> — pasta `<src/Api>`
- Web: <Angular 19 | React 19 + TypeScript> — pasta `<web/>`
- Mobile: <Flutter 3.x> — pasta `<app/>`
- Repositório: `<nome-repo>` · Branch principal: `<main|develop>`
- Azure DevOps: collection `<Collection>`, projeto `<Projeto>` → MCP `ado-<collection>`

## Comandos (rode para verificar; não presuma que funciona)

| O quê | Comando |
|---|---|
| Restaurar | `<dotnet restore / npm ci / flutter pub get>` |
| Build / análise | `<comando com flags silenciosas>` |
| Testes | `<comando com saída só das falhas>` |
| Formatar | `<dotnet format / npx prettier --write / dart format .>` |

O check obrigatório está em `.claude/cctk.json` e roda sozinho ao fim de cada turno com edição.

## Como trabalhar aqui

- **Ajuste pequeno** (até 3 arquivos, sem regra de negócio nova): implemente direto e escreva o teste que prova o ajuste.
- **Feature ou bug com regra de negócio** (critérios de aceite, mais de 3 arquivos, ou algo difícil de desfazer: schema, contrato de API, migration): use OpenSpec. `/openspec-propose` → eu reviso → `/openspec-apply-change` → `/openspec-verify-change` → subagente `spec-reviewer` → `/openspec-archive-change`.
- **Mudança de tela**: suba o app e confira com a skill `playwright-cli` antes de dizer "pronto". Prefira snapshot a screenshot e use `playwright-cli open` (navegador isolado), nunca `attach` no meu Chrome.
- **Na dúvida**, pergunte qual dos dois caminhos seguir antes de codar.

Em qualquer caminho, só diga "pronto" com build e testes passando, e mostre a saída.

## Convenções
- <ex.: C#: nullable habilitado, async até o fim, sem `.Result`/`.Wait()`>
- <ex.: Angular: standalone components, signals; sem lógica em templates>
- <ex.: Flutter: camadas UI / domínio / dados; estado com Riverpod>
- Branches: `feature/<id>-<slug>` ou `bugfix/<id>-<slug>`
- Commits (Conventional Commits): `<tipo>(<escopo opcional>): <resumo>`, com `#<id>` do work item no fim quando houver.

## Fontes de verdade (consulte antes de chutar uma API)
- Bibliotecas e frameworks → MCP `context7`
- Work items, PRs e repos → MCP `ado-<collection>`
- Banco de desenvolvimento (somente leitura) → MCP `database`. Entenda o schema antes; use `TOP`/`WHERE` e só as colunas necessárias (nada de `SELECT *`).

## Limites
- Nunca leia, imprima ou commite segredos (`.env`, `appsettings.*.json` com senha, tokens). Use as variáveis do cofre por referência.
- Dados pessoais reais (CPF, salário, saúde, endereço) nunca vão para testes, logs, commits ou PRs. Use dados fictícios.
- Mudança de dados ou de schema é sempre por migration ou script no código, revisado em PR, nunca direto no banco.
- `git push`, deploy, migration fora do banco local e qualquer acesso a produção só com meu "ok" explícito.
- Não altere `<pastas geradas / legado intocável>`.
