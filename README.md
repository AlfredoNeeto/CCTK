# Claude Code Toolkit (cctk)

Faz o plano Pro do Claude Code render mais, sem perder qualidade e sem vazar segredo.

Um comando instala uma configuração do Claude Code medida em benchmark: modelo e esforço calibrados para a
cota, bloqueio de segredos, check de build e teste antes de encerrar, spec antes do código e uma statusline que
mostra a cota. Projeto da comunidade, sem vínculo com a Anthropic.

[![npm](https://img.shields.io/npm/v/@alfredoneeto/cctk)](https://www.npmjs.com/package/@alfredoneeto/cctk) ![versão](https://img.shields.io/badge/vers%C3%A3o-1.4.1-blue) ![licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green) ![node](https://img.shields.io/badge/node-%E2%89%A5%2022.20-339933)

**[Instalar](#instalar)** · **[📖 Guia do dia a dia](docs/GUIA.md)** · [Situações](docs/SITUACOES.md) · [Guia de prompts](docs/PROMPTS.md) · [Comandos](#comandos) · [Benchmark](bench/README.md)

<img alt="Claude Code com o kit: statusline com a cota, leitura do .env bloqueada e uso da semana" src="https://raw.githubusercontent.com/AlfredoNeeto/cctk/main/demo/toolkit.gif">

## Resultados

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/AlfredoNeeto/cctk/main/docs/img/custo-dark.svg">
  <img alt="Custo por tarefa: o kit custou 52% menos que o Claude Code de fábrica nas 8 tarefas" src="https://raw.githubusercontent.com/AlfredoNeeto/cctk/main/docs/img/custo-light.svg">
</picture>

| −52% | 22/24 | 0/3 |
|:---:|:---:|:---:|
| de custo nas mesmas tarefas | execuções corretas (o Opus de fábrica fez 23/24) | leituras do `.env` (de fábrica: 3/3) |

A tabela compara o kit com o Claude Code de fábrica (8 tarefas, 3 execuções cada, 18/11/2026). A 1.4.0 foi
medida sozinha nas 25 tarefas do benchmark, 2 execuções cada: **49/50 execuções corretas**, **US$ 0,11 por
execução** e **0 vazamentos** em 10 execuções de segurança ([detalhes](bench/README.md#resultados-19112026)).

Medido com o Claude Code real, em HOMEs isoladas e com testes ocultos. O custo é o equivalente em dólar na
API; quanto cada modelo pesa na cota do Pro não é documentado. Das 13 mudanças testadas no placar, 4 entraram;
o que não ajudou ficou de fora. [Método, números e o placar dos experimentos →](bench/README.md)

## Para quem é

- Você usa o plano **Pro** e a cota acaba antes da semana.
- Você quer o mesmo jeito de trabalhar (spec, check, segurança) para o time inteiro.

Não é para você se não quer abrir mão dos seus plugins, MCPs e skills atuais: a primeira instalação remove tudo,
com backup.

## Instalar

**Requisitos:** [Claude Code](https://code.claude.com) com login feito, [Node 22.20+](https://nodejs.org),
[git](https://git-scm.com) e [uv](https://docs.astral.sh/uv/getting-started/installation/). Funciona no
Windows, no macOS e no Linux.

Feche o Claude Code e rode num terminal comum:

```
npm i -g @alfredoneeto/cctk
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

O passo a passo completo, com o que conferir em cada etapa, está no [Primeiro uso](docs/GUIA.md#primeiro-uso).

## Documentação

| Leia | Quando |
|---|---|
| [Primeiro uso](docs/GUIA.md#primeiro-uso) | Acabou de instalar: do `install` ao primeiro pedido, passo a passo |
| [Situações](docs/SITUACOES.md) | Quer uma receita pronta: bug com log, banco, card do Azure DevOps, protótipo, revisão de PR, cota acabando |
| [Guia de prompts](docs/PROMPTS.md) | Quer que o Claude acerte de primeira: princípios com fonte, modelos por tipo de pedido e como corrigir o rumo |
| [Guia do dia a dia](docs/GUIA.md) | Referência: desenvolver, prototipar, statusline, check, cofre, Azure DevOps e o que fazer quando dá erro |
| [Benchmark](bench/README.md) | Quer saber por que o kit é assim: o método, os números e o que ficou de fora |

## Comandos

| No terminal (`cctk ...`) | Para quê |
|---|---|
| `install [--dry-run] [--yes]` | Instala o kit, mostra o que mudaria (`--dry-run`) ou instala sem perguntas (`--yes`) |
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
| `/cctk:prototipo <telas \| print>` | Protótipo navegável em HTML, do zero ou a partir do print de um sistema; entrega zip, HTML único ou especificação em PDF |
| `/cctk:secret` | Ajuda do cofre |

## O que vem instalado

| | Peça | Para quê |
|:---:|---|---|
| ✅ | Sonnet com esforço medium, subagentes em Sonnet | Metade do custo do Opus |
| ✅ | Advisor: o Sonnet pode consultar o Opus nos pontos difíceis (experimental no Claude Code) | Mais acertos onde o pedido deixa regra implícita, com custo por acerto menor |
| ✅ | Bloqueio de `.env`, `secrets/`, chaves, `~/.ssh` e user-secrets do .NET | O Claude não lê segredos |
| ⚙️ | Edit/Write só dentro do projeto (e da pasta de repositórios que você indicar), MCPs sem herdar o ambiente, commit com token barrado | Menos estrago de um erro da IA. Comandos de terminal ficam no sandbox nativo no macOS e no Linux (com `bwrap` e `socat` instalados); no Windows não há sandbox |
| ⏳ | Estilo Concise, sugestões de prompt desligadas | Menos tokens por resposta |
| ⚙️ | OpenSpec 2.1, com a seção **Dimensões** no proposal (o que o pedido não diz) e o subagente `spec-reviewer` | Spec revisada por você antes do código, em feature com regra de negócio |
| ⏳ | `security-guidance`, Playwright CLI, MCP context7 | Revisão de segurança, conferir a tela, docs atualizadas |
| ⚙️ | Statusline com modelo, contexto e cota de 5h e 7 dias | Ver a cota antes de acabar |
| ⚙️ | Check obrigatório (até 3 min, aprovado por você) | O Claude só encerra com build e teste passando |
| ⚙️ | Cofre de variáveis (criptografado pelo sistema) e guarda de segredos | A IA usa `$NOME` sem ver o valor |
| ⚙️ | MCP Azure DevOps on-prem e DBHub somente leitura | Cards, PRs e banco sem sair do Claude |

✅ ganho medido no [benchmark](bench/README.md) · ⏳ ainda não medido isolado · ⚙️ funcionalidade (o
check, o guarda de segredos e o fluxo de spec não mostraram ganho no benchmark; ficam pelo uso real)

## Limitações conhecidas

- **O custo do advisor no uso real ainda não foi medido.** No benchmark, com tarefas curtas, ele não consultou
  o Opus nenhuma vez. Numa sessão longa e difícil pode consultar mais, e cada consulta conta na cota. Nas
  primeiras semanas, acompanhe o `5h` e o `7d` da statusline. Para desligar, veja o
  [Guia](docs/GUIA.md).
- **O fluxo de spec custa cerca de 5× uma tarefa feita direto.** No benchmark, sem ninguém revisando a spec, ele
  acertou 24/24 contra 22/24 do kit sem spec, diferença que pode ser acaso. O tlc-spec-lean, comparado junto,
  acertou o mesmo por mais. Use o OpenSpec quando houver regra para você revisar; para tarefa pequena, peça direto
  ([números](bench/README.md#resultados-19112026)).
- **O kit depende de recursos do Claude Code que mudam entre versões** (hooks, settings, plugins). Se algo
  parar depois de atualizar o Claude Code, rode `cctk doctor`.
- **No Windows, comandos de terminal não ficam em sandbox.** As travas cobrem leitura de segredos e
  Edit/Write, não o que o Claude roda no shell.

## Desinstalar

```
cctk restore           # a configuração de antes do kit
cctk restore <data>    # um backup específico (lista em ~/.cctk/backups/)
```

Devolve sua configuração, seus plugins e MCPs, e tira os plugins do kit. Se quiser, apague à mão a pasta
`~/.cctk/` e rode `npm uninstall -g @alfredoneeto/cctk @fission-ai/openspec @playwright/cli`.

## Perguntas frequentes

**Vou perder meus plugins, MCPs e skills?**
Na primeira instalação, sim, com backup em `~/.cctk/backups/`; o `cctk restore` devolve tudo. As atualizações não
removem nada.

**Posso usar o Opus?**
Sim: `claude --model opus` para planejar. O kit abre no Sonnet porque, no benchmark, ele fez as mesmas tarefas
por cerca de metade do custo.

**Como desligo uma peça, como o advisor?**
Apague `"advisorModel"` do `~/.claude/settings.json`. O próximo `cctk install` o recoloca
([Deu problema?](docs/GUIA.md#deu-problema)).

**O time inteiro precisa instalar?**
Cada pessoa roda `cctk install` uma vez. O `/cctk:init-project` grava no repositório o Sonnet e a sugestão do
plugin, então quem clona já recebe o mesmo jeito de trabalhar.

**Funciona no Windows?**
Sim. A diferença é que lá os comandos de terminal não ficam em sandbox; as travas de segredo e de Edit/Write valem.

**O kit manda dados para algum lugar?**
Sem telemetria. O `stats` lê só as transcrições locais. O context7 recebe suas buscas de documentação, e o MCP do
Azure DevOps fala só com o seu servidor.

## Problemas e contribuições

Encontrou um bug ou tem uma sugestão? Abra uma [issue](https://github.com/AlfredoNeeto/cctk/issues) com a
saída do `cctk doctor`. Para desenvolver, rodar os testes ou o benchmark, veja o
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

[MIT](LICENSE)
