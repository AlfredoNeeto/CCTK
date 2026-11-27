# Protótipo → Angular

O `R codigo angular` já pôs o estilo do protótipo em `src/styles/prototipo.css`, com escopo `.prototipo`, e o caminho no
`angular.json`. Os templates usam **as mesmas classes do protótipo**: copie a estrutura do HTML da tela e troque só o
que é comportamento. Não escreva CSS novo para o que o catálogo já cobre.

**Contêiner:** a raiz de cada tela nova (ou do layout que as envolve) é `<div class="prototipo">`. O que no protótipo
era classe do `<body>` vira um `div` logo dentro dele: `<div class="prototipo"><div class="entrada">…`.

**Componentes base, uma vez:** crie em `src/app/prototipo/` os componentes standalone que se repetem entre as telas
(layout com menu e topo, tabela, campo, modal) e monte as telas com eles. Dados fictícios do protótipo viram dados do
serviço; os rótulos e a ordem dos blocos ficam iguais.

| Componente (classes do protótipo) | No Angular | Comportamento a trocar |
|---|---|---|
| Menu (`aside.menu`, `a.ativo`) | componente de layout com `<aside class="menu">` e `<router-outlet>` | `href` vira `routerLink`; `.ativo` vira `routerLinkActive="ativo"` |
| Topo (`header.topo`, `.trilha`, `.acoes`) | parte do layout, com `@Input` de título e trilha | botões de ação viram `(click)` ou `routerLink` |
| Cards (`.cards > .card`, `.rotulo`, `.valor`, `.variacao`) | template com `@for` sobre os indicadores | valores formatados com o pipe `currency:'BRL'` |
| Filtros (`.filtros`, `.campo`) | `<form>` com `[formGroup]` (Reactive Forms) | "Filtrar" dispara a busca no serviço |
| Caixa (`.caixa > header`, `.corpo`, `footer`) | marcação igual no template; vira componente só se repetir | nenhum |
| Tabela (`table.tabela`, `.num`, `tfoot`) | `<table class="tabela">` com `@for` nas linhas | paginação do `footer` ligada ao serviço |
| Form e campo (`.form`, `.campo`, `.com-erro`, `.obrig`) | Reactive Forms; `.com-erro` com `[class.com-erro]="ctrl.invalid && ctrl.touched"` | mensagens de erro saem dos `Validators` |
| Botões (`.btn`, `primario`, `perigo`, `fantasma`, `pequeno`) | `<button class="btn primario">` | `(click)`; um primário por área, como no protótipo |
| Selos (`.selo ok\|alerta\|erro\|info`) | `<span class="selo" [class.alerta]="…">` | a classe vem do status do dado |
| Avisos (`.aviso ok\|erro\|alerta\|info`) | `@if` em volta do `<div class="aviso">` | aparece pelo estado da tela |
| Vazio (`.vazio`) | `@empty` do `@for`, ou `@if (lista.length === 0)` | a ação leva à criação |
| Carregando (`.carregando`) | `@if (carregando)` | sinal enquanto o serviço responde |
| Abas (`.abas > a.ativo`) | links com `routerLink` para rotas filhas, ou `@switch` num sinal | `.ativo` pela rota ou pelo sinal |
| Modal (`.modal > .janela`) | `@if (aberto())` em volta do `<div class="modal aberto">` (a classe `aberto` mostra o modal sem `:target`) | abrir/fechar por sinal; no protótipo era `:target` (`href="#id"`) |
| Barras (`.barras`, `--v`, `data-valor`) | `[style.--v]="v + '%'"` e `[attr.data-valor]` | valores do serviço; a escala é proporcional ao maior |
| Login (`.entrada`, `.cartao-entrada`) | rota própria fora do layout: `<div class="prototipo"><div class="entrada">` | submit chama a autenticação |
| Mobile (`.mobile`, `.tela`, `.barra-app`, `.nav-inferior`, `.fab`) | só se o app Angular for mobile web: `<div class="prototipo"><div class="mobile">` | links viram `routerLink` |

Projeto com Angular Material: mantenha os componentes do Material onde o time já usa, e mapeie as cores do
`tema.css` para as variáveis `--mat-sys-*` com `mat.theme-overrides(...)` em vez de usar as classes do protótipo.
