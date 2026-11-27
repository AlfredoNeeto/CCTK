# Protótipo → React

O `R codigo react` já pôs o estilo do protótipo em `src/styles/prototipo.css`, com escopo `.prototipo`, e disse a linha
de `import` do arquivo de entrada. O JSX usa **as mesmas classes do protótipo** (`className`): copie a estrutura do
HTML da tela e troque só o que é comportamento. Não escreva CSS novo para o que o catálogo já cobre.

**Contêiner:** a raiz de cada tela nova (ou do layout que as envolve) é `<div className="prototipo">`. O que no
protótipo era classe do `<body>` vira um `div` logo dentro dele: `<div className="prototipo"><div className="entrada">…`.

**Componentes base, uma vez:** crie em `src/prototipo/` os componentes que se repetem entre as telas (layout com menu
e topo, tabela, campo, modal) e monte as telas com eles. Dados fictícios do protótipo viram props ou dados da API; os
rótulos, os `id` e a ordem dos blocos ficam iguais.

| Componente (classes do protótipo) | No React | Comportamento a trocar |
|---|---|---|
| Menu (`aside.menu`, `a.ativo`) | componente de layout com `<aside className="menu">` e `<Outlet />` | `href` vira `<NavLink>`, que põe `.ativo` com `className={({ isActive }) => isActive ? 'ativo' : ''}` |
| Topo (`header.topo`, `.trilha`, `.acoes`) | parte do layout, com props de título e trilha | ações viram `onClick` ou `<Link>` |
| Cards (`.cards > .card`, `.rotulo`, `.valor`, `.variacao`) | `.map` sobre os indicadores | valores com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` |
| Filtros (`.filtros`, `.campo`) | `<form onSubmit>` com estado controlado | "Filtrar" dispara a busca |
| Caixa (`.caixa > header`, `.corpo`, `footer`) | marcação igual; vira componente só se repetir | nenhum |
| Tabela (`table.tabela`, `.num`, `tfoot`) | `<table className="tabela">` com `.map` nas linhas e `key` | paginação do `footer` com estado |
| Form e campo (`.form`, `.campo`, `.com-erro`, `.obrig`) | `<label htmlFor>` e `<input id>` iguais aos do protótipo | `.com-erro` pelo estado de validação |
| Botões (`.btn`, `primario`, `perigo`, `fantasma`, `pequeno`) | `<button className="btn primario">` | `onClick`; um primário por área, como no protótipo |
| Selos (`.selo ok\|alerta\|erro\|info`) | `<span className={'selo ' + tipo}>` | a classe vem do status do dado |
| Avisos (`.aviso ok\|erro\|alerta\|info`) | renderização condicional do `<div className="aviso">` | aparece pelo estado |
| Vazio (`.vazio`) | `lista.length === 0 ? <div className="vazio">… : <table>` | a ação leva à criação |
| Carregando (`.carregando`) | condicional enquanto a requisição não volta | nenhum |
| Abas (`.abas > a.ativo`) | `<NavLink>` para rotas filhas, ou estado local | `.ativo` pela rota ou pelo estado |
| Modal (`.modal > .janela`) | `{aberto && <div className="modal aberto">…}` (a classe `aberto` mostra o modal sem `:target`) | abrir/fechar por estado; no protótipo era `:target` (`href="#id"`) |
| Barras (`.barras`, `--v`, `data-valor`) | `style={{ '--v': v + '%' }}` e `data-valor` | valores da API; escala proporcional ao maior |
| Login (`.entrada`, `.cartao-entrada`) | rota fora do layout: `<div className="prototipo"><div className="entrada">` | submit chama a autenticação |
| Mobile (`.mobile`, `.tela`, `.barra-app`, `.nav-inferior`, `.fab`) | só se o app for mobile web: `<div className="prototipo"><div className="mobile">` | links viram `<Link>` |

Os links do protótipo (`contas.html`) viram rotas (`/contas`). Se o projeto já usa uma biblioteca de componentes,
mantenha a dela onde o time já usa e passe as cores do `tema.css` para o tema dela.
