# Protótipo → Flutter

O `R codigo flutter` já gerou `lib/tema/tema_prototipo.dart` com o `temaPrototipo` (as cores e a fonte do `tema.css`) e
`raioPrototipo`. Use `theme: temaPrototipo` no `MaterialApp` e **não escreva cor nem fonte à mão**: tudo vem do
`Theme.of(context)`. Mantenha os rótulos, a ordem dos blocos e a navegação do protótipo.

**Componentes base, uma vez:** crie em `lib/prototipo/` os widgets que se repetem entre as telas (scaffold com menu,
card de indicador, linha de lista, campo) e monte as telas com eles. Dados fictícios do protótipo viram dados do
repositório; os rótulos ficam iguais.

| Componente (classes do protótipo) | No Flutter | Comportamento a trocar |
|---|---|---|
| Menu (`aside.menu`, `a.ativo`) | `NavigationRail` (tela larga) ou `NavigationDrawer` | item ativo pela rota atual |
| Topo (`header.topo`, `.trilha`, `.acoes`) | `AppBar` com `title` e `actions` | ações chamam a navegação ou o repositório |
| Cards (`.cards > .card`, `.rotulo`, `.valor`, `.variacao`) | `Card` com `Column` de `Text` (`labelMedium`, `headlineSmall`) | valores com `NumberFormat.simpleCurrency(locale: 'pt_BR')` |
| Filtros (`.filtros`, `.campo`) | `Wrap` com `DropdownButtonFormField` e `FilledButton.tonal` | "Filtrar" recarrega a lista |
| Caixa (`.caixa > header`, `.corpo`, `footer`) | `Card` com cabeçalho em `ListTile` | nenhum |
| Tabela (`table.tabela`, `.num`, `tfoot`) | `DataTable` (tela larga) ou `ListView` de `ListTile` (celular) | colunas numéricas com `numeric: true` |
| Form e campo (`.form`, `.campo`, `.com-erro`, `.obrig`) | `Form` com `TextFormField` e `InputDecoration(labelText: …)` | `.com-erro` vira o `validator` |
| Botões (`.btn`, `primario`, `perigo`, `fantasma`, `pequeno`) | `FilledButton` (primário), `OutlinedButton` (comum), `TextButton` (fantasma); perigo com `colorScheme.error` | `onPressed` |
| Selos (`.selo ok\|alerta\|erro\|info`) | `Chip` ou `Container` com cor de fundo clara e texto forte | cor pelo status do dado |
| Avisos (`.aviso ok\|erro\|alerta\|info`) | `MaterialBanner` ou `Card` colorido no topo do conteúdo | aparece pelo estado |
| Vazio (`.vazio`) | `Center` com `Column`: ícone, texto e `FilledButton` | a ação leva à criação |
| Carregando (`.carregando`) | `CircularProgressIndicator` ou `LinearProgressIndicator` | enquanto o `Future` não resolve |
| Abas (`.abas > a.ativo`) | `TabBar` com `TabBarView` | nenhum |
| Modal (`.modal > .janela`) | `showDialog` com `AlertDialog` | botões do rodapé viram `actions` |
| Barras (`.barras`, `--v`, `data-valor`) | `Row` de `Expanded` com `FractionallySizedBox(heightFactor: v)` e o valor em `Text` | escala proporcional ao maior |
| Login (`.entrada`, `.cartao-entrada`) | `Scaffold` com `Center` e `Card` de largura máxima 400 | submit chama a autenticação |
| Mobile (`.mobile`, `.tela`, `.barra-app`, `.nav-inferior`, `.fab`) | `Scaffold` com `AppBar`, `NavigationBar` e `FloatingActionButton` | é a forma padrão de app Flutter |

Use o raio do protótipo onde o widget aceita borda: `BorderRadius.circular(raioPrototipo)`. Para conferir, rode o
app e compare com o print do protótipo (`R prints prototipo`); o check do projeto roda `flutter analyze` e os testes.
