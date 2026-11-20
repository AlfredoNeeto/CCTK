# Contribuindo

Issues e PRs são bem-vindos em [github.com/AlfredoNeeto/cctk](https://github.com/AlfredoNeeto/cctk/issues).
Se o PR muda o comportamento do kit, rode o benchmark ([bench/README.md](bench/README.md)), porque o kit só
leva o que mostrou ganho medido.

## Testes e ferramentas

```
npm test                                             # instalador, hooks e ponta a ponta (HOME e binários falsos)
E2E_REAL=1 npm test                                  # + claude real numa HOME isolada (PowerShell: $env:E2E_REAL=1; npm test)
CCTK_MARKETPLACE=/caminho/do/clone node cli.mjs install   # instala a partir do clone local
node bench/run.mjs --dry                             # benchmark: veja bench/README.md
node docs/charts.mjs                                 # regera o gráfico do README
vhs demo/cctk.tape                                   # regera o GIF: siga os passos no topo do cctk.tape
```

## Lançar uma versão

1. Suba `version` em `package.json` e em `plugins/cctk/.claude-plugin/plugin.json`, o `"ref"` no
   `init-project` e o badge do README. Um teste confere tudo.
2. Faça o commit.
3. Crie a tag `vX.Y.Z` e faça o push da `main` e da tag. O plugin é instalado a partir dessa tag.
4. `npm publish` (com 2FA). Antes, confira com `npm pack --dry-run`.
