# Guia do dia a dia

Como trabalhar com o Claude Code depois de instalar o kit. Leva 5 minutos para ler.

[← Voltar ao README](../README.md)

- [Um dia típico](#um-dia-típico)
- [Ler a statusline](#ler-a-statusline)
- [Tarefa pequena](#tarefa-pequena)
- [Feature ou bug com regra de negócio](#feature-ou-bug-com-regra-de-negócio)
- [Economizar cota](#economizar-cota)
- [O check antes de encerrar](#o-check-antes-de-encerrar)
- [Documentos e ferramentas de terceiros](#documentos-e-ferramentas-de-terceiros)
- [Tokens e senhas (cofre)](#tokens-e-senhas-cofre)
- [Azure DevOps Server](#azure-devops-server)
- [Deu problema?](#deu-problema)

## Um dia típico

```
cd meu-projeto
claude                      # abre no Sonnet: o modelo do dia a dia
```

1. **Pedido pequeno?** Peça direto ([como pedir](#tarefa-pequena)).
2. **Terminou?** `/clear` antes do próximo assunto.
3. **Feature com regra de negócio?** Planeje no Opus, implemente no Sonnet ([fluxo](#feature-ou-bug-com-regra-de-negócio)).
4. **No fim da semana:** `npx github:AlfredoNeeto/claude-toolkit#v1.0.2 stats` mostra para onde foi a cota.

Primeira vez num repositório? Rode `/toolkit-dev:init-project` uma vez e commite o que ele criar.

## Ler a statusline

```
Sonnet | ctx 12% | 5h 8% (reset 14:30) | 7d 21% (reset 24/11 09:00)
```

| Campo | O que fazer |
|---|---|
| `Sonnet` | Tudo certo. Se aparecer `Opus ⚠ mais caro`, só continue se estiver planejando |
| `ctx 12%` | Contexto usado. Perto de 80% (`!`), termine a tarefa e dê `/clear` |
| `5h` / `7d` | Cota do Pro gasta e quando ela volta. Com `!` (80%+), deixe o que for grande para depois do reset |

## Tarefa pequena

Até uns 3 arquivos. O que mais faz o Claude errar é o que o pedido não diz, então diga três coisas:
**o sintoma**, **onde olhar** e **o que é "pronto"**.

> ❌ "o desconto tá errado, arruma"
>
> ✅ "Cupom de 15% num pedido de R$ 99,90 dá R$ 84,92, mas o certo é R$ 84,91 (arredondar para baixo
> no centavo). A conta fica em `src/desconto.js`. Pronto = esse caso num teste e `npm test` passando."

## Feature ou bug com regra de negócio

Use o OpenSpec: a regra fica escrita **antes** do código, e você revisa a regra, não o código.

| # | Onde | O que fazer |
|---|---|---|
| 1 | `claude --model opus` | `/openspec-propose <ideia> @docs/requisitos.md` |
| 2 | você | Leia `openspec/changes/<nome>/` e corrija o que estiver errado. É a etapa mais barata para corrigir |
| 3 | `claude` (Sonnet), sessão nova | `/openspec-apply-change` |
| 4 | mesma sessão | `/openspec-verify-change` e depois "use o spec-reviewer na mudança <nome>" |
| 5 | mesma sessão | `/openspec-archive-change` e `/clear` |

Uma mudança por sessão de implementação.

## Economizar cota

1. **Opus só para planejar.** O Sonnet fez as mesmas tarefas por cerca de metade do custo ([benchmark](../bench/README.md)).
2. **Escolha o modelo ao abrir.** Trocar com `/model` no meio relê a conversa sem o desconto do cache.
   Pelo mesmo motivo, evite o `opusplan`.
3. **`/effort high` só em tarefa com muitas regras** (validação, importação, cálculo). Depois, `/effort medium`.
4. **`/clear` entre assuntos diferentes.**

## O check antes de encerrar

O `init-project` grava em `.claude/toolkit.json` um **check**: o comando de build e teste do projeto.
Se o Claude editou código, ele só encerra quando o check passa.

- Limite de **3 minutos**. Passou disso (ou ficou preso em modo watch)? O check é interrompido, a sessão segue
  e aparece um aviso. Troque o `check` por algo mais rápido, como só build e typecheck.
- Se o Claude parar duas vezes sem conseguir consertar, o check desiste, para não entrar em loop.

## Documentos e ferramentas de terceiros

| Quando | Comando |
|---|---|
| Os requisitos estão em PDF, DOCX, PPTX ou XLSX | `/toolkit-dev:convert requisitos.pdf` → gera `docs/requisitos.md`, e você cita com `@docs/requisitos.md` |
| Vai instalar uma skill, plugin, MCP ou rodar um repo de terceiros | `/toolkit-dev:audit <url>` **antes**. Ele analisa sem executar nada |

## Tokens e senhas (cofre)

Dê ao Claude um token de desenvolvimento sem que ele veja o valor:

```
npx github:AlfredoNeeto/claude-toolkit#v1.0.2 secret set API_TOKEN   # pede o valor sem mostrar
npx github:AlfredoNeeto/claude-toolkit#v1.0.2 secret list
npx github:AlfredoNeeto/claude-toolkit#v1.0.2 secret rm API_TOKEN
```

Na sessão, o Claude recebe só o nome e usa `$API_TOKEN` nos comandos.

- Isso evita o vazamento **acidental**. Um programa escrito pela IA ainda consegue ler o próprio ambiente,
  então guarde só credenciais de desenvolvimento.
- O arquivo `~/.claude-toolkit/secrets.env` fica em texto puro, protegido por permissão de arquivo e pelas
  regras de bloqueio.
- No Windows, valores com `/` ou `\` não chegam ao PowerShell.

## Azure DevOps Server

Para servidores on-premises (o MCP oficial da Microsoft só atende a nuvem):

```
npx github:AlfredoNeeto/claude-toolkit#v1.0.2 ado add https://servidor/tfs/MinhaCollection
```

- Cada collection vira um MCP `ado-<collection>`. Pode cadastrar quantas quiser.
- O PAT fica no cofre do sistema (DPAPI, Keychain ou libsecret). Só o MCP o recebe.
- Crie o PAT com escopo mínimo (Code: Read; Work Items: Read & Write para atualizar cards) e validade curta.
- A autenticação básica do IIS precisa estar **desligada**, senão o PAT não funciona.
- MCP usado: [Tiberriver256/mcp-server-azure-devops](https://github.com/Tiberriver256/mcp-server-azure-devops) 0.1.54.

## Deu problema?

| Sintoma | O que fazer |
|---|---|
| "Rode o instalador num terminal comum" | Feche o Claude Code e rode o `install` fora dele |
| "Falta instalar: ..." | Instale o que a mensagem lista e rode de novo |
| Aviso de que o check passou de 3 min | Troque o `check` em `.claude/toolkit.json` por algo mais rápido |
| O Claude insiste num check que já estava quebrado | Conserte o projeto ou ajuste o `check`. O check desiste na segunda parada sem edição |
| "Bloqueado pelo toolkit" | O comando ia mostrar um segredo. Peça para usar a variável (`$NOME`) |
| Quero a configuração antiga | `npx github:AlfredoNeeto/claude-toolkit#v1.0.2 restore` |
| Atualizar o kit | Rode o `install` com a tag nova, por exemplo `#v1.1.0` |
| Certificado corporativo (proxy) | Defina `NODE_EXTRA_CA_CERTS=<caminho do .pem>` nas variáveis de ambiente do usuário |

Não resolveu? Abra uma [issue](https://github.com/AlfredoNeeto/claude-toolkit/issues) com a saída do comando,
o `claude --version` e o seu sistema operacional.
