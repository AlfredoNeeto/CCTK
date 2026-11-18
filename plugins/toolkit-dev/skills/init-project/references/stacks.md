# Comandos por stack

Use primeiro o que o CI do repositório já roda. Esta tabela serve quando não há CI ou para achar as
flags que deixam a saída curta, já que tudo o que o check imprime volta para o contexto.

O check roda no shell padrão do sistema (cmd no Windows): junte as etapas com `&&` e coloque entre
aspas os caminhos com espaço.

| Stack | Check (fim de turno) | Testes com saída curta | Observações |
|---|---|---|---|
| .NET 5+ / .NET Core | `dotnet build <sln> -warnaserror -v q -nologo && dotnet test <sln> --no-build -v q --nologo` | `dotnet test --no-build --logger "console;verbosity=minimal"` | Se o build com `-warnaserror` falhar hoje por warnings antigos, remova a flag e anote isso |
| .NET Framework (net4x) | `"<caminho do MSBuild.exe>" <sln> /m /v:q /nologo /restore` | `dotnet test` em projetos SDK-style; senão, `vstest.console.exe` | Só no Windows. Ache o MSBuild com `"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -find MSBuild\**\Bin\MSBuild.exe` e grave o caminho completo |
| Angular | `npx ng build --configuration development && npx ng test --watch=false` | Karma: `--browsers=ChromeHeadless`; Vitest/Jest: o runner já sai sozinho com `--watch=false` | Se o `ng test` exigir navegador e o ambiente não tiver, deixe só o build + `npx tsc -p tsconfig.app.json --noEmit` |
| React / Node / TypeScript | `npx tsc --noEmit && npm test` | Vitest: `npx vitest run --reporter=dot`; Jest: `npx jest --ci --silent` | Prefira os scripts do `package.json` (`typecheck`, `lint`, `test`), garantindo que não fiquem em modo watch |
| Flutter | `flutter analyze --no-pub && flutter test --reporter failures-only` | `--reporter failures-only` (se a versão não aceitar, use `compact`) | Com `.fvmrc`, use `fvm flutter` |
| Dart puro | `dart analyze && dart test --reporter failures-only` | idem | |
| SQL Server (`.sqlproj`) | `dotnet build <proj>.sqlproj -v q -nologo` (SDK `Microsoft.Build.Sql`) | — | Banco não tem check próprio. Mudança de schema vai por migration ou script revisado |

## Monorepo

Junte só as partes que existem, da mais rápida para a mais lenta, por exemplo:
`dotnet build api.sln -v q -nologo && cd web && npx tsc --noEmit`.
Se a suíte inteira passar de ~3 minutos, use no check só build e typecheck, e escreva no AGENTS.md
quais testes rodar para cada área.
