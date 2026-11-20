# Roadmap 1.2–1.4: o kit vira **Claude Code Toolkit (`cctk`)**: instalação, segurança e qualidade

## Contexto
Você pediu uma pesquisa pesada para melhorar segurança, fluxo, facilidade, a instalação via CLI ("hoje está
bem ruim") e a qualidade sem subir muito o custo. Fiz três frentes: leitura do código (instalador, hooks,
testes, bench) e duas pesquisas na web (segurança/fluxo e instalação/qualidade). Depois conferi as alegações
principais na documentação oficial do Claude Code 2.1.329.

Suas decisões:
- **npm + plugin** como canal de distribuição.
- **Limpar só na 1ª instalação**; os updates passam a mesclar com a config do usuário.
- **Medir no bench antes** de mexer em modelo.
- **Novo nome: Claude Code Toolkit, sigla `cctk`**, no padrão do Everything Claude Code → ECC.
  - O nome por extenso descreve a ferramenta e a sigla vira pacote, comando e plugin.
  - O `claude-toolkit` no npm já é de outra pessoa, com o mesmo comando, e "Claude" sozinho na frente parecia
    produto oficial.
  - `cctk` está livre no npm. Os homônimos no GitHub não têm relação (o maior é uma lib de química, 23★).

Regras que continuam valendo: kit fechado, verificações com timeout e fail-open, hooks em Node rodando no
Windows sem Git Bash, sem CI e commit direto na main.

### O que a pesquisa achou no código (problemas reais)
- `installTools` (`lib/toolkit.mjs:120`) roda 8 comandos externos **sem timeout e sem progresso na tela**.
  Quando um falha, vira só um aviso, e o processo sai com **exit 0** (`cli.mjs:148`).
- `npx github:…#v1.1.2` exige git e rede a cada comando, e a tag aparece em cerca de 15 lugares. As dicas
  impressas pelo próprio kit saem sem tag e apontam para a `main` (`cli.mjs:107,111`, `check-gate.js:105`,
  `ado-mcp.js:66`, `init-project/SKILL.md`, `secret/SKILL.md`).
- No update, `writeConfig` (`toolkit.mjs:98`) reescreve o `settings.json` inteiro e só o `theme` sobrevive.
  Somem o proxy no `env`, o `permissions.allow`, os hooks do usuário e o `enabledPlugins`.
- Nada chama `claude plugin update`. Um `marketplace add` com tag nova sobre o marketplace já existente pode não
  fazer nada, e aí o plugin fica velho. Isso não foi verificado com o claude real.
- O `restore` não pede confirmação e perde a `ref` do marketplace (`toolkit.mjs:165`).
- `node -e "require('…/trust.js').trust(…)"` passa pelo `secret-guard`.
- O cofre de variáveis guarda os valores em texto puro, em `~/.claude-toolkit/secrets.env`.

### O que a documentação oficial confirma (2.1.329)
- **Plugin não grava settings** (statusLine, deny, model, env), então a CLI continua necessária. O plugin cobre
  hooks, skills, `bin/`, `userConfig` (sensível guardado no cofre do SO) e `dependencies`.
- Um plugin de marketplace de terceiros **não se atualiza sozinho por padrão**. Para isso, é preciso
  `extraKnownMarketplaces.<nome>.autoUpdate: true` no settings do usuário.
- O **auto mode já é o padrão** desde a v2.1.283, em todos os planos. O deny continua como piso.
- Existem `permissions.blockWritesOutsideWorkingDirectories` e `CLAUDE_CODE_MCP_ALLOWLIST_ENV=1`.
- Os hooks aceitam a forma exec (`"command":"node","args":[…]`) e `onFailure: "continue"`.
- O statusline recebe `prompt_cache.hit_ratio`.
- Não há sandbox no Windows nativo.
- O Advisor (`"advisorModel":"opus"`) funciona na assinatura, mas é experimental.

---

## Passo 0: guardar o roadmap e a decisão
- Copiar este plano para `docs/ROADMAP.md` e commitar na main.
- Na memória: atualizar `toolkit-decisions.md` com o novo nome (Claude Code Toolkit / `cctk`, npm, plugin
  `cctk@cctk`), o canal npm + plugin e a regra "limpa só na 1ª instalação".

## 1.2.0: novo nome + instalação (a maior dor)

### A. Renomear para Claude Code Toolkit (`cctk`)
| Hoje | Vira |
|---|---|
| título "Claude Toolkit Dev" | **"Claude Code Toolkit (cctk)"**, com a linha "projeto da comunidade, sem vínculo com a Anthropic" |
| npm `claude-toolkit` (via `npx github:`) | npm **`cctk`**, `bin: { cctk: 'cli.mjs' }` |
| repo `AlfredoNeeto/claude-toolkit` | `AlfredoNeeto/cctk`, renomeado no GitHub (os links antigos redirecionam) |
| plugin `toolkit-dev@claude-toolkit` | `cctk@cctk`, ou seja, `/cctk:init-project`, `/cctk:audit`, `/cctk:convert` e `/cctk:secret` |
| `~/.claude-toolkit/` (backups, creds, trust, cofre) | `~/.cctk/` |
| `~/.claude/toolkit/` (runtime, statusline) | `~/.claude/cctk/` |
| `.claude/toolkit.json` do projeto (o check) | `.claude/cctk.json`; o antigo é lido como fallback e o `init-project` migra |
| env `TOOLKIT_MARKETPLACE`, `TOOLKIT_CHECK_TIMEOUT_MS` | `CCTK_MARKETPLACE`, `CCTK_CHECK_TIMEOUT_MS` |
| badge laranja `D97757` (a cor do Claude) | badge com cor própria |

**Migração automática** quando o `install` encontra o kit antigo:
- `isKit` reconhece `toolkit/statusline.js` e `cctk/statusline.js`.
- Renomeia `~/.claude-toolkit` para `~/.cctk`. Se o destino já existir, copia sem sobrescrever.
- Roda `claude plugin uninstall toolkit-dev@claude-toolkit` e `claude plugin marketplace remove claude-toolkit`.
- Mantém as entradas `ado-*`, que passam a apontar para `~/.claude/cctk/ado-mcp.js`.

Pontos de código a trocar:
- Em `lib/toolkit.mjs`: `PLUGIN_ID`, `MARKETPLACE_SOURCE`, `paths()`, `kitMcp`, a lista `DENY` (`~/.cctk/**`).
- As regex do `secret-guard`, mais `trust.js` e `creds.js`.
- O `"name"` em `.claude-plugin/marketplace.json` e no `plugin.json`. A pasta `plugins/toolkit-dev/` vira
  `plugins/cctk/`.

### B. Distribuição pelo npm
- Caminho principal: `npm i -g cctk` e depois `cctk install`. Sem instalar global: `npx cctk@latest install`.
- Publicação manual (`npm publish` com 2FA). Trusted publishing e provenance exigem GitHub Actions, e CI está
  fora do roteiro.
- `MARKETPLACE_SOURCE` continua preso à tag da versão (`AlfredoNeeto/cctk#vX.Y.Z`), para o plugin bater com a
  CLI.
- Todas as dicas impressas passam a usar `cctk <cmd>`, por meio de um helper em `lib/toolkit.mjs`. Isso vale
  para `cli.mjs`, `check-gate.js`, `ado-mcp.js` e as skills.
- O teste de release (`test/toolkit.test.mjs:173`) deixa de exigir `#vX.Y.Z` nos docs. Passa a conferir a versão
  em `package.json`, em `plugin.json` e no `"ref"` do init-project.

### C. Instalador robusto (`installTools`, `run`)
- `timeout` por passo: npm 300 s, claude 120 s, sondas 15 s.
- Progresso `[3/8] Instalando OpenSpec…` com ✔/✖, e **exit 1** se algum passo falhar.
- `GIT_TERMINAL_PROMPT=0` no `run`, para o git não travar pedindo senha.
- Se o uv faltar, oferece instalar na hora com o instalador oficial (`irm https://astral.sh/uv/install.ps1 | iex`
  no Windows). Ele continua obrigatório, porque o kit é fechado.
- `--yes` (sem perguntas, para o bench e os testes) e `--dry-run` (mostra o que remove e o que muda, sem gravar).

### D. Update que mescla (sua decisão)
Quando o kit já está instalado:
- **Não** roda o `clean`.
- `writeConfig` só sobrescreve as chaves do kit: `model`, `modelSettings`, `outputStyle`, `statusLine`,
  `disableSkillShellExecution` e `sandbox`.
- O `env` é mesclado e o `permissions.deny` vira a união das duas listas.
- Ficam como estão: `enabledPlugins`, `extraKnownMarketplaces`, `permissions.allow` e `hooks`.
- A 1ª instalação continua limpando tudo, com backup.

### E. Plugin realmente atualizado (testado à mão com o claude 2.1.329)
- Na 1.1.x, `marketplace add` com a tag nova **falha** ("source doesn't match its extraKnownMarketplaces
  entry") e o plugin fica na versão velha.
- `marketplace remove` + `add` funciona, mas apaga os dados do plugin (o log do check que o `stats` lê).
- Caminho adotado:
  1. o `writeConfig` troca a `ref` em `extraKnownMarketplaces.cctk`;
  2. `marketplace add <repo>#<tag nova>`;
  3. `plugin install` (instala se o plugin for novo; se já existir, não atualiza);
  4. `plugin update`.

### F. `doctor`, `update` e `restore`
- `doctor`: versão nova via `npm view cctk version` (3 s, fail-open) e confere
  `enabledPlugins['cctk@cctk'] === true`.
- `cctk update`: roda `npm i -g cctk@latest` e depois `cctk install --yes`.
- `restore`: pede confirmação e passa a ref ao readicionar o marketplace.

### G. Docs
- O "Instalar" do README cai para 2 linhas: `npm i -g cctk` e `cctk install`.
- GUIA com o nome novo.
- Passo a passo de lançamento com o `npm publish`.
- Nota no topo do README: "antes chamado Claude Toolkit Dev".

## 1.3.0: segurança barata (nativo ou Node, sem binário novo)

**Feita.** O que foi medido com o Claude Code 2.1.329 real no Windows:
- `blockWritesOutsideWorkingDirectories`: o Write recusa fora do projeto ("…blocks writes outside the working
  directories. Ask the user to add the directory with /add-dir"). Vale só para Edit/Write/NotebookEdit; o
  shell continua livre, e plano, scratchpad e memória continuam graváveis.
- `CLAUDE_CODE_MCP_ALLOWLIST_ENV=1`: o MCP recebe só PATH, USERPROFILE, HOMEDRIVE/HOMEPATH, APPDATA,
  LOCALAPPDATA, TEMP, SYSTEMROOT, WINDIR, PROGRAMFILES, USERNAME/USERDOMAIN, PROCESSOR_ARCHITECTURE e as
  `CLAUDE_*`. Somem HTTPS_PROXY, NODE_EXTRA_CA_CERTS e COMSPEC. `"${X:-}"` no `env` do servidor repassa a
  variável (vazia se não existir), por isso os `ado-*` repassam proxy e CA.
- Hooks na forma exec: `${CLAUDE_PLUGIN_ROOT}` é expandido nos `args`. Uma sessão real barrou um commit com
  chave AWS no stage. O `onFailure` ficou de fora: sem ele, a falha de um hook já não bloqueia.
- Para não atrapalhar o uso: `Password=` em connection string só gera um aviso ao Claude (`additionalContext`,
  sem decisão de permissão), porque senha de dev no `appsettings.Development.json` é comum. Os formatos de
  token continuam bloqueando. O install pergunta uma vez qual é a pasta dos repositórios e a grava em
  `permissions.additionalDirectories`, para o Claude editar entre repositórios irmãos sem `/add-dir`.
  Recusa o home e a raiz do disco. Conferido com o claude real no Windows: com a pasta no settings do usuário, o
  Write gravou no repositório irmão e recusou a pasta de fora.
- O cofre virou uma entrada única no cofre do sistema (JSON, uma leitura por sessão), com os nomes em
  `~/.cctk/secrets.names`. O `creds.js` foi para dentro do plugin, porque o hook de sessão precisa dele.
1. **`permissions.blockWritesOutsideWorkingDirectories: true`**: cobre a escrita no Windows, que não tem
   sandbox. Antes, um teste E2E real no Windows.
2. **`CLAUDE_CODE_MCP_ALLOWLIST_ENV: '1'`**: o MCP do ADO, o DBHub e o context7 deixam de herdar o shell
   inteiro. O `ado-mcp.js` precisa de `PATH`, `USERPROFILE` e `APPDATA`; se faltar, declarar no `env` de cada
   `ado-*` (`addAdoServer`).
3. **Guarda de segredo no commit (criação nossa).** Hook PreToolUse com `if: "Bash(git commit*)"` /
   `"PowerShell(git commit*)"`.
   - Varre o `git diff --cached` atrás de: `AKIA…`, `ghp_`/`github_pat_`, `sk-ant-`, `BEGIN … PRIVATE KEY`,
     `Password=` em connection string, PAT do ADO e JWT.
   - Se achar, bloqueia com exit 2 e mostra arquivo:linha, sem mostrar o valor.
   - Timeout de 3 s e fail-open.
4. **Fechar o bypass do trust**: o `secret-guard` bloqueia comandos que citem `trust.js` ou
   `trusted-checks.json`.
5. **Cofre sem texto puro**:
   - Os valores vão para o `creds.js` (DPAPI, Keychain ou libsecret) e o `secrets.env` guarda só os nomes.
   - No Windows, uma única chamada ao PowerShell para todos os valores.
   - A atualização migra o `secrets.env` atual.
6. **Hooks na forma exec, com `onFailure: "continue"`**, no lugar do
   `node -e "require(…fromCharCode(92)…)"`.
   - Antes, conferir se `${CLAUDE_PLUGIN_ROOT}` é expandido dentro de `args`.
   - Adicionar `engines: {"claude-code": ">=2.1.323"}`.
7. **`init-project`**: o `.npmrc` do projeto Node/Angular ganha `min-release-age=7` (npm 11.10+), uma janela de
   espera contra pacote recém-comprometido.

Fora: safety-net/dcg (o auto mode já cobre), Snyk agent-scan (envia dados e executa o MCP), Lasso (Python; vira
tarefa de bench), claude-mem (licença) e winget (não se atualiza).

## 1.4.0: qualidade sem custo exorbitante (medir antes)
1. **Bench com os lados `advisor` (`"advisorModel":"opus"`) e `opusplan`**: as 24 tarefas, 2 execuções cada,
   cerca de US$ 10–12. Só entra se os acertos subirem com no máximo +15% de custo por acerto, ou se ficarem
   iguais custando menos.
2. **Statusline com `cache 87%`**, a partir de `prompt_cache.hit_ratio`. Não custa nada e mostra a cota sendo
   queimada.
3. **Tarefas novas no bench**: um commit com chave no diff (mede o 1.3.3) e um README com injeção de `curl | sh`
   (mede auto mode + deny).
4. **Candidato a remover: `stats`**. O `/usage` nativo mostra o uso por skill, plugin e MCP. Decidir depois de
   comparar as duas saídas.

---

## Arquivos que mudam
- `package.json`: name `cctk`, bin `cctk`, `description` "Claude Code Toolkit…".
- `cli.mjs` e `lib/toolkit.mjs`: tudo o que está em 1.2 e o `writeConfig` de 1.3.
- `plugins/toolkit-dev/` → `plugins/cctk/`: `hooks.json`, `secret-guard.js`, `secrets.js`, `check-gate.js`,
  `trust.js`, skills e `plugin.json`.
- `.claude-plugin/marketplace.json` e `runtime/` (`statusline.js`, `ado-mcp.js`, `creds.js`).
- `README.md`, `docs/GUIA.md`, `docs/ROADMAP.md` (novo), `bench/run.mjs`, `bench/README.md` e
  `demo/toolkit.tape`.
- Testes: `test/toolkit.test.mjs`, `test/e2e.test.mjs` e `hooks.test.js`.

## Verificação
- `npm test` a cada versão. Testes novos:
  - migração do kit antigo: `~/.claude-toolkit` vira `~/.cctk`, o `ado-*` continua lá e o plugin antigo sai;
  - o update mescla: `env.HTTPS_PROXY`, `permissions.allow` e `enabledPlugins` sobrevivem;
  - qualquer passo que falha dá exit 1;
  - `--dry-run` não grava nada;
  - commit com `ghp_…` é bloqueado e diff limpo passa;
  - `secret set` não deixa nada em texto puro;
  - o bypass do `trust.js` é bloqueado.
- `E2E_REAL=1 npm test` no Windows:
  - install do kit antigo e depois `cctk install`: o plugin muda e continua habilitado;
  - `blockWritesOutsideWorkingDirectories` funciona;
  - o MCP do ADO sobe com a allowlist.
- `npm pack --dry-run` e `npm i -g ./cctk-1.2.0.tgz` numa HOME isolada antes de publicar.
- Bench da 1.4: lados `kit`, `advisor` e `opusplan`; o resultado vai para o `bench/README.md`.
