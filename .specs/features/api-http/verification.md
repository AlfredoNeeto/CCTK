# Testar a API por HTTP no check verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: 7360c73..e85945d
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Why not PASS: C1-C9 are proven at e85945d with located evidence, run on Windows (Node v24.21.0) in a worktree of
e85945d. C10, the entry rule, has no bench round yet, so it is **pending**: it is not proven and it has not failed.
The gate cannot accept a PASS while a check is unproven. Separately, F1 shows that on Linux and macOS the API is
left running when the check-gate kills the check at its time limit. That is the exact case AC 4 and C4 name, and
C4's POSIX branch has never run.

Scope: only api-http is judged here: `plugins/cctk/hooks/api-check.js`, the `${CLAUDE_PLUGIN_ROOT}` replacement in
`check-gate.js` and in `bench/run.mjs` (`checkCmd`), the "Testes HTTP" item of `init-project/SKILL.md`,
`bench/tasks/api-contrato`, the `sem-http` arm, and `test/api-check*.test.mjs`. The prototipo-codigo fixes in the
same commit are not judged.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | with the API up, the runner gets the `--files` files and exit 0 passes; with real httpyac, `?? status == 200` passes and `?? status == 404` on a 200 route fails | `node --test test/api-check.test.mjs`: `✔ C1 with the API up, ...` (exit 0) · `node --test test/api-check-httpyac.test.mjs`: `✔ C1 real httpyac: a matching contract passes, a broken one fails` (5.0 s, exit 0) | `test/api-check.test.mjs:60` - `assert.equal(r.status, 0, ...)` / `:61` - `assert.match(r.stdout, /passaram/)`. Files reaching the runner are asserted only in C3 (`:81`). `test/api-check-httpyac.test.mjs:35` - `assert.equal(ok.status, 0, ...)` / `:39` - `assert.equal(bad.status, 1, ...)` / `:40` - `assert.match(bad.stderr, /os testes HTTP falharam/)` | PASS |
| C2 | `--start` that never opens the port with `--wait 2` exits 1 in < 10 s; stderr has "não respondeu" and the API's last line | same run: `✔ C2 an API that never answers ...` | `test/api-check.test.mjs:70` - `assert.equal(r.status, 1)` / `:71` - `assert.ok(Date.now() - t0 < 10000, ...)` / `:72` - `assert.match(r.stderr, /não respondeu/)` / `:73` - `assert.match(r.stderr, /api: travou antes de abrir a porta/)` | PASS |
| C3 | runner exiting 1 makes api-check exit 1 and print the runner output | same run: `✔ C3 a failing runner fails the check ...` | `test/api-check.test.mjs:79` - `assert.equal(r.status, 1)` / `:81` - `assert.match(r.stderr, /corretor: .*saude\.http.* -> 200/)` | PASS |
| C4 | port closed after a pass, after a fail, and after the process tree is killed the way the check-gate does at its limit | same run: `✔ C4 the API is down after a pass, ...` | `test/api-check.test.mjs:88` - `assert.ok(await waitPort(port, false), 'still up after a pass')` / `:90` - `... 'still up after a fail'` / `:97` - `taskkill /pid ... /T /F` then `:99` - `assert.ok(await waitPort(port, false), 'API left running after the tree was killed')`. The `else process.kill(-child.pid, 'SIGKILL')` branch at `:98` never ran (Windows), and by analysis it would fail (F1) | PASS (Windows only; POSIX branch not run - F1) |
| C5 | no matching file: exits 0, says there is no HTTP test, never starts the API | same run: `✔ C5 no .http file ...` | `test/api-check.test.mjs:107` - `assert.equal(r.status, 0)` / `:108` - `assert.match(r.stdout, /não há teste HTTP/)` / `:109` - `assert.ok(!fs.existsSync(path.join(dir, 'subiu.txt')), 'the API was started')` | PASS |
| C6 | check-gate replaces `${CLAUDE_PLUGIN_ROOT}` before running; the bench does the same | same run: `✔ C6 the check-gate replaces ...` · `node bench/run.mjs --dry --tasks api-contrato`: `ok api-contrato: ... check passa` (exit 0) | `test/api-check.test.mjs:118` - check `node "${CLAUDE_PLUGIN_ROOT}/hooks/api-check.js" --files nada/*.http` / `:128` - `assert.equal(r.status, 0, ...)`, where a missing replacement makes the gate exit 2. Code: `plugins/cctk/hooks/check-gate.js:125`, `bench/run.mjs:148` (`checkCmd`), used at `bench/run.mjs:205` and `:416` | PASS |
| C7 | the init-project "Testes HTTP" step creates `http/<recurso>.http` with `?? status ==` plus a body assertion, and `http/http-client.env.json` | same run: `✔ C7 init-project creates ...` | `test/api-check.test.mjs:141` - `for (const t of ['http/<recurso>.http', '?? status ==', 'corpo', 'http/http-client.env.json']) assert.ok(s.includes(t), t)`. Text at `plugins/cctk/skills/init-project/SKILL.md:123-136` | PASS |
| C8 | the same step writes the composed check with `node "${CLAUDE_PLUGIN_ROOT}/hooks/api-check.js" --start` and reminds `cctk trust` | same run: `✔ C8 init-project writes the composed check ...` | `test/api-check.test.mjs:146` - `assert.ok(s.includes('node "${CLAUDE_PLUGIN_ROOT}/hooks/api-check.js" --start'), ...)` / `:147` - `assert.ok(s.includes('cctk trust'), ...)` | PASS |
| C9 | dry run exits 0: hidden tests fail without the solution, pass with it, and the check (which runs api-check) passes | `node bench/run.mjs --dry --tasks api-contrato` -> `ok   api-contrato: sem solução 5/6, com solução 6/6, check passa`, exit 0 (real httpyac through `checkCmd`) | `bench/run.mjs:205` - `const check = sol ? sh(checkCmd(t), sol).status === 0 : true;` / `:207` - `const good = !before.pass && after.pass && check;`. Task check: `bench/tasks/api-contrato/task.json:4` | PASS |
| C10 | in a real round, `toolkit` passes more often than `sem-http` at no more than +15% cost per pass, or the step leaves init-project | not run - no round yet (`BENCH_ROUND` has nothing to point at) | `test/api-check-rodada.test.mjs:22` - `const entra = t.passes > s.passes && t.cpp <= 1.15 * s.cpp;` / `:24` - `assert.equal(init.includes('**Testes HTTP'), entra, ...)` (the test exists; it has not run) | PENDING - no round yet |

Every named test exists and appears individually in the output: 8/8 in `test/api-check.test.mjs` and 1/1 in
`test/api-check-httpyac.test.mjs`. All three test files are new in the diff range.

## Gate

- `node --test test/api-check.test.mjs`: 8 passed, 0 failed (7.5 s)
- `node --test test/api-check-httpyac.test.mjs`: 1 passed, 0 failed (5.1 s, real httpyac 6.16.7 through npx)
- `node bench/run.mjs --dry --tasks api-contrato`: `ok`, exit 0
- C10: not run (pending)

## Findings

Ranked by severity.

1. **F1 (major) - Linux/macOS: the API outlives the check-gate's time-limit kill (AC 4 / C4).**
   - `check-gate.js:126` spawns the check with `detached: true`, so `sh` leads group G1. At the limit, `check-gate.js:119` sends `process.kill(-pid, 'SIGKILL')` to G1 only.
   - `api-check.js:65` spawns the API with `detached: true` as well. On POSIX, Node runs `setsid()` for that, so the API gets its own session and group, G2.
   - SIGKILL cannot be caught, so the cleanup handlers at `api-check.js:69-70` never run. The API in G2 is orphaned.
   - AC 4 says "quando recebe SIGTERM do check-gate", but the check-gate never sends SIGTERM.
   - The `--limit 150` guard (`api-check.js:61`) counts from when api-check starts, not from when the check starts. In `<build && tests> && node api-check.js`, any build and test time pushes api-check's own deadline past the gate's 180 s, which is exactly when the gate kills first.
   - The spawnSync timeout (`api-check.js:83`) also kills only the runner's shell. If npx/httpyac were forked, they keep the pipe open and the call blocks too.
   - The C4 POSIX branch (`test/api-check.test.mjs:98-99`) reproduces this kill and, by this reasoning, would fail. It has never run (no CI, verified on Windows only).
   - The leaked API then holds the port, which feeds F2.
   - Fix direction: keep the API in the caller's group (no `detached` on POSIX) and kill its descendants explicitly. Or have the gate send SIGTERM, wait a short grace, then SIGKILL. Or pass the gate's deadline down through an env var so `--limit` counts from the check's start.
2. **F2 (medium) - a server already on the port is taken for the fresh API.**
   - `waitUp` (`api-check.js:39-47`) accepts any HTTP answer at `--url`.
   - If something already listens there (the developer's own instance in VS / `dotnet watch`, or an F1 orphan), the first probe succeeds. The new API dies with EADDRINUSE, and httpyac tests the old process.
   - The result is a stale pass or a false failure. The bench is exposed too, because `api-contrato` uses the fixed port 3210.
   - Fix direction: probe `--url` once before spawning and fail with a clear message if it already answers.
3. **F3 (medium) - Windows: `--limit` does not bound a hung httpyac.**
   - On Windows, the spawnSync timeout (`api-check.js:83`) kills only `cmd.exe`. The npx/httpyac grandchild keeps the pipes open, so the call does not return. The check-gate's own comment documents this (`check-gate.js:116`).
   - No `--timeout` is passed to httpyac.
   - There is no leak on Windows: the gate's `taskkill /T` at 180 s still takes the API down, which C4 proves. But the header claim at `api-check.js:6` ("--limit keeps the whole run under the check-gate's 3 minutes, so this process always gets to stop the API itself") does not hold.
4. **F4 (minor, coverage) - AC 8's trap has no automated proof.**
   - C9 proves only before and after the solution. Nothing exercises "the obvious change passes the unit tests and breaks the contract".
   - I checked it by hand in a scratch copy: solution files plus `buscar = (id) => pedidos.get(id)`, with `cancelar` using `if (!p)`.
   - Unit tests (`node --test`): 3/3 pass.
   - Hidden tests: 5/6. Only `contrato: GET /pedidos/:id inexistente continua 404` fails, at `hidden.test.js:38`, because the 200 has an empty body and `r.json()` throws.
   - api-check with real httpyac: exit 1, `[-] status == 404 (AssertionError ... status (200) == 404)`, and `--bail` skipped the remaining request.
   - The trap works, but a `naive/` overlay in `--dry` would keep it from silently stopping working.
5. **F5 (minor) - one hidden test does not tell the solution apart.**
   - `cancelar inexistente: 404` (`hidden/hidden.test.js:60-64`) already passes on the untouched repo, because an unknown route returns 404 with `{ erro }` (`repo/src/rotas.js:35`). That is why the dry run shows `sem solução 5/6`.
   - Only test 5 separates before from after.
6. **F6 (minor, fairness) - `sem-http` can still find the contract in git history.**
   - `workspace()` commits `inicial` with `http/` included (`bench/run.mjs:134`). The arm then deletes it in a second commit named `sem-http` (`bench/run.mjs:361-365`), so `git show HEAD~1:http/pedidos.http` still returns the contract.
   - This biases toward `sem-http`, which makes the comparison conservative rather than unfair to it.
   - Otherwise the arm is fair: same prompt (`task.json:3`), only `http/` removed and the check reduced to `node --test` (`task.json:6`), and the same grader and post-run check for both arms (`bench/run.mjs:416`). Runs are sequential (`bench/run.mjs:623-626`), so the bench runs never fight over port 3210.
   - Fix direction: apply the removal before the initial commit.
7. **F7 (precision gaps in the checks).**
   - AC 2's "últimas 20 linhas" cap (`api-check.js:63`) is not asserted. C2 checks only that the last line is present.
   - C1's fake-runner test does not assert which files reach the runner. Only C3's regex does (`test/api-check.test.mjs:81`).
   - C4's claim is not platform-qualified, yet only the Windows branch is proven.
   - The wait-timeout message prints `${o.wait} s` even when `--limit` shortened the wait (`api-check.js:74`).

**(a) Does any exit path leave the API running?**

| Path | Result | Why |
| --- | --- | --- |
| Pass | no | `stop()` at `api-check.js:84` |
| Fail | no | `stop()` at `api-check.js:84` |
| Wait timeout | no | `stop()` at `api-check.js:75` |
| Exception or uncaught error | no | the `exit` handler at `api-check.js:69` |
| SIGTERM / SIGINT / SIGHUP on POSIX | no | the handlers at `api-check.js:70` |
| check-gate tree kill on Windows | no | proven by C4 (`taskkill /T` walks the tree) |
| `--limit` exceeded, Windows | no leak | blocks until the gate kills the tree (F3) |
| check-gate SIGKILL at the limit on Linux/macOS | **yes** | F1 |
| `--limit` exceeded, POSIX | **yes**, when the runner's shell forked | F1 |
| Start command that forks and exits (`start`, `-d`, a daemon) | **yes** | `killTree` returns early once the direct child exited (`api-check.js:33`); `waitUp` also fails it (`:42`) |

**(b) httpyac CLI:** it matches. `npx -y httpyac@6.16.7 send --help` documents
`send <fileName...>` ("path to file or glob pattern"), `-a, --all` ("execute all http requests in a http file"),
`--bail` ("stops when a test case fails") and `-e, --env <env...>` ("list of environments"). The real run confirmed
all three: `--env dev` resolved `{{baseUrl}}`, and `--bail` skipped the request after the failure ("4 requests
processed (2 succeeded, 1 failed, 1 skipped)"). `--env` takes several values, and placing it last after the files
(`api-check.js:82`) is correct. The only option worth adding is httpyac's own `--timeout` (F3).

**(c) `api-contrato`:** it holds (details in F4). The naive refactor passes the repo's unit tests, because
`test/pedidos.test.js:13` only asserts `!pedidos.buscar(99)`, which `undefined` satisfies. It fails only the hidden
404 contract test. The task is fair to `sem-http`, apart from the git-history leak (F6).

**(d) `${CLAUDE_PLUGIN_ROOT}` replacement:** safe, no finding.
- The replacement is `path.resolve(__dirname, '..')` (`check-gate.js:125`): the installed plugin's own directory, which the repository cannot influence.
- `cctk trust` approves the literal string, and the literal is what `isTrusted` compares (`check-gate.js:98`), before the replacement.
- A check such as `node "${CLAUDE_PLUGIN_ROOT}/../x.js"` shows its `..` in the approved text and resolves into the user's plugin cache, which the repo cannot write to.
- If the plugin is loaded from inside the repo, then `check-gate.js` itself is repo code, so nothing is escalated.
- Residual, accepted: the expansion follows plugin updates without a new trust, but that is the plugin's own code, which already runs as hooks. The trust prompt shows the placeholder unexpanded.
