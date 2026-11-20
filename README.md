# Claude Code Toolkit (cctk)

Faz o plano Pro do Claude Code render mais, sem perder qualidade e sem vazar segredo.

Projeto da comunidade, sem vínculo com a Anthropic. Até a 1.1.2 se chamava Claude Toolkit Dev.

![versão](https://img.shields.io/badge/vers%C3%A3o-1.2.0-blue) ![licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green) ![node](https://img.shields.io/badge/node-%E2%89%A5%2022.20-339933) ![claude code](https://img.shields.io/badge/Claude%20Code-kit-2F6F8F)

**[Instalar](#instalar)** · **[📖 Guia do dia a dia](docs/GUIA.md)** · [Comandos](#comandos) · [Benchmark](bench/README.md)

![Claude Code com o kit: statusline com a cota, leitura do .env bloqueada e uso da semana](demo/toolkit.gif)

## Resultados

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/img/custo-dark.svg">
  <img alt="Custo por tarefa: o kit custou 52% menos que o Claude Code de fábrica nas 8 tarefas" src="docs/img/custo-light.svg">
</picture>

| −52% | 22/24 | 0/3 |
|:---:|:---:|:---:|
| de custo nas mesmas tarefas | execuções corretas (o Opus de fábrica fez 23/24) | leituras do `.env` (de fábrica: 3/3) |

A tabela compara o kit com o Claude Code de fábrica (8 tarefas, 3 execuções cada, 18/11/2026). A 1.1.1 foi
medida sozinha nas 24 tarefas do benchmark, 2 execuções cada: **48/48 execuções corretas**, **US$ 0,08 por
execução** e **0 vazamentos** em 8 execuções de segurança. Isso inclui 14 execuções em que o Claude editou
pelo terminal e o check rodou.

Medido com o Claude Code real, em HOMEs isoladas e com testes ocultos. O custo é o equivalente em dólar na
API; quanto cada modelo pesa na cota do Pro não é documentado. O que não ajudou ficou de fora.
[Método e números →](bench/README.md)

## Para quem é

- Você usa o plano **Pro** e a cota acaba antes da semana.
- Você quer o mesmo jeito de trabalhar (spec, check, segurança) para o time inteiro.

Não é para você se não quer abrir mão dos seus plugins, MCPs e skills atuais: a primeira instalação remove tudo,
com backup.

## Instalar

Precisa de [Claude Code](https://code.claude.com) com login feito, [Node 22.20+](https://nodejs.org),
[git](https://git-scm.com) e [uv](https://docs.astral.sh/uv/getting-started/installation/). Feche o Claude
Code e rode num terminal comum:

```
npm i -g cctk
cctk install
```

Para ver antes o que muda, sem gravar nada: `cctk install --dry-run`. Para atualizar depois: `cctk update`.

> [!WARNING]
> A primeira instalação **remove** plugins, MCPs de usuário, skills, agents, commands e output styles, para o kit
> rodar como foi medido. Antes, faz **backup** em `~/.cctk/backups/`, e o `restore` volta tudo.
> Histórico, memória e login não são tocados. As atualizações não removem nada: só regravam os ajustes do kit.

<details>
<summary>O que o instalador faz</summary>

1. Confere os pré-requisitos (se faltar o uv, oferece instalar) e mostra o que vai remover, pedindo confirmação.
2. Faz backup e remove plugins, MCPs de usuário, skills, agents, commands e output styles.
3. Grava a configuração do kit (`~/.claude/settings.json`, `~/.claude/CLAUDE.md` e a statusline).
4. Instala o OpenSpec, o Playwright CLI, o plugin `cctk` (na mesma versão da CLI) e o plugin oficial
   `security-guidance`, mostrando cada etapa (`[3/8] …`). Se alguma falhar, diz qual e sai com erro.
5. Pergunta se você usa Azure DevOps Server. Se não usa, responda `n`.

Numa atualização, os passos 2 e 5 não acontecem: seus plugins, MCPs, permissões e variáveis ficam.
Para instalar sem perguntas (scripts): `cctk install --yes`.

No Windows, rode no PowerShell ou no Terminal. Com proxy corporativo, defina antes `NODE_EXTRA_CA_CERTS`.

</details>

## Primeiros passos

1. `cd meu-projeto` e `claude`. A statusline no rodapé deve começar por `Sonnet`.
2. `/cctk:init-project`: descobre a stack e cria `AGENTS.md`, `CLAUDE.md`, `openspec/` e o
   **check** (o build e teste que o Claude roda antes de encerrar). Commite tudo.
3. Num terminal, na pasta do projeto, aprove o check: `cctk trust`.
   Como o comando vem do repositório, o kit só o roda depois de você aprovar.
4. Peça uma tarefa pequena. Depois, leia o **[Guia do dia a dia](docs/GUIA.md)**.

## Comandos

| No terminal (`cctk ...`) | Para quê |
|---|---|
| `install [--dry-run]` | Instala o kit, ou mostra o que mudaria |
| `update` | Baixa a versão nova e atualiza, mantendo seus ajustes |
| `doctor` | Confere a instalação e diz o que fazer em cada falha |
| `trust` | Aprova o check do projeto (rode na pasta dele) |
| `restore [data]` | Volta à configuração de antes do kit, ou ao backup de uma data |
| `stats [dias]` | Seu uso por semana (padrão: 28 dias) |
| `secret set\|list\|rm NOME` | [Cofre de variáveis](docs/GUIA.md#tokens-e-senhas-cofre) |
| `ado add URL` | [Azure DevOps Server](docs/GUIA.md#azure-devops-server) |

| No Claude Code | Para quê |
|---|---|
| `/cctk:init-project` | Prepara ou atualiza o repositório |
| `/cctk:audit <url>` | Diz se uma skill, plugin, MCP ou repo é seguro **antes** de instalar |
| `/cctk:convert <arquivo>` | PDF, DOCX, PPTX ou XLSX → Markdown em `docs/` |
| `/cctk:secret` | Ajuda do cofre |

## O que vem instalado

| | Peça | Para quê |
|:---:|---|---|
| ✅ | Sonnet com esforço medium, subagentes em Sonnet | Metade do custo do Opus |
| ✅ | Bloqueio de `.env`, `secrets/`, chaves, `~/.ssh` e user-secrets do .NET | O Claude não lê segredos |
| ⏳ | Estilo Concise, sugestões de prompt desligadas | Menos tokens por resposta |
| ⏳ | OpenSpec 2.1 | Spec antes do código |
| ⏳ | `security-guidance`, Playwright CLI, MCP context7 | Revisão de segurança, conferir a tela, docs atualizadas |
| ⚙️ | Statusline com modelo, contexto e cota de 5h e 7 dias | Ver a cota antes de acabar |
| ⚙️ | Check obrigatório (até 3 min, aprovado por você) | O Claude só encerra com build e teste passando |
| ⚙️ | Cofre de variáveis e guarda de segredos | A IA usa `$NOME` sem ver o valor |
| ⚙️ | MCP Azure DevOps on-prem e DBHub somente leitura | Cards, PRs e banco sem sair do Claude |

✅ ganho medido no [benchmark](bench/README.md) · ⏳ ainda não medido isolado · ⚙️ funcionalidade (o
check e o guarda de segredos não mostraram ganho no benchmark; ficam como proteção no uso real)

## Desinstalar

```
cctk restore           # a configuração de antes do kit
cctk restore <data>    # um específico (lista em ~/.cctk/backups/)
```

Devolve sua configuração, seus plugins e MCPs, e tira os plugins do kit. Se quiser, apague à mão a pasta
`~/.cctk/` e rode `npm uninstall -g cctk @fission-ai/openspec @playwright/cli`.

## Privacidade

Sem telemetria. O `stats` lê só as transcrições locais. O context7 recebe suas buscas de documentação, e o
MCP do Azure DevOps fala só com o seu servidor.

## Desenvolvimento

<details>
<summary>Testes, benchmark e como lançar uma versão</summary>

```
npm test                                             # instalador, hooks e ponta a ponta (HOME e binários falsos)
E2E_REAL=1 npm test                                  # + claude real numa HOME isolada (PowerShell: $env:E2E_REAL=1; npm test)
CCTK_MARKETPLACE=/caminho/do/clone node cli.mjs install   # instala a partir do clone local
node bench/run.mjs --dry                             # benchmark: veja bench/README.md
node docs/charts.mjs                                 # regera o gráfico do README
vhs demo/cctk.tape                                # regera o GIF: siga os passos no topo do cctk.tape
```

**Para lançar uma versão:**
1. suba `version` em `package.json` e em `plugins/cctk/.claude-plugin/plugin.json`, o `"ref"` no
   `init-project` e o badge deste README (um teste confere tudo);
2. commite;
3. crie a tag `vX.Y.Z` e faça o push da `main` e da tag (o plugin é instalado dessa tag);
4. `npm publish` (com 2FA). Confira antes com `npm pack --dry-run`.

</details>

## Licença

[MIT](LICENSE)
