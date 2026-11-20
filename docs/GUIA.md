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
4. **No fim da semana:** `cctk stats` mostra para onde foi a cota.

Primeira vez num repositório? Rode `/cctk:init-project` uma vez, commite o que ele criar e
[aprove o check](#o-check-antes-de-encerrar).

## Ler a statusline

```
Sonnet | ctx 12% | cache 87% | 5h 8% (reset 14:30) | 7d 21% (reset 24/11 09:00)
```

| Campo | O que fazer |
|---|---|
| `Sonnet` | Tudo certo. Se aparecer `Opus ⚠ mais caro`, só continue se estiver planejando |
| `ctx 12%` | Contexto usado. Perto de 80% (`!`), termine a tarefa e dê `/clear` |
| `cache 87%` | Quanto da conversa veio do cache, que custa bem menos. Com `frio`, a pausa passou da validade do cache e a próxima mensagem reenvia a conversa inteira a preço cheio: com contexto grande, prefira `/clear` e retome com um resumo |
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

O `init-project` grava em `.claude/cctk.json` um **check**: o comando de build e teste do projeto.
Se o Claude editou código, ele só encerra quando o check passa. Isso vale também para edições feitas por
comando no terminal (`sed -i`, `cat > arquivo`), num repositório git. Editar só `.md`, `.txt` ou arquivos em
`openspec/` não dispara o check.

- **O que você muda não conta.** Edições na IDE, `git pull` ou troca de branch entre uma mensagem e outra
  não disparam o check. A exceção: se você editar código **enquanto** o Claude responde, e ele rodar algum
  comando no terminal nessa resposta, o check roda no fim dela.

- **Aprove o check uma vez por projeto.** O `cctk.json` vem com o repositório, então um repo clonado
  ou um PR poderia trazer qualquer comando. O kit só roda o check depois que você aprova, num terminal,
  na pasta do projeto:
  ```
  cctk trust
  ```
  Se o comando mudar (num pull, num PR ou porque o Claude editou o arquivo), o kit avisa e pede aprovação
  de novo. O Claude não consegue aprovar sozinho.

- Limite de **3 minutos**. Passou disso (ou ficou preso em modo watch)? O check é interrompido, a sessão segue
  e aparece um aviso. Troque o `check` por algo mais rápido, como só build e typecheck.
- Se o Claude parar duas vezes sem conseguir consertar, o check desiste, para não entrar em loop.

## Documentos e ferramentas de terceiros

| Quando | Comando |
|---|---|
| Os requisitos estão em PDF, DOCX, PPTX ou XLSX | `/cctk:convert requisitos.pdf` → gera `docs/requisitos.md`, e você cita com `@docs/requisitos.md` |
| Vai instalar uma skill, plugin, MCP ou rodar um repo de terceiros | `/cctk:audit <url>` **antes**. Ele analisa sem executar nada |

## Tokens e senhas (cofre)

Dê ao Claude um token de desenvolvimento sem que ele veja o valor:

```
cctk secret set API_TOKEN   # pede o valor sem mostrar
cctk secret list
cctk secret rm API_TOKEN
```

Na sessão, o Claude recebe só o nome e usa `$API_TOKEN` nos comandos.

- Isso evita o vazamento **acidental**. Um programa escrito pela IA ainda consegue ler o próprio ambiente,
  então guarde só credenciais de desenvolvimento.
- Os valores ficam criptografados no cofre do sistema (DPAPI, Keychain ou libsecret), como o PAT do Azure
  DevOps. Em `~/.cctk/secrets.names` ficam só os nomes. Quem tinha a 1.2.0 tem o cofre em texto puro
  migrado no `cctk install`.
- No Windows, valores com `/` ou `\` não chegam ao PowerShell.

## Azure DevOps Server

Para servidores on-premises (o MCP oficial da Microsoft só atende a nuvem):

```
cctk ado add https://servidor/tfs/MinhaCollection
```

- Cada collection vira um MCP `ado-<collection>`. Pode cadastrar quantas quiser.
- O PAT fica no cofre do sistema (DPAPI, Keychain ou libsecret). Só o MCP o recebe.
- Crie o PAT com escopo mínimo (Code: Read; Work Items: Read & Write para atualizar cards) e validade curta.
- A autenticação básica do IIS precisa estar **desligada**, senão o PAT não funciona.
- MCP usado: [Tiberriver256/mcp-server-azure-devops](https://github.com/Tiberriver256/mcp-server-azure-devops) 0.1.54.

## Deu problema?

Comece pelo `doctor`. Ele confere a instalação e diz o que fazer em cada item que falhou:

```
cctk doctor
```

| Sintoma | O que fazer |
|---|---|
| "Rode o instalador num terminal comum" | Feche o Claude Code e rode o `install` fora dele |
| "O check deste projeto ainda não foi aprovado" | Confira o comando e rode o `trust` na pasta do projeto ([o check](#o-check-antes-de-encerrar)) |
| "Falta instalar: ..." | Instale o que a mensagem lista e rode de novo |
| Aviso de que o check passou de 3 min | Troque o `check` em `.claude/cctk.json` por algo mais rápido |
| O Claude insiste num check que já estava quebrado | Conserte o projeto ou ajuste o `check`. O check desiste na segunda parada sem edição |
| "Bloqueado pelo toolkit" | O comando ia mostrar um segredo. Peça para usar a variável (`$NOME`) |
| "o commit leva credenciais" | Tire o valor do arquivo (variável de ambiente ou `cctk secret set`) e refaça o `git add`. Valor falso de teste: faça o commit você mesmo, no terminal. Senha em connection string (`Password=`) não bloqueia: o Claude só recebe um aviso |
| "blocks writes outside the working directories" | O Claude só edita (Edit/Write) dentro do projeto e da pasta de repositórios que você indicou no `install`. Outra pasta: `/add-dir <pasta>`. Para trocar a pasta de repositórios, edite `permissions.additionalDirectories` no `~/.claude/settings.json`. A trava não cobre comandos de terminal |
| Um MCP seu parou de achar uma variável de ambiente | Os MCPs não herdam mais o ambiente inteiro. Declare a variável no `env` do servidor, como `"env": { "MINHA_KEY": "${MINHA_KEY}" }` |
| Quero a configuração antiga | `cctk restore` |
| Atualizar o kit | `cctk update`. Seus plugins, MCPs, permissões e variáveis ficam, e o `restore` ainda volta à configuração de antes do kit |
| `cctk` não é reconhecido | Instale a CLI: `npm i -g cctk` e abra um terminal novo |
| Tinha o Claude Toolkit Dev (até 1.1.2) | `npm i -g cctk` e `cctk install`: ele migra o cofre, os backups e o Azure DevOps e tira o plugin antigo |
| Certificado corporativo (proxy) | Defina `NODE_EXTRA_CA_CERTS=<caminho do .pem>` nas variáveis de ambiente do usuário |

Não resolveu? Abra uma [issue](https://github.com/AlfredoNeeto/cctk/issues) com a saída do comando,
o `claude --version` e o seu sistema operacional.
