# Situações

Receitas para o dia a dia, uma por situação: quando usar, o pedido pronto para copiar, as ferramentas do kit que
entram e o que conferir no fim. Troque o que está entre `< >`. Palavra desconhecida? Veja o [Glossário](GUIA.md#glossário).

[← Voltar ao README](../README.md) · [Guia do dia a dia](GUIA.md) · [Guia de prompts](PROMPTS.md)

| Situação | |
|---|---|
| **Começar** | [Preparar um projeto para o time](#preparar-um-projeto-para-o-time) · [Entender um projeto que você não conhece](#entender-um-projeto-que-você-não-conhece) |
| **Corrigir** | [Bug com sintoma conhecido](#bug-com-sintoma-conhecido) · [Bug a partir de um erro ou log](#bug-a-partir-de-um-erro-ou-log) · [Conferir a tela no navegador](#conferir-a-tela-no-navegador) |
| **Construir** | [Feature pequena](#feature-pequena) · [Feature com regra de negócio](#feature-com-regra-de-negócio) · [Requisito em PDF, Word ou planilha](#requisito-em-pdf-word-ou-planilha) · [Protótipo para o cliente aprovar](#protótipo-para-o-cliente-aprovar) · [Usar uma biblioteca na versão atual](#usar-uma-biblioteca-na-versão-atual) |
| **Integrar** | [Consultar o banco de dados](#consultar-o-banco-de-dados) · [Trabalhar a partir de um card do Azure DevOps](#trabalhar-a-partir-de-um-card-do-azure-devops) · [Chamar uma API com token](#chamar-uma-api-com-token) |
| **Cuidar** | [Revisar antes do PR](#revisar-antes-do-pr) · [Instalar uma skill, plugin ou MCP de terceiro](#instalar-uma-skill-plugin-ou-mcp-de-terceiro) · [A cota está acabando](#a-cota-está-acabando) |

## Começar

### Preparar um projeto para o time

**Quando:** primeira vez do kit num repositório, ou o projeto mudou de linguagem ou de ferramentas.

```text
/cctk:init-project
```

1. Ele descobre a linguagem e as ferramentas do projeto e cria `AGENTS.md`, `CLAUDE.md`, `openspec/` e o check em `.claude/cctk.json`. Se achar
   banco ou front web, oferece o DBHub e o Playwright (veja abaixo).
2. Commite o que ele criou: quem clonar recebe o mesmo jeito de trabalhar e a sugestão de instalar o kit.
3. Num terminal, na pasta do projeto: `cctk trust`, para aprovar o check.

**Confira:** o `CLAUDE.md` é curto e só diz o que o código não mostra; o comando em `.claude/cctk.json` roda em
menos de 3 minutos. Detalhes: [Primeiro uso](GUIA.md#primeiro-uso).

### Entender um projeto que você não conhece

**Quando:** caiu num repositório novo e precisa saber como algo funciona antes de mexer.

```text
Sem editar nada: como funciona <o fluxo, ex.: a emissão de nota fiscal> hoje?
Comece por @<pasta provável>. Responda com arquivo:linha de cada passo e diga o que você não confirmou.
```

Deixe o Sonnet ler sozinho. Pedir "use o Explore" custou ~49% mais por acerto no benchmark
([por quê](GUIA.md#economizar-cota)).

**Confira:** abra dois ou três dos `arquivo:linha` citados. Se a resposta não cita linha, peça.

## Corrigir

### Bug com sintoma conhecido

**Quando:** você sabe a entrada, o resultado errado e o certo.

```text
<Ação> com <entrada concreta> dá <resultado errado>, mas o certo é <resultado certo> (<a regra>).
Onde: @<arquivo>
Pronto quando: esse caso está num teste e <comando de teste> passa.
```

**Confira:** existe um teste novo com o seu caso, e o check passou antes de o Claude encerrar (se ele mexeu em
código e o check falhou, ele não encerra).

### Bug a partir de um erro ou log

**Quando:** você tem um stack trace, um log ou a saída de um comando que falhou.

```text
Em <log> está a saída de <o que você rodou>. Diga a causa antes de mudar código e me mostre a linha.
Depois corrija e escreva um teste que falharia sem a correção.
<log>
<cole aqui; tire tokens e dados de cliente antes>
</log>
```

**Confira:** a causa citada aponta para uma linha do código, não só para a linha do log. Log com dado de cliente
entra no contexto: corte antes de colar.

### Conferir a tela no navegador

**Quando:** a mudança é visual ou de fluxo de tela num projeto web.

```text
Suba o projeto com <npm run dev>, abra <http://localhost:5173/pedidos> com o playwright-cli,
filtre por <período> e confira que <o que deve aparecer>. Mande um print do resultado.
```

O `/cctk:init-project` oferece a skill do Playwright CLI em `.claude/skills/playwright-cli/`, versionada com o
projeto. Ela usa o Chrome que você já tem, e o kit usa essa versão de linha de comando porque ela não carrega a estrutura inteira da
página no contexto.

**Confira:** o print mostra o estado que você pediu. Sem a skill no projeto, rode o `/cctk:init-project` de novo.

## Construir

### Feature pequena

**Quando:** até uns 3 arquivos e a regra está clara.

```text
Adicione <o que> em @<arquivo>. Siga o padrão de @<arquivo parecido que já existe>.
Exemplo: <entrada> → <saída esperada>.
Fora do escopo: <o que não mexer>.
Pronto quando: <teste ou comando> passa.
```

**Confira:** a mudança (o diff) só mexe no que você pediu. Terminou? `/clear` antes do próximo assunto.

### Feature com regra de negócio

**Quando:** cálculo, validação, importação: algo em que alguém precisa decidir o caso estranho.

```text
/openspec-propose <a feature em uma frase>. Regras que eu sei: <lista>.
Casos que eu não sei responder: <data no futuro? valor zerado? registro repetido?>.
```

1. Abra com `claude --model opus` para escrever a proposta.
2. Leia a seção **Dimensões** do `proposal.md` e responda o que o pedido não disse.
3. Sessão nova, no Sonnet: `/openspec-apply-change`, `/openspec-verify-change` e o `spec-reviewer`.

O OpenSpec custa cerca de 5× um pedido direto: vale quando há regra para você revisar. Passo a passo com exemplo:
[Feature ou bug com regra de negócio](GUIA.md#feature-ou-bug-com-regra-de-negócio).

**Confira:** cada regra da spec tem um teste, e o `spec-reviewer` não apontou regra sem prova.

### Requisito em PDF, Word ou planilha

**Quando:** o pedido veio num documento.

```text
/cctk:convert <caminho/requisitos.pdf>
```

Depois, num pedido:

```text
Liste as regras de @docs/requisitos.md, uma por linha, citando o trecho de cada uma.
Marque como "em aberto" o que o documento não decide. Não escreva código ainda.
```

Com a lista revisada, siga pela [feature com regra de negócio](#feature-com-regra-de-negócio) citando
`@docs/requisitos.md`.

**Confira:** as tabelas do documento chegaram inteiras ao `.md`; uma regra "em aberto" vira pergunta para quem
pediu, não suposição.

### Protótipo para o cliente aprovar

**Quando:** você quer mostrar telas clicáveis antes de construir, do zero ou a partir do print de um sistema.

```text
/cctk:prototipo login, painel (resumo do mês e próximos vencimentos) e contas a pagar (lista com filtro por período)
```

No fim, peça **zip** ou **HTML único** para mandar ao cliente e, numa sessão nova, a **especificação** em PDF.
Detalhes e custos medidos: [Prototipar e especificar](GUIA.md#prototipar-e-especificar).

**Confira:** nenhum dado real (nome, CPF, marca do print) ficou no protótipo; ele vai para fora.

### Usar uma biblioteca na versão atual

**Quando:** a biblioteca mudou de versão e o Claude pode lembrar da API antiga.

```text
Use o context7 para ver a documentação atual de <biblioteca> <versão do package.json>
e implemente <o que> em @<arquivo> com a API dessa versão.
```

O context7 vem como MCP no plugin do kit. Ele recebe só o nome da biblioteca e a busca, não o seu código.

**Confira:** o código usa a API da versão que está no seu `package.json` ou `.csproj`, e o build passa.

## Integrar

### Consultar o banco de dados

**Quando:** você quer que o Claude olhe dados ou o esquema para entender um bug ou escrever uma consulta.

```text
Consulte o banco: quantos pedidos de <cliente fictício ou id> estão com status <X> e por quê,
olhando as tabelas <pedidos> e <pagamentos>. Só leitura.
```

O DBHub é oferecido pelo `/cctk:init-project` quando ele acha banco no projeto. O `dbhub.toml`, com o endereço de conexão do banco, fica fora
do git. Use um login **só com `db_datareader`**, num banco de dev ou homologação, nunca de produção: tudo o que a
consulta retorna entra no contexto.

**Confira:** a consulta que ele rodou aparece na conversa; confira se ela responde o que você perguntou.

### Trabalhar a partir de um card do Azure DevOps

**Quando:** o pedido está num work item do Azure DevOps Server (on-premises).

Uma vez por máquina, num terminal:

```text
cctk ado add https://<servidor>/tfs/<Collection>
```

Depois, no Claude Code:

```text
Leia o card <12345> e liste o que ele pede e o que não diz. Não escreva código ainda.
```

**Confira:** o token de acesso do Azure DevOps (PAT) tem permissão mínima e validade curta. Configuração: [Azure DevOps Server](GUIA.md#azure-devops-server).

### Chamar uma API com token

**Quando:** o Claude precisa usar um token de desenvolvimento sem ver o valor.

Num terminal fora do Claude Code: `cctk secret set API_TOKEN`. Depois, `/clear` no Claude Code e:

```text
Chame GET /pedidos da API de homologação usando o API_TOKEN e me diga quantos vieram.
```

**Confira:** o comando que ele rodou tem `$API_TOKEN`, não o valor. Onde a variável não chega (MCP, IDE): veja o
[cofre](GUIA.md#tokens-e-senhas-cofre). Ajuda dentro do Claude Code: `/cctk:secret`.

## Cuidar

### Revisar antes do PR

**Quando:** a mudança está pronta e você vai abrir o PR.

```text
Revise o diff contra a main (git diff main...HEAD). Procure bug, caso de borda sem teste e segredo no código.
Para cada achado: arquivo:linha, o problema e um caso que quebra. Não edite nada.
```

O plugin `security-guidance` já roda sozinho: avisa sobre padrões perigosos a cada edição e revisa as mudanças no fim
da resposta e a cada commit. O kit bloqueia o commit que leva credencial.

**Confira:** cada achado tem `arquivo:linha` e um caso concreto. Achado sem caso é opinião: peça o caso ou descarte.

### Instalar uma skill, plugin ou MCP de terceiro

**Quando:** você achou uma ferramenta na internet e quer usar.

```text
/cctk:audit <url do repositório>
```

Ele analisa sem executar nada e diz se é seguro instalar. Lembre que a primeira instalação do kit removeu as suas
ferramentas (com backup), para o kit rodar como foi medido.

**Confira:** o veredito e os motivos. Na dúvida, não instale: cada ferramenta nova também pesa na cota.

### A cota está acabando

**Quando:** o `5h` ou o `7d` da statusline passou de 80% (`!`).

Num terminal, `cctk stats` mostra o uso por semana e por modelo. Depois:

1. Deixe o que for grande para depois do reset que a statusline mostra.
2. Confira se a sessão está no Sonnet; Opus só para planejar.
3. `/clear` entre assuntos. Com `cache frio` e contexto grande, peça um resumo antes, dê `/clear` e cole o resumo:

```text
Resuma em até 10 linhas o que fizemos nesta sessão: o objetivo, o que já está pronto, os arquivos mexidos
e o próximo passo. Vou colar isso numa sessão nova.
```

**Confira:** se a cota sobe mais rápido que antes da 1.4, o suspeito é o advisor
([Deu problema?](GUIA.md#deu-problema)).
