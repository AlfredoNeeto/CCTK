# Claude Toolkit Dev

Um kit que configura o Claude Code para o **plano Pro render mais sem perder qualidade**:
- **Sonnet como padrão:** no nosso benchmark, ele fez as mesmas tarefas por cerca de metade do custo do Opus
  (em custo de API), com a mesma qualidade.
- **Segurança:** regras que impedem o Claude de ler `.env` e chaves.
- **Spec antes do código**, com o OpenSpec.
- **Uso à vista**, na statusline e no `stats`.

Tudo o que entrou foi medido; o que não ajudou ficou de fora. Os números estão em
[bench/README.md](bench/README.md).

Versão: **1.0.0**.

## Instalar

Você precisa de:
- [Claude Code](https://code.claude.com), já com login feito;
- [Node 22.20+](https://nodejs.org);
- [git](https://git-scm.com).

O [uv](https://docs.astral.sh/uv/getting-started/installation/) é recomendado: sem ele, só o
`/toolkit-dev:convert` não funciona.

Feche todas as sessões do Claude Code e rode num terminal comum (PowerShell, Terminal, bash):

```
npx github:AlfredoNeeto/claude-toolkit#v1.0.0 install
```

O instalador:
1. **faz backup** da sua configuração do Claude Code em `~/.claude-toolkit/backups/<data>/`;
2. **remove** plugins, MCPs de usuário, skills, agents, commands e output styles que você tem, para o kit
   rodar como foi medido;
3. grava a configuração do kit e instala o plugin `toolkit-dev`, o OpenSpec e o Playwright CLI;
4. pergunta se você usa Azure DevOps Server (on-premises). Se não usa, responda `n`.

Ele **não toca** no histórico de conversas, na memória nem no login.

**Voltar ao que era antes**, a qualquer momento:

```
npx github:AlfredoNeeto/claude-toolkit#v1.0.0 restore
```

## Primeiros passos

1. Abra o Claude Code dentro de um projeto: `cd meu-projeto` e depois `claude`.
2. Rode `/toolkit-dev:init-project`. Ele:
   - descobre a stack;
   - escreve o `AGENTS.md` e o `CLAUDE.md` do projeto;
   - grava o **check** (o comando de build/teste que o Claude roda antes de encerrar);
   - inicializa o OpenSpec;
   - deixa o projeto em Sonnet;
   - oferece Azure DevOps e acesso somente leitura ao banco.

   Commite o que ele criar: o time inteiro passa a usar a mesma configuração.
3. Peça uma tarefa pequena e veja a statusline:

   ```
   Sonnet | ctx 12% | 5h 8% (reset 14:30) | 7d 21% (reset 24/11 09:00)
   ```

   | Campo | O que mostra |
   |---|---|
   | Modelo | Aparece `Opus ⚠ mais caro` quando a sessão está no Opus |
   | `ctx` | Quanto da janela de contexto já foi usado |
   | `5h` e `7d` | Quanto da cota do Pro você já gastou e quando ela volta |

   Um `!` aparece a partir de 80%.

## Como usar no dia a dia

**Mudança pequena** (até uns 3 arquivos, sem regra nova): um pedido específico, com o sintoma, onde
olhar e o que define "pronto".

**Feature ou bug com regra de negócio:** escreva a regra antes do código. Os erros vêm muito mais do que o
pedido não diz do que da dificuldade da tarefa.

| Etapa | Sessão | Comando |
|---|---|---|
| Requisitos em Markdown | qualquer | `/toolkit-dev:convert requisitos.pdf` |
| Propor | A: `claude --model opus` | `/openspec-propose <ideia> @docs/requisitos.md` |
| Revisar | você | Leia `openspec/changes/<nome>/` e corrija agora (sai barato) |
| Implementar | B: `claude` (Sonnet), sessão nova | `/openspec-apply-change` |
| Verificar | B | `/openspec-verify-change` e depois "use o spec-reviewer na mudança <nome>" |
| Arquivar | B | `/openspec-archive-change`, e depois `/clear` |

**Dicas que economizam cota:**
- **Opus só para planejar.** Use o Sonnet para implementar.
- **Escolha o modelo ao abrir a sessão.** Trocar com `/model` no meio faz o Claude reler a conversa sem o
  desconto do cache. Pelo mesmo motivo, não use `opusplan`.
- **Muitas regras e casos de borda** (validação, importação, cálculo): rode `/effort high` na própria
  sessão. Em tarefa simples, volte para `/effort medium`.
- **`/clear` entre tarefas não relacionadas.**

**O check obrigatório:**
- Quando o Claude editou algo, ele só encerra com o check do projeto passando (`.claude/toolkit.json`). Se
  o check falha, o Claude corrige e tenta de novo.
- O check tem **limite de 3 minutos**. Se passar disso, ou se ficar preso em modo watch, ele é
  interrompido, a sessão segue e aparece um aviso para você trocar por um comando mais rápido.
- Se o Claude parar duas vezes sem conseguir consertar, o gate desiste, para não entrar em loop.

**Ver seu uso por semana:**

```
npx github:AlfredoNeeto/claude-toolkit#v1.0.0 stats        # últimos 28 dias (ou: stats 7)
```

Ele mostra:
- sessões, tokens e taxa de cache;
- quanto foi no Opus;
- trocas de modelo no meio da sessão;
- quantas vezes o check pegou um erro que o Claude depois corrigiu.

Ele lê só as transcrições locais; nada sai da máquina.

## Comandos

| Comando | Para quê |
|---|---|
| `npx github:AlfredoNeeto/claude-toolkit#v1.0.0 install` | Instala ou reinstala o kit |
| `... restore [data]` | Volta ao backup mais recente (ou ao da data; lista em `~/.claude-toolkit/backups/`) |
| `... stats [dias]` | Uso por semana |
| `... secret set\|list\|rm NOME` | Cofre de variáveis |
| `... ado add URL` | Cadastra uma collection do Azure DevOps Server |
| `/toolkit-dev:init-project` | Prepara o repositório |
| `/toolkit-dev:audit <url>` | Diz se uma skill, plugin, MCP ou repositório é seguro **antes** de instalar |
| `/toolkit-dev:convert <arquivo>` | PDF/DOCX/PPTX/XLSX → Markdown em `docs/` |
| `/toolkit-dev:secret` | Ajuda do cofre |

Comandos nativos que valem lembrar: `/usage` (o que consome a cota), `/context`, `/security-review` e
`/code-review`.

## O que vem instalado

| Tipo | Item | Para quê |
|---|---|---|
| Configuração | Sonnet, esforço medium, estilo Concise, subagentes em Sonnet, sem sugestões de prompt | Custo menor por mensagem. As sugestões de prompt fazem uma requisição extra depois de cada resposta |
| Regras | `permissions.deny` | Bloqueia leitura de `.env`, `.env.*`, `secrets/`, `*.pem`, `*.pfx`, `*.key`, `dbhub.toml`, `~/.ssh` e user-secrets do .NET |
| Statusline | modelo (aviso no Opus), contexto, uso de 5h e 7 dias com reset | Ver a cota antes de ela acabar |
| Hook | **check obrigatório** (limite de 3 min) | O Claude só encerra com o build/teste do projeto passando |
| Hook | **cofre de variáveis** | A IA usa `$NOME` sem ver o valor |
| Hook | **guarda de segredos** | Bloqueia `printenv`, `echo $SEGREDO`, `Get-ChildItem env:` e leitura do cofre |
| Plugin | `security-guidance` (oficial) | Revisa as edições durante a sessão |
| MCP | context7 | Documentação atualizada de bibliotecas |
| MCP | Azure DevOps on-prem (se você usa) | Um por collection: `ado-<collection>` |
| MCP | Banco somente leitura (por projeto) | DBHub, oferecido pelo `init-project` |
| SDD | OpenSpec 2.1 | Spec antes do código, spec viva depois |
| CLI + skill | Playwright CLI 0.1.25 (projetos web) | O Claude abre o app no Chrome e confere a tela antes de dizer "pronto" |
| Skills | `init-project`, `audit`, `convert`, `secret` | Veja "Comandos" |
| Subagentes | `spec-reviewer`, `third-party-auditor` | Revisão do diff contra a spec; análise do `/audit` |

## Cofre de variáveis

```
npx github:AlfredoNeeto/claude-toolkit#v1.0.0 secret set API_TOKEN   # pede o valor sem mostrar
npx github:AlfredoNeeto/claude-toolkit#v1.0.0 secret list
npx github:AlfredoNeeto/claude-toolkit#v1.0.0 secret rm API_TOKEN
```

No início de cada sessão, a IA recebe só os nomes e usa `$API_TOKEN` nos comandos. Limites:
- O bloqueio evita o vazamento **acidental**. Um programa escrito pela IA ainda consegue ler o próprio
  ambiente. Guarde no cofre só credenciais de desenvolvimento.
- O arquivo `~/.claude-toolkit/secrets.env` fica em texto puro, protegido por permissão de arquivo e pelas
  regras de bloqueio. No Windows, valores com `/` ou `\` não chegam ao PowerShell.

## Azure DevOps Server (on-premises)

```
npx github:AlfredoNeeto/claude-toolkit#v1.0.0 ado add https://servidor/tfs/MinhaCollection
```

- Cada collection vira um MCP `ado-<collection>`. Pode cadastrar quantas quiser.
- O PAT fica no **cofre do sistema** (DPAPI no Windows, Keychain no macOS, libsecret no Linux). Só o
  processo do MCP o recebe; o shell da IA, não.
- Crie o PAT com o **escopo mínimo** (Code: Read; Work Items: Read & Write se for atualizar cards) e
  **validade curta**.
- O servidor precisa estar com a autenticação básica do IIS **desligada**, senão o PAT não funciona.
- Certificado interno da empresa: defina `NODE_EXTRA_CA_CERTS=<caminho do .pem>` nas variáveis do usuário
  antes de abrir o Claude Code.
- O MCP é o [Tiberriver256/mcp-server-azure-devops](https://github.com/Tiberriver256/mcp-server-azure-devops),
  fixado na versão 0.1.54. O MCP oficial da Microsoft só atende o Azure DevOps Services (nuvem).

## Deu problema?

| Sintoma | O que fazer |
|---|---|
| "Rode o instalador num terminal comum" | Feche o Claude Code e rode o `install` fora dele |
| "Falta instalar: ..." | Instale o que a mensagem lista (Node 22.20+, git ou Claude Code) e rode de novo |
| Aviso de que o check passou de 3 min | Troque o `check` em `.claude/toolkit.json` por algo mais rápido (só build e typecheck) |
| O Claude insiste num check que já estava quebrado | Conserte o projeto ou ajuste o `check`; o gate desiste sozinho na segunda parada sem edição |
| Um comando foi "Bloqueado pelo toolkit" | O comando ia mostrar um segredo. Peça para usar a variável por referência (`$NOME`) |
| Quero minha configuração antiga | `npx github:AlfredoNeeto/claude-toolkit#v1.0.0 restore` |
| Atualizar para uma versão nova | Rode o `install` com a tag nova (por exemplo, `#v1.1.0`) |

Para relatar um problema, mande a saída do comando e o resultado de `claude --version`.

## Segurança antes de instalar coisas de terceiros

Rode `/toolkit-dev:audit <url>` antes de `/plugin install`, `claude mcp add`, `npx` ou de abrir um
repositório desconhecido no Claude Code. Uma análise da Snyk em 3.984 skills públicas achou falhas em
36,82% delas e código malicioso confirmado em 76.

## Escolhas e o que ficou de fora

- **Por que o Playwright CLI, e não o MCP do Playwright?** O CLI não carrega esquemas nem a árvore de
  acessibilidade da página no contexto. Não use `playwright-cli attach` no seu Chrome pessoal: ele dá ao
  agente as suas sessões logadas.
- **MarkItDown ou Docling?** O `/toolkit-dev:convert` usa o MarkItDown (leve) e só passa para o Docling
  (pesado, com OCR e tabelas) quando o PDF precisa.
- **Avaliado e fora:** rtk, plugins LSP, subagentes em Haiku, regras extras no CLAUDE.md e outros. Os
  motivos e os números estão em [bench/README.md](bench/README.md).

## Desenvolvimento

```
npm test                                             # instalador, hooks e ponta a ponta (HOME e binários falsos)
E2E_REAL=1 npm test                                  # + claude real numa HOME isolada (PowerShell: $env:E2E_REAL=1; npm test)
TOOLKIT_MARKETPLACE=/caminho/do/clone node cli.mjs install   # instala a partir do clone local
node bench/run.mjs --dry                             # benchmark: veja bench/README.md
```

**Para lançar uma versão:**
1. suba `version` em `package.json` e `plugins/toolkit-dev/.claude-plugin/plugin.json`, e o `"ref"` no
   `init-project` (um teste confere os três);
2. commite;
3. crie a tag `vX.Y.Z` e faça o push da `main` e da tag.
