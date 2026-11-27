---
name: prototipo
description: Cria protótipo navegável de telas em HTML e CSS, do zero (a partir de uma descrição) ou a partir do print de um sistema que já existe, para validar com o cliente. No fim entrega o que o usuário escolher - zip, HTML único ou especificação em PDF com as telas anotadas. Use quando pedirem protótipo, mockup, wireframe, "desenha as telas", "recria esta tela" ou especificação com telas.
argument-hint: <descrição das telas | caminho do print> [mobile]
allowed-tools: Bash(node "${CLAUDE_SKILL_DIR}/scripts/render.mjs" *)
---

# Protótipo de tela

Objetivo: telas que parecem produto real, coerentes entre si, com o menor gasto de tokens. Você escreve HTML
e só o HTML; o CSS base já existe. O script `R` faz prints, PDF e zip sem passar imagem nem HTML pelo contexto.

`R` = `node "${CLAUDE_SKILL_DIR}/scripts/render.mjs"` (com as aspas: o caminho pode ter espaço)

## 1. Entender o pedido

Tire do pedido, sem perguntar o que já estiver claro:
- **Entrada:** descrição (modo do zero) ou print/imagem de um sistema existente (modo print).
- **Plataforma:** web desktop (padrão) ou mobile/Flutter (390 px, visual Material).
- **Telas** e o que cada uma tem. **Pasta:** `prototipo/` (padrão).
- **Saída final:** zip, HTML único, especificação em PDF ou só os arquivos. Se não disse, pergunte só no fim.

Se faltar algo que muda as telas (que dados a lista mostra, quem usa), faça **uma** pergunta com as
dúvidas juntas. Detalhe visual não é dúvida: decida.

## 2. Preparar

`R init prototipo` (com `--mobile` se for app). Isso copia `estilo.css` (não leia nem edite) e cria
`tema.css`, onde vão as cores e a fonte do projeto, sobrescrevendo as variáveis:
`--cor --cor-escura --cor-clara --sobre-cor --fundo --superficie --borda --texto --texto-2 --fonte --raio`
e, para menu lateral escuro, `--menu-fundo --menu-texto --menu-ativo-fundo --menu-ativo-texto`.

Cores de onde? Do print (modo print), do arquivo de tema do app se o usuário apontar (leia só ele), ou
uma cor sóbria que combine com o domínio. Fonte: a do sistema, salvo pedido.

**Modo print:** rode `R medir <print>` (diz a largura real da tela e o zoom do print; sem isso o texto sai
grande demais) e leia a imagem uma vez, com o Read. Ela fica no contexto: olhe para ela de novo quando
precisar, sem reler o arquivo, e monte a tela **direto da imagem**, não de um resumo. A meta é fidelidade:
mesma divisão da tela, mesmas proporções (largura do menu, altura do topo, colunas da grade), mesma ordem
de blocos, mesmos rótulos, menus e nomes de campo e coluna, mesma densidade e peso de fonte, ícones
aproximados (caractere ou SVG simples). Use as classes de `estilo.css` onde servirem e ponha em `tema.css`
o que for próprio do print (variáveis e as regras que mudam medida, borda ou fonte); não force o visual
padrão sobre o print. Onde estiver ilegível, use texto plausível.

**Dados do print nunca vão para o protótipo.** Print de sistema em uso costuma ter dado real: nome de
pessoa, CPF, CNPJ, e-mail, telefone, endereço, número de processo ou contrato, nome de empresa, de
fornecedor ou de marca. Troque **todo** dado de registro por fictício no mesmo formato, tamanho e
quantidade de linhas (rótulo e menu ficam; o que está dentro da tabela, dos cards e do topo muda). O
protótipo, o zip e o PDF vão para fora (LGPD). Se o print tinha dado pessoal visível, diga ao usuário, no
fim, que na próxima vez vale tarjar antes de mandar.

Depois de montar, grave `prototipo/notas.md` (até 15 linhas, sem nenhum dado do print): cores em hex com
confiança (alta/média/baixa), fonte provável, o que foi trocado por fictício e o que o print não mostra
(estados, outras telas). Serve para a especificação e para quem continuar o trabalho.

## 3. Montar as telas

Um HTML por tela, nome curto em minúsculas (`contas-pagar.html`). Cada um com:
`<meta charset="utf-8">`, `<title>`, `<link rel="stylesheet" href="estilo.css"><link rel="stylesheet" href="tema.css">`.
CSS próprio só em `<style>` curto quando o catálogo não cobrir. Sem Tailwind, sem framework, sem CDN de ícones
(use caractere ou SVG inline pequeno). JS só para o que o cliente precisa clicar (abrir modal, trocar aba).

Catálogo (classes de `estilo.css`):

```html
<body><div class="app">
  <aside class="menu"><div class="marca"><span class="logo">AB</span>Nome</div>
    <nav><a class="ativo" href="painel.html">Painel</a><div class="grupo">Financeiro</div><a href="contas.html">Contas</a></nav>
    <div class="rodape">Usuário · Sair</div></aside>
  <main><header class="topo"><div><div class="trilha">Financeiro › Contas</div><h1>Contas a pagar</h1></div>
      <div class="acoes"><a class="btn" href="#">Exportar</a><a class="btn primario" href="nova.html">Nova conta</a></div></header>
    <div class="conteudo">
      <div class="cards"><div class="card"><span class="rotulo">A pagar</span><span class="valor">R$ 12.400,00</span><span class="variacao desce">+8% no mês</span></div></div>
      <div class="filtros"><div class="campo"><label for="p">Período</label><select id="p">…</select></div><button class="btn">Filtrar</button></div>
      <div class="caixa"><header><h2>Título</h2><a class="btn fantasma pequeno">Ver todas</a></header>
        <div class="rolagem"><table class="tabela"><thead><tr><th>Fornecedor</th><th class="num">Valor</th><th>Status</th><th></th></tr></thead>
          <tbody><tr><td>…</td><td class="num">R$ 1.250,00</td><td><span class="selo alerta">Vence hoje</span></td><td><div class="acoes"><a class="btn pequeno">Pagar</a></div></td></tr></tbody></table></div>
        <footer><small>1–10 de 42</small><div class="paginacao"><a class="btn pequeno">‹</a><a class="btn pequeno">›</a></div></footer></div>
    </div></main></div></body>
```

- Formulário: `.form` (grade) › `.campo` (+ `.inteiro` ocupa a linha) › `label` (`<span class="obrig">*</span>`), `input/select/textarea`, `.ajuda`; erro: `.campo.com-erro`. Caixa de seleção: `<label class="opcao"><input type="checkbox">Texto</label>`.
- Botões: `.btn` + `primario | perigo | fantasma | pequeno`. Selos: `.selo` + `ok | alerta | erro | info`.
- Avisos: `.aviso` + `ok | erro | alerta | info`. Vazio: `.vazio` (com `<strong>` e uma ação). Carregando: `.carregando`.
- Abas: `.abas > a.ativo`. Grade de caixas: `.grade`. Caixa: `.caixa > header | .corpo | footer`.
- Modal: link `href="#id"` abre `<div class="modal" id="id"><div class="janela"><header>…</header><div class="corpo">…</div><footer>…<a class="btn" href="#">Cancelar</a></footer></div></div>`.
- Gráfico: `<div class="barras"><div style="--v:70%" data-valor="34,2"><span>Jan</span></div><div class="b" style="--v:40%" data-valor="21,0"></div>…</div>` + `.legenda` (`<i></i>` cor, `<i class="b"></i>` cinza). `--v` proporcional aos valores, que batem com os cards.
- Total de lista: `<tfoot><tr><td>8 contas</td>…<td class="num">R$ 24.856,35</td></tr></tfoot>` na `.tabela`.
- Login: `<body class="entrada"><form class="caixa cartao-entrada">`.
- Mobile: `<body class="mobile"><div class="tela"><header class="barra-app"><a href="…">←</a>Título</header><div class="conteudo">… .lista > a (… <span class="fim">) …</div><nav class="nav-inferior"><a class="ativo">…</a></nav><a class="fab">+</a></div>`.

Antes de gravar cada tela, confira:
- Só o que foi pedido. Nada de módulo, botão ou métrica inventada para "enriquecer". Falta de dado → texto genérico, não feature.
- Dados fictícios coerentes entre as telas (o mesmo fornecedor tem o mesmo valor na lista e no painel), formato brasileiro (R$ 1.250,00, 05/03/2026, CPF 000.000.000-00), sem nome de empresa, marca ou pessoa real.
- Navegação: menu com a tela atual em `.ativo`, links reais entre as telas, voltar/cancelar levam a algum lugar.
- Estados onde fazem sentido: vazio, erro de validação, confirmação. Um estado que muda a tela inteira vira outro arquivo (`contas-pagar--vazio.html`) fora do menu.
- Hierarquia: um botão primário por área, números alinhados à direita (`.num`), textos curtos.
- Se a especificação já foi pedida, marque os pontos a explicar com `data-anotacao="1"`, `"2"`… em ordem de leitura (no máximo 6 por tela).

Não abra os arquivos depois de criar: você já sabe o que escreveu.

## 4. Conferir

1. `R checar prototipo` → aponta link quebrado, rolagem horizontal, texto estourando e erro de script. Corrija e rode de novo até sair limpo. Não custa imagem.
2. **Modo print, uma comparação por tela:** `R lado <print> prototipo/<tela>.html prototipo/revisao/<tela>.png` e abra a imagem gerada (original e protótipo numa imagem só). Liste as diferenças que um usuário notaria e corrija todas de uma vez: texto sobreposto ou cortado, estrutura e posição, proporção e espaçamento, tamanho e peso de texto, cor. Uma passada só; uma segunda apenas se a primeira mostrou texto sobreposto ou estrutura errada. Diferença de fonte ou de antialiasing não é defeito, e o dado fictício no lugar do real também não.
3. **Modo do zero:** não tire print para conferir, a não ser que o usuário peça. O `checar` basta.

Ajustes pedidos depois: aplique todos de uma vez; cor e fonte mudam só em `tema.css`. Rode `checar` de novo.

## 5. Entregar

Pergunte o que o usuário quer, se ainda não disse (pode ser mais de um):

| Opção | Comando | Observação |
|---|---|---|
| Zip para o cliente | `R zip prototipo prototipo.zip` | Vai com LEIA-ME pedindo para extrair antes de abrir |
| HTML único | `R unico prototipo prototipo.html` | Um arquivo só, abre com dois cliques, bom para e-mail e WhatsApp |
| Especificação em PDF | veja abaixo | Documento com as telas anotadas |
| Só os arquivos | nada | Já estão em `prototipo/` |

Não publique em hospedagem pública: o protótipo de cliente não deve ficar com URL aberta.

**Especificação:**
1. Leia [especificacao.md](references/especificacao.md) (o modelo) e pergunte quais seções opcionais entram, sugerindo as que o protótipo já sustenta.
2. Se as telas ainda não têm `data-anotacao`, acrescente (até 6 por tela). `R prints prototipo --anotar` (estados: acrescente `tela.html#id-do-modal`).
3. Escreva `prototipo/especificacao.md` seguindo o modelo: a legenda de cada tela usa os mesmos números da imagem e cita os IDs (RF, RN, MSG). Não abra os prints: a legenda sai do HTML que você escreveu. O que não foi decidido vai para "Questões em aberto".
4. `R pdf prototipo/especificacao.md` → `prototipo/especificacao.pdf`. O `.md` fica para versionar e para citar no OpenSpec.

No fim, diga em poucas linhas o que foi gerado, onde está, e o que ficou em aberto.
