# Claude Toolkit Dev

Faz o plano Pro do Claude Code render mais, sem perder qualidade.

![versão](https://img.shields.io/badge/vers%C3%A3o-1.0.0-blue) ![licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green) ![node](https://img.shields.io/badge/node-%E2%89%A5%2022.20-339933) ![claude code](https://img.shields.io/badge/Claude%20Code-plugin-D97757)

[Instalar](#instalar) · [Primeiros passos](#primeiros-passos) · [Comandos](#comandos) · [Desinstalar](#desinstalar-ou-voltar-atrás) · [Benchmark](bench/README.md)

```text
# statusline: o modelo, o contexto e a cota do Pro, sempre à vista
Sonnet | ctx 12% | 5h 8% (reset 14:30) | 7d 21% (reset 24/11 09:00)
Opus ⚠ mais caro | ctx 40% | 5h 81%! (reset 14:30) | 7d 55% (reset 24/11 09:00)

# npx github:AlfredoNeeto/claude-toolkit#v1.0.0 stats   (números de exemplo)
Semana de 16/11/2026
  Sessões: 14 · tokens sem cache: 2.961.823 · releitura de cache: 66.331.239 (96% da entrada)
  Modelos (tokens sem cache): opus 72%, sonnet 28%
  ⚠ 72% no Opus. No benchmark, em custo de API, a mesma tarefa no Sonnet custou cerca de metade, com a
    mesma qualidade (o peso na cota do Pro não é documentado). Use o Opus só para planejar.
  Check-gate: 3 bloqueios, 2 sessões em que o Claude corrigiu e o check passou, 0 desistências
```

## Em 30 segundos

- **Sonnet como padrão.** No [benchmark](bench/README.md), ele fez as mesmas tarefas por cerca de metade
  do custo de API do Opus, com a mesma qualidade nas tarefas bem especificadas.
- **Segredos protegidos.** Pedimos ao Claude de fábrica para conferir o `.env`, e ele leu o token em 3 de
  3 execuções. Com o kit, 0 de 3: o `.env`, as chaves e o `~/.ssh` ficam bloqueados.
- **Spec antes do código.** Os erros vieram muito mais do que o pedido não dizia do que da dificuldade da
  tarefa. O kit traz o OpenSpec para escrever as regras antes.
- **Uso à vista.** A statusline mostra o modelo e a cota, e o `stats` mostra o seu uso por semana.

Tudo o que entrou foi medido ou está marcado como "ainda não medido". O que não ajudou ficou de fora.

## Para quem é

**Use se:**
- você usa o plano Pro e a cota acaba antes da semana;
- quer um padrão de trabalho (spec, check, segurança) igual para o time inteiro.

**Não vale a pena se:**
- você não quer perder os seus plugins, MCPs e skills atuais: a instalação remove tudo, com backup;
- você está no Max e prefere o Opus em tudo. O kit empurra para o Sonnet.

## Instalar

**1. Confira os pré-requisitos** num terminal comum:

```
claude --version   # Claude Code, já com login feito: https://code.claude.com
node --version     # 22.20 ou mais novo: https://nodejs.org
git --version      # https://git-scm.com
```

Recomendado: o [uv](https://docs.astral.sh/uv/getting-started/installation/). Sem ele, só o
`/toolkit-dev:convert` não funciona.

**2. Feche todas as sessões do Claude Code e rode:**

```
npx github:AlfredoNeeto/claude-toolkit#v1.0.0 install
```

> [!WARNING]
> A instalação **remove** os plugins, MCPs de usuário, skills, agents, commands e output styles que você
> tem, para o kit rodar como foi medido. Antes, ela faz **backup** em `~/.claude-toolkit/backups/`.
> O `restore` volta tudo. Histórico de conversas, memória e login não são tocados.

<details>
<summary>O que o instalador faz, passo a passo</summary>

1. Confere os pré-requisitos e mostra o que vai ser removido, pedindo confirmação.
2. Faz backup de `settings.json`, `CLAUDE.md`, plugins, skills, agents, commands, output styles e MCPs.
3. Remove os plugins, os MCPs de usuário e as pastas de skills, agents, commands e output styles.
4. Grava a configuração do kit (`~/.claude/settings.json` e `~/.claude/CLAUDE.md`) e a statusline.
5. Instala o OpenSpec e o Playwright CLI (npm global), o plugin `toolkit-dev` e o plugin oficial
   `security-guidance`. O plugin fica fixado na versão `v1.0.0`.
6. Pergunta se você usa Azure DevOps Server (on-premises). Se não usa, responda `n`.

</details>

<details>
<summary>Windows</summary>

- Rode no PowerShell ou no Terminal do Windows, fora do Claude Code.
- Se a sua empresa usa certificado próprio (proxy corporativo), defina `NODE_EXTRA_CA_CERTS=<caminho do
  .pem>` nas variáveis de ambiente do usuário antes de instalar e de abrir o Claude Code.
- No cofre de variáveis, valores com `/` ou `\` não chegam ao PowerShell.

</details>

## Primeiros passos

**1. Abra o Claude Code dentro de um projeto:**

```
cd meu-projeto
claude
```

Você deve ver a statusline no rodapé, começando por `Sonnet`.

**2. Rode `/toolkit-dev:init-project`.** Ele descobre a stack e cria:
- o `AGENTS.md` e o `CLAUDE.md` do projeto;
- o `.claude/toolkit.json`, com o **check**: o comando de build e teste que o Claude roda antes de
  encerrar;
- a pasta `openspec/`;
- o `.claude/settings.json` do projeto, com Sonnet como modelo.

Ele também oferece Azure DevOps e acesso somente leitura ao banco. Commite esses arquivos: o time inteiro
passa a trabalhar igual.

**3. Peça uma tarefa pequena e acompanhe a statusline:**

| Campo | O que mostra |
|---|---|
| `Sonnet` / `Opus ⚠ mais caro` | O modelo da sessão. O aviso aparece quando ela está no Opus |
| `ctx 12%` | Quanto da janela de contexto já foi usado |
| `5h` e `7d` | Quanto da cota do Pro você já gastou e quando ela volta. O `!` aparece a partir de 80% |

Se você editou código, o Claude só encerra depois que o check passar.

## No dia a dia

| O que você quer fazer | Comece por |
|---|---|
| Mudança pequena (até uns 3 arquivos) | Um pedido específico: o sintoma, onde olhar e o que define "pronto" |
| Feature ou bug com regra de negócio | O fluxo OpenSpec abaixo: a regra escrita antes do código |
| Usar um PDF, DOCX ou planilha de requisitos | `/toolkit-dev:convert requisitos.pdf` |
| Instalar uma skill, plugin ou MCP de terceiros | `/toolkit-dev:audit <url>` antes |
| Ver para onde está indo a cota | `/usage` agora, ou o `stats` para o histórico |
| Dar ao Claude um token sem ele ver o valor | `secret set` (ver [Cofre de variáveis](#cofre-de-variáveis)) |

<details>
<summary>Fluxo OpenSpec para feature ou bug com regra de negócio</summary>

| Etapa | Sessão | Comando |
|---|---|---|
| Propor | A: `claude --model opus` | `/openspec-propose <ideia> @docs/requisitos.md` |
| Revisar | você | Leia `openspec/changes/<nome>/` e corrija agora, que sai barato |
| Implementar | B: `claude` (Sonnet), sessão nova | `/openspec-apply-change` |
| Verificar | B | `/openspec-verify-change` e depois "use o spec-reviewer na mudança <nome>" |
| Arquivar | B | `/openspec-archive-change` e depois `/clear` |

Faça uma mudança por sessão de implementação.

</details>

**Para economizar cota:**
- **Use o Opus só para planejar** (`claude --model opus`) e o Sonnet para implementar.
- **Escolha o modelo ao abrir a sessão.** Trocar com `/model` no meio faz o Claude reler a conversa sem o
  desconto do cache. Pelo mesmo motivo, não use `opusplan`.
- **Em tarefa com muitas regras e casos de borda** (validação, importação, cálculo), rode `/effort high`
  na própria sessão. Em tarefa simples, volte para `/effort medium`.
- **Use `/clear` entre tarefas que não têm relação.**

**O check obrigatório:**
- O check tem **limite de 3 minutos**. Se passar disso, ou ficar preso em modo watch, ele é interrompido,
  a sessão segue e aparece um aviso.
- Nesse caso, troque o `check` em `.claude/toolkit.json` por algo mais rápido, como só build e typecheck.
- Se o Claude parar duas vezes sem conseguir consertar, o gate desiste, para não entrar em loop.

## Comandos

**No terminal** (troque `...` por `npx github:AlfredoNeeto/claude-toolkit#v1.0.0`):

| Comando | Para quê |
|---|---|
| `... install` | Instala ou reinstala o kit |
| `... restore [data]` | Volta ao backup mais recente, ou ao de uma data (lista em `~/.claude-toolkit/backups/`) |
| `... stats [dias]` | Uso por semana (padrão: 28 dias) |
| `... secret set\|list\|rm NOME` | Cofre de variáveis |
| `... ado add URL` | Cadastra uma collection do Azure DevOps Server |

**Dentro do Claude Code:**

| Comando | Para quê |
|---|---|
| `/toolkit-dev:init-project` | Prepara ou atualiza o repositório |
| `/toolkit-dev:audit <url>` | Diz se uma skill, plugin, MCP ou repositório é seguro **antes** de instalar |
| `/toolkit-dev:convert <arquivo>` | PDF/DOCX/PPTX/XLSX → Markdown em `docs/` |
| `/toolkit-dev:secret` | Ajuda do cofre |
| `/usage`, `/context`, `/security-review`, `/code-review` | Nativos do Claude Code que valem lembrar |

## O que vem instalado

| Item | Para quê | Medido? |
|---|---|---|
| Sonnet, esforço medium, subagentes em Sonnet | Custo menor por tarefa | **Sim:** cerca de metade do custo de API do Opus |
| `permissions.deny` (`.env`, `secrets/`, chaves, `~/.ssh`, user-secrets do .NET) | O Claude não lê segredos | **Sim:** 3/3 vazamentos de fábrica, 0/3 com o kit |
| Estilo Concise, sugestões de prompt desligadas | Menos tokens de saída e uma requisição a menos por resposta | Pela documentação; não medido isolado |
| Statusline (modelo, contexto, cota de 5h e 7 dias) | Ver a cota antes de acabar | Ferramenta de hábito |
| Check obrigatório (limite de 3 min) | O Claude só encerra com o build/teste passando | Sem ganho no benchmark; o `stats` mede no seu uso real |
| Cofre de variáveis | A IA usa `$NOME` sem ver o valor | Funcionalidade |
| Guarda de segredos | Bloqueia `printenv`, `echo $SEGREDO` e leitura do cofre | Sem ganho medido: o Sonnet já evitou vazar em 10/10. Fica como proteção contra acidente |
| `security-guidance` (plugin oficial) | Revisa as edições durante a sessão | Ainda não, isolado |
| OpenSpec 2.1 | Spec antes do código, spec viva depois | Ainda não. Os dados apontam essa direção |
| Playwright CLI (projetos web) | O Claude abre o app no Chrome e confere a tela | Ainda não |
| MCP context7 | Documentação atualizada de bibliotecas | Ainda não |
| MCP Azure DevOps on-prem (se você usa) e DBHub somente leitura (por projeto) | Cards, PRs e banco sem sair do Claude | Funcionalidade |
| Skills `init-project`, `audit`, `convert`, `secret` e subagentes `spec-reviewer`, `third-party-auditor` | Veja [Comandos](#comandos) | Funcionalidade |

## Cofre de variáveis

<details>
<summary>Usar tokens e senhas de desenvolvimento sem a IA ver o valor</summary>

```
npx github:AlfredoNeeto/claude-toolkit#v1.0.0 secret set API_TOKEN   # pede o valor sem mostrar
npx github:AlfredoNeeto/claude-toolkit#v1.0.0 secret list
npx github:AlfredoNeeto/claude-toolkit#v1.0.0 secret rm API_TOKEN
```

No início de cada sessão, a IA recebe só os nomes e usa `$API_TOKEN` nos comandos. Limites:
- O bloqueio evita o vazamento **acidental**. Um programa escrito pela IA ainda consegue ler o próprio
  ambiente. Guarde no cofre só credenciais de desenvolvimento.
- O arquivo `~/.claude-toolkit/secrets.env` fica em texto puro, protegido por permissão de arquivo e pelas
  regras de bloqueio.

</details>

## Azure DevOps Server

<details>
<summary>Conectar uma ou mais collections on-premises</summary>

```
npx github:AlfredoNeeto/claude-toolkit#v1.0.0 ado add https://servidor/tfs/MinhaCollection
```

- Cada collection vira um MCP `ado-<collection>`. Pode cadastrar quantas quiser.
- O PAT fica no **cofre do sistema** (DPAPI no Windows, Keychain no macOS, libsecret no Linux). Só o
  processo do MCP o recebe; o shell da IA, não.
- Crie o PAT com o **escopo mínimo** (Code: Read; Work Items: Read & Write se for atualizar cards) e
  **validade curta**.
- O servidor precisa estar com a autenticação básica do IIS **desligada**, senão o PAT não funciona.
- O MCP é o [Tiberriver256/mcp-server-azure-devops](https://github.com/Tiberriver256/mcp-server-azure-devops),
  fixado na versão 0.1.54. O MCP oficial da Microsoft só atende o Azure DevOps Services (nuvem).

</details>

## Desinstalar ou voltar atrás

```
npx github:AlfredoNeeto/claude-toolkit#v1.0.0 restore              # backup mais recente
npx github:AlfredoNeeto/claude-toolkit#v1.0.0 restore <data>       # um backup específico
```

O `restore`:
- devolve o `settings.json`, o `CLAUDE.md`, as skills, agents, commands, output styles e MCPs de usuário;
- reinstala os plugins que você tinha;
- tira o plugin `toolkit-dev` e também o `security-guidance`, se você não tinha esse antes.

Sobra só o que fica fora do `~/.claude`. Apague à mão, se quiser:
- `~/.claude-toolkit/`: os backups e o cofre;
- `npm uninstall -g @fission-ai/openspec @playwright/cli`;
- nos projetos, os arquivos que o `init-project` criou.

## Privacidade

- O toolkit **não tem telemetria**.
- O `stats` lê só as transcrições locais em `~/.claude/projects`.
- O MCP context7 envia a sua busca de documentação de biblioteca para `mcp.context7.com`.
- O MCP do Azure DevOps fala só com o seu servidor. O PAT fica no cofre do sistema.

## Deu problema?

| Sintoma | O que fazer |
|---|---|
| "Rode o instalador num terminal comum" | Feche o Claude Code e rode o `install` fora dele |
| "Falta instalar: ..." | Instale o que a mensagem lista e rode de novo |
| Aviso de que o check passou de 3 min | Troque o `check` em `.claude/toolkit.json` por algo mais rápido |
| O Claude insiste num check que já estava quebrado | Conserte o projeto ou ajuste o `check`; o gate desiste na segunda parada sem edição |
| Um comando foi "Bloqueado pelo toolkit" | O comando ia mostrar um segredo. Peça para usar a variável por referência (`$NOME`) |
| Quero a minha configuração antiga | `restore` (ver [Desinstalar](#desinstalar-ou-voltar-atrás)) |
| Atualizar para uma versão nova | Rode o `install` com a tag nova, por exemplo `#v1.1.0` |

Para relatar um problema, abra uma issue com a saída do comando, o resultado de `claude --version` e o seu
sistema operacional.

## Por que essas escolhas

Medimos o Claude Code real, em HOMEs isoladas e com testes ocultos, comparando a configuração de fábrica,
a do kit e cada candidato a peça nova. O que mais pesou no custo foi o modelo. O que mais pesou na
qualidade foi a regra estar escrita ou não. Os plugins LSP, os subagentes em Haiku, o rtk e várias regras
extras para o CLAUDE.md não melhoraram nada, então ficaram de fora.

Os números, o método e a lista do que foi avaliado estão em [bench/README.md](bench/README.md).

## Desenvolvimento

<details>
<summary>Testes, benchmark e como lançar uma versão</summary>

```
npm test                                             # instalador, hooks e ponta a ponta (HOME e binários falsos)
E2E_REAL=1 npm test                                  # + claude real numa HOME isolada (PowerShell: $env:E2E_REAL=1; npm test)
TOOLKIT_MARKETPLACE=/caminho/do/clone node cli.mjs install   # instala a partir do clone local
node bench/run.mjs --dry                             # benchmark: veja bench/README.md
```

**Para lançar uma versão:**
1. suba `version` em `package.json` e em `plugins/toolkit-dev/.claude-plugin/plugin.json`, o `"ref"` no
   `init-project` e as tags `#vX.Y.Z` deste README (um teste confere tudo);
2. commite;
3. crie a tag `vX.Y.Z` e faça o push da `main` e da tag.

</details>

## Licença

[MIT](LICENSE)
