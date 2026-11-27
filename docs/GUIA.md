# Guia do dia a dia

Como trabalhar com o Claude Code depois de instalar o kit. Leva 5 minutos para ler.

[← Voltar ao README](../README.md)

## O que você quer fazer?

| Quero | Vá para |
|---|---|
| Começar: acabei de instalar | [Primeiro uso](#primeiro-uso) |
| Corrigir um bug ou construir uma feature | [Desenvolver](#desenvolver) |
| Mostrar telas ao cliente ou escrever a especificação | [Prototipar e especificar](#prototipar-e-especificar) |
| Escrever pedidos que o Claude acerta de primeira | [Guia de prompts](PROMPTS.md) |
| Dar um token ao Claude sem ele ver o valor | [Tokens e senhas (cofre)](#tokens-e-senhas-cofre) |
| Gastar menos cota | [Economizar cota](#economizar-cota) |
| Resolver um erro | [Deu problema?](#deu-problema) |

Referência: [statusline](#ler-a-statusline) · [o check](#o-check-antes-de-encerrar) ·
[documentos e ferramentas de terceiros](#documentos-e-ferramentas-de-terceiros) · [Azure DevOps Server](#azure-devops-server)

## Primeiro uso

Os passos 1 e 2 são uma vez por máquina; do 3 em diante, uma vez por projeto.

1. **Instale**, num terminal comum, com o Claude Code fechado: `npm i -g @alfredoneeto/cctk` e depois
   `cctk install`. Ele mostra o que vai remover, faz backup e pede confirmação ([detalhes](../README.md#instalar)).
2. **Confira** com `cctk doctor`. Algum item falhou? A linha dele diz o que fazer.
3. **Abra o projeto:** `cd meu-projeto` e `claude`.
4. **Prepare o repositório:** `/cctk:init-project`. Ele descobre a stack e cria `AGENTS.md`, `CLAUDE.md`,
   `openspec/` e o check em `.claude/cctk.json`.
5. **Commite** o que ele criou, para o time receber o mesmo jeito de trabalhar.
6. **Aprove o check**, num terminal na pasta do projeto: `cctk trust`. O Claude não consegue aprovar sozinho
   ([por quê](#o-check-antes-de-encerrar)).
7. **Confira a statusline:** o rodapé do Claude Code deve começar por `Sonnet` ([o que cada campo diz](#ler-a-statusline)).
8. **Faça um pedido pequeno** dizendo o sintoma, onde olhar e o que é "pronto" ([exemplo](#tarefa-pequena)).
   Terminou? `/clear` antes do próximo assunto.

## Um dia típico

```
cd meu-projeto
claude                      # abre no Sonnet: o modelo do dia a dia
```

1. **Pedido pequeno?** Peça direto ([como pedir](#tarefa-pequena)).
2. **Terminou?** `/clear` antes do próximo assunto.
3. **Feature com regra de negócio?** Planeje no Opus, implemente no Sonnet ([fluxo](#feature-ou-bug-com-regra-de-negócio)).
4. **No fim da semana:** `cctk stats` mostra para onde foi a cota.

## Desenvolver

Escolha o caminho pelo pedido:

| O pedido | Caminho | Custo no benchmark |
|---|---|---|
| Até uns 3 arquivos e a regra está clara: bug com sintoma, ajuste, pergunta sobre o código | Peça direto, no Sonnet ([tarefa pequena](#tarefa-pequena)) | US$ 0,10 por tarefa |
| Feature ou bug com regra de negócio que alguém precisa decidir: cálculo, validação, importação | OpenSpec: você revisa a regra antes do código ([fluxo](#feature-ou-bug-com-regra-de-negócio)) | cerca de 5× o pedido direto |

Na dúvida, tente responder "e se...?" para o caso estranho (data no futuro, valor zerado, arquivo repetido). Se
você não sabe a resposta, o Claude também não sabe: é OpenSpec.

Como escrever o pedido nos dois casos: [Guia de prompts](PROMPTS.md).

### Tarefa pequena

Até uns 3 arquivos. O que mais faz o Claude errar é o que o pedido não diz, então diga três coisas:
**o sintoma**, **onde olhar** e **o que é "pronto"**.

> ❌ "o desconto tá errado, arruma"
>
> ✅ "Cupom de 15% num pedido de R$ 99,90 dá R$ 84,92, mas o certo é R$ 84,91 (arredondar para baixo
> no centavo). A conta fica em `src/desconto.js`. Pronto = esse caso num teste e `npm test` passando."

### Feature ou bug com regra de negócio

Use o OpenSpec: a regra fica escrita **antes** do código, e você revisa a regra, não o código.

O fluxo custa cerca de 5× uma tarefa feita direto ([benchmark](../bench/README.md)). Sem a sua revisão no passo
2, ele quase não acerta mais. Então use quando houver regra para revisar; para tarefa pequena, a seção acima basta.

| # | Onde | O que fazer |
|---|---|---|
| 1 | `claude --model opus` | `/openspec-propose <ideia> @docs/requisitos.md` |
| 2 | você | Leia `openspec/changes/<nome>/` e corrija o que estiver errado, começando pela seção **Dimensões** do `proposal.md`: é onde aparece o que o pedido não disse. É a etapa mais barata para corrigir |
| 3 | `claude` (Sonnet), sessão nova | `/openspec-apply-change` |
| 4 | mesma sessão | `/openspec-verify-change` e depois "use o spec-reviewer na mudança <nome>" |
| 5 | mesma sessão | `/openspec-archive-change` e `/clear` |

Uma mudança por sessão de implementação.

**Exemplo.** Juros de boleto pago em atraso:

1. `claude --model opus` e
   `/openspec-propose boleto pago depois do vencimento cobra multa de 2% e juros de 1% ao mês, proporcional aos dias`.
2. Em `openspec/changes/<nome>/proposal.md`, a seção **Dimensões** traz o que o pedido não disse, como "vencimento
   no fim de semana conta como atraso?" e "os juros incidem sobre o valor com ou sem a multa?". Responda ali e
   corrija os `specs/` se a regra saiu errada. Cada resposta vira um teste.
3. `/clear`, `claude` (Sonnet) e `/openspec-apply-change`.
4. `/openspec-verify-change` e "use o spec-reviewer na mudança <nome>". O revisor confere se cada regra tem um
   teste que falharia com a regra errada.
5. `/openspec-archive-change` e `/clear`.

## Prototipar e especificar

Do pedido à especificação aprovada pelo cliente e, depois, ao código. Tudo fica na pasta `prototipo/`.

1. **Peça o protótipo:** `/cctk:prototipo` com as telas e o que cada uma mostra, ou com o print de um sistema
   ([exemplos](#protótipo-de-tela)).
2. **Abra os HTML** de `prototipo/` no navegador e clique. Junte todos os ajustes num pedido só.
3. **Mande ao cliente:** peça **zip** ou **HTML único**. Sem dados reais de cliente.
4. **Peça a especificação**, numa sessão nova: sai `prototipo/especificacao.pdf` (para o cliente) e
   `prototipo/especificacao.md` (para versionar). O que ninguém decidiu sai como questão em aberto: leve essas
   perguntas ao cliente.
5. **Leve ao código** com o OpenSpec: `claude --model opus` e
   `/openspec-propose <feature> @prototipo/especificacao.md`, e siga o [fluxo](#feature-ou-bug-com-regra-de-negócio).

### Protótipo de tela

Para o cliente clicar e aprovar antes de construir. Use `/cctk:prototipo`: o Claude escreve um HTML por tela sobre
um CSS base que vem pronto, confere links e layout por script e, no fim, entrega o que você escolher.

```text
/cctk:prototipo login, painel (resumo do mês e próximos vencimentos) e contas a pagar (lista com filtro por período)
/cctk:prototipo recrie esta tela: C:\prints\tela-atual.png
/cctk:prototipo app de celular: lista de pedidos e detalhe do pedido
```

Num teste de 3 telas com 2 rodadas de ajuste, 3 execuções de cada lado (27/11/2026), a skill custou em média 18%
menos que pedir sem ela (US$ 0,31 a 0,37 contra 0,37 a 0,44), com a mesma qualidade: a troca de cor mexe só no
`tema.css`, e o Claude não reescreve CSS. O Google Stitch custou parecido por script e 3,6× mais pelo MCP, e
inventou funcionalidades e usou marcas reais.

| Para | Faça |
|---|---|
| Telas do zero | Descreva as telas e o que cada uma mostra. Dados fictícios coerentes entre as telas, nada além do pedido |
| A partir de um sistema que já existe | Mande o print. A skill copia layout, rótulos e menus, **troca todo dado do print por fictício** e compara uma vez com o original. No teste: login US$ 0,26 a 0,30; painel denso US$ 0,35 a 0,50; duas telas densas juntas US$ 0,63 a 0,70. Um pedido sem a skill sai por 0,20 a 0,30, mas nas 3 vezes copiou para o protótipo nomes, marcas e CNPJ do print. Mesmo assim, tarje nome e CPF antes de mandar |
| Telas com a cara do app | Diga de onde vêm as cores: "use as cores de `src/theme.css`". Um arquivo, não o app inteiro |
| App mobile (Flutter) | Diga "app" ou "celular": 390 px, visual Material |
| Ajustes | Peça todos de uma vez |
| Mandar ao cliente | No fim, peça **zip** (com LEIA-ME para extrair antes de abrir) ou **HTML único** (um arquivo, bom para e-mail e WhatsApp). Não publique em hospedagem aberta |
| Especificação | No fim, peça a **especificação**: PDF com as telas numeradas e a legenda de cada número, no modelo de mercado (escopo, requisitos, regras, mensagens, telas, questões em aberto). As seções opcionais você escolhe. De 3 telas, numa sessão nova, custou US$ 0,25 a 0,31; o que ninguém decidiu sai como questão em aberto, não como regra inventada. Para implementar, siga com o [OpenSpec](#feature-ou-bug-com-regra-de-negócio) citando o `especificacao.md` |

Não use dados reais de cliente no protótipo: ele vai para fora.

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

## Economizar cota

1. **Opus só para planejar.** O Sonnet fez as mesmas tarefas por cerca de metade do custo ([benchmark](../bench/README.md)).
2. **Escolha o modelo ao abrir.** Trocar com `/model` no meio relê a conversa sem o desconto do cache.
   Pelo mesmo motivo, evite o `opusplan`.
3. **O advisor já vem ligado** (`advisorModel: "opus"`). O Sonnet pode consultar o Opus quando acha que
   precisa, e cada consulta conta na cota. No bench ele acertou mais sem consultar nenhuma vez
   ([resultados](../bench/README.md#resultados-19112026)). As tarefas do bench são curtas: quanto ele consulta
   numa sessão longa e difícil ainda não foi medido. Nas primeiras semanas, fique de olho no `5h` e no `7d` da
   statusline. O recurso ainda é experimental no Claude Code.
4. **`/effort high` só em tarefa com muitas regras** (validação, importação, cálculo). Depois, `/effort medium`.
5. **`/clear` entre assuntos diferentes.**
6. **Não peça subagente para ler o código achando que economiza.** No kit, o Explore roda em Sonnet, e pedir
   "use o Explore" custou ~49% mais por acerto que deixar o Sonnet ler sozinho. Um subagente em Haiku saiu
   mais barato, mas errou no rastreio entre arquivos ([benchmark](../bench/README.md#resultados-19112026)).
   Subagente serve para isolar uma saída longa ou para uma revisão independente.

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

Para o Claude usar um token de desenvolvimento (API de homologação, banco local) sem ver o valor.

**Como o valor chega ao comando:**

1. Você grava, num terminal fora do Claude Code: `cctk secret set API_TOKEN`. O valor é pedido sem aparecer na tela.
2. O valor vai criptografado para o cofre do sistema (DPAPI no Windows, Keychain no macOS, libsecret no Linux).
   Em `~/.cctk/secrets.names` ficam só os nomes.
3. No Claude Code, rode `/clear` ou abra uma sessão nova: o cofre é lido no início da sessão.
4. O kit põe o valor no ambiente do terminal que o Claude usa e conta a ele só o nome.
5. O Claude escreve `$API_TOKEN` dentro do comando. Se um comando fosse mostrar o valor (`echo $API_TOKEN`,
   `printenv`), o guarda de segredos bloqueia.

**Exemplo.** Peça "chame a rota /pedidos da API de homologação usando o API_TOKEN". O Claude roda:

```bash
curl -H "Authorization: Bearer $API_TOKEN" https://api-homolog.exemplo.com/pedidos
```

No PowerShell:

```powershell
curl.exe -H "Authorization: Bearer $env:API_TOKEN" https://api-homolog.exemplo.com/pedidos
```

Um teste ou script que o Claude roda (`npm test`, `dotnet test`) também enxerga a variável, porque herda o
ambiente do terminal.

**Onde a variável não chega:**

| Onde | Por quê | O que fazer |
|---|---|---|
| MCP | Quem inicia o MCP é o Claude Code, não o terminal da sessão | Crie uma variável de ambiente do usuário e declare `"env": { "NOME": "${NOME}" }` no servidor. Para o Azure DevOps, use o `cctk ado add`, que já guarda o PAT no cofre |
| Sua IDE e o que você roda fora do Claude | O cofre só abastece as sessões do Claude Code | Use o `.env` do projeto, fora do git (o Claude não lê `.env`), ou o user-secrets do .NET |

**Trocar, listar e remover:**

```
cctk secret set API_TOKEN   # de novo: sobrescreve o valor
cctk secret list            # só os nomes
cctk secret rm API_TOKEN
```

Depois de mudar, `/clear` para a sessão pegar o valor novo.

**Limites:**

- Isso evita o vazamento **acidental**. Um programa escrito pela IA ainda consegue ler o próprio ambiente,
  então guarde só credenciais de desenvolvimento.
- No Windows, um valor com `/` (como uma URL) chega vazio ao PowerShell, e um valor com `\` (como `C:\pasta` ou
  `Server=.\SQL`) perde as barras no PowerShell e no Bash. Para esses, crie uma variável de ambiente do usuário e
  reinicie o Claude Code. Connection string com `;`, `:` e espaço chega inteira (Claude Code 2.1.332, 27/11/2026).
- Quem tinha a 1.2.0 tem o cofre em texto puro migrado no `cctk install`.

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
| Cota de 5h ou 7d subindo mais rápido que antes da 1.4 | O primeiro suspeito é o advisor consultando o Opus. Apague `"advisorModel"` do `~/.claude/settings.json` (o próximo `cctk install` recoloca) e compare |
| Aviso de que o check passou de 3 min | Troque o `check` em `.claude/cctk.json` por algo mais rápido |
| O Claude insiste num check que já estava quebrado | Conserte o projeto ou ajuste o `check`. O check desiste na segunda parada sem edição |
| "Bloqueado pelo toolkit" | O comando ia mostrar um segredo. Peça para usar a variável (`$NOME`) |
| "o commit leva credenciais" | Tire o valor do arquivo (variável de ambiente ou `cctk secret set`) e refaça o `git add`. Valor falso de teste: faça o commit você mesmo, no terminal. Senha em connection string (`Password=`) não bloqueia: o Claude só recebe um aviso |
| "blocks writes outside the working directories" | O Claude só edita (Edit/Write) dentro do projeto e da pasta de repositórios que você indicou no `install`. Outra pasta: `/add-dir <pasta>`. Para trocar a pasta de repositórios, edite `permissions.additionalDirectories` no `~/.claude/settings.json`. A trava não cobre comandos de terminal |
| Um MCP seu parou de achar uma variável de ambiente | Os MCPs não herdam mais o ambiente inteiro. Declare a variável no `env` do servidor, como `"env": { "MINHA_KEY": "${MINHA_KEY}" }` |
| Quero a configuração antiga | `cctk restore` |
| Atualizar o kit | `cctk update`. Seus plugins, MCPs, permissões e variáveis ficam, e o `restore` ainda volta à configuração de antes do kit |
| `cctk` não é reconhecido | Instale a CLI: `npm i -g @alfredoneeto/cctk` e abra um terminal novo |
| Tinha o Claude Toolkit Dev (até 1.1.2) | `npm i -g @alfredoneeto/cctk` e `cctk install`: ele migra o cofre, os backups e o Azure DevOps e tira o plugin antigo |
| Certificado corporativo (proxy) | Defina `NODE_EXTRA_CA_CERTS=<caminho do .pem>` nas variáveis de ambiente do usuário |

Não resolveu? Abra uma [issue](https://github.com/AlfredoNeeto/cctk/issues) com a saída do comando,
o `claude --version` e o seu sistema operacional.
