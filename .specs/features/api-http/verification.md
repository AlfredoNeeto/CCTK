# Testar a API por HTTP no check verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: e85945d..717b2b5 (fix), on top of round 1 at 7360c73..e85945d
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Why not PASS: every proof re-ran at 717b2b5 and is green: C1-C9, C11 and C12. C10, the entry rule, still has no
bench round, so it stays **pending**. It is not proven and has not failed. The gate cannot accept a PASS while a
check is unproven.

The round-1 blocker F1 is resolved by analysis: on Linux and macOS the API now stays in the check's process group,
which the check-gate SIGKILLs at its limit. C4's POSIX branch still has never run here, because only Windows is
available. One new medium finding (F8): on a POSIX host without `ps`, api-check's own cleanup quietly stops killing
the server.

Scope: the fix diff `e85945d..717b2b5` (`plugins/cctk/hooks/api-check.js`, `bench/run.mjs` sem-http block,
`test/api-check.test.mjs` C11/C12, `checks.md` Round 2 line), plus every non-PASS verdict from round 1 (C10 and
F1-F7). Run on Windows 11, Node v24.21.0, in a detached worktree of 717b2b5.

## Checks (verified at 717b2b5)

All proofs re-ran in full at 717b2b5. Citations were refreshed, because line numbers moved in `api-check.js` and in
the test file.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | API up: the runner gets the files and exit 0 passes; with real httpyac, `?? status == 200` passes and `== 404` on a 200 route fails | `node --test test/api-check.test.mjs`: `✔ C1 with the API up, ...` · `node --test test/api-check-httpyac.test.mjs`: `✔ C1 real httpyac: ...` (5.0 s) | `test/api-check.test.mjs:60` - `assert.equal(r.status, 0, ...)` / `:61` - `/passaram/`. `test/api-check-httpyac.test.mjs:35` / `:39` / `:40` (unchanged by the fix) | PASS |
| C2 | `--start` that never opens the port with `--wait 2` exits 1 in < 10 s; stderr has "não respondeu" and the API's last line | same run: `✔ C2 ...` (2.1 s) | `test/api-check.test.mjs:70-73`. The message now prints the wait that applied (`api-check.js:112`) | PASS |
| C3 | runner exit 1 makes api-check exit 1 and print the runner output | same run: `✔ C3 ...` | `test/api-check.test.mjs:79` / `:81` - `/corretor: .*saude\.http.* -> 200/`. The output now comes from `runWithin` (`api-check.js:120-124`) | PASS |
| C4 | port closed after a pass, after a fail, and after the tree is killed the way the check-gate does | same run: `✔ C4 ...` (2.7 s) | `test/api-check.test.mjs:88` / `:90` / `:97` (`taskkill /T /F`) / `:99`. The POSIX branch `:98` (`process.kill(-child.pid, 'SIGKILL')`) still has not run. By analysis it now passes (F1 below) | PASS (Windows run; POSIX by analysis) |
| C5 | no matching file: exits 0, says so, never starts the API | same run: `✔ C5 ...` | `test/api-check.test.mjs:132-134` | PASS |
| C6 | check-gate and bench replace `${CLAUDE_PLUGIN_ROOT}` | same run: `✔ C6 ...` · `node bench/run.mjs --dry --tasks api-contrato` exit 0 | `test/api-check.test.mjs:153`. Code: `plugins/cctk/hooks/check-gate.js:125`, `bench/run.mjs:148` (untouched by the fix) | PASS |
| C7 | init-project "Testes HTTP" step creates `http/<recurso>.http` with status and body asserts, and the env file | same run: `✔ C7 ...` | `test/api-check.test.mjs:166` | PASS (untouched; re-run) |
| C8 | the same step writes the composed check and reminds `cctk trust` | same run: `✔ C8 ...` | `test/api-check.test.mjs:171` / `:172` | PASS (untouched; re-run) |
| C9 | dry run: hidden tests fail without the solution, pass with it, and the check passes | `node bench/run.mjs --dry --tasks api-contrato` -> `ok   api-contrato: sem solução 5/6, com solução 6/6, check passa`, exit 0 | `bench/run.mjs:205` / `:207`, `bench/tasks/api-contrato/task.json:4` | PASS |
| C10 | in a real round, `toolkit` passes more often than `sem-http` at no more than +15% cost per pass | not run - there is still no round | `test/api-check-rodada.test.mjs:22` / `:24` (exists, has not run) | PENDING - no round yet |
| C11 | something already answering at `--url`: exits 1, says "já tem um servidor respondendo", never runs `--start` | same run: `✔ C11 ...` (0.27 s) | `test/api-check.test.mjs:111` - `assert.equal(r.status, 1)` / `:112` - `/já tem um servidor respondendo/` / `:113` - `!fs.existsSync(... 'subiu.txt')`. Code `api-check.js:96-99`. Fault: replacing the guard with `if (false)` makes C11 fail (`✖ C11`, 0.35 s) | PASS |
| C12 | hanging runner with `--limit 4`: exits 1 in < 20 s, says "interrompido", and the port closes | same run: `✔ C12 ...` (4.2 s) | `test/api-check.test.mjs:121` / `:122` / `:123` - `/interrompido/` / `:124` - `waitPort(port, false)`. Code `api-check.js:54-65`. Fault: dropping `killTree(child)` from the timer (`:61`) makes C12 fail (`✖ C12`, 60.0 s) | PASS (Windows) |

Every named test appears on its own line in the output: 10/10 in `test/api-check.test.mjs` and 1/1 in
`test/api-check-httpyac.test.mjs`.

## Gate (verified at 717b2b5)

- `node --test test/api-check.test.mjs`: 10 passed, 0 failed (11.9 s)
- `node --test test/api-check-httpyac.test.mjs`: 1 passed, 0 failed (5.1 s, real httpyac through npx)
- `node bench/run.mjs --dry --tasks api-contrato`: `ok`, exit 0
- `npm test`: 108 tests, 107 passed, 0 failed, 1 skipped (`real claude ... # defina E2E_REAL=1`), exit 0
- C10: not run (pending)

## Round-1 findings (re-judged at 717b2b5)

| Finding | Status | Evidence |
| --- | --- | --- |
| F1 (major) the API outlives the check-gate's limit kill on Linux/macOS | **resolved** (by analysis; POSIX not run) | See below |
| F2 (medium) a server already on the port is taken for the fresh API | **resolved** | Probe before spawn at `api-check.js:96-99`. Proven by C11, and the fault injection kills it |
| F3 (medium) Windows: `--limit` does not bound a hung httpyac | **resolved** | `spawnSync` is replaced by `runWithin` (`api-check.js:54-65`). At the deadline it runs `killTree`, which on Windows is `taskkill /T /F` (`:48`), so the pipes close and `close` fires. Proven by C12 at 4.2 s. A residual on the header text is in F10 |
| F4 (minor) AC 8's trap has no automated proof | open (not in fix scope) | No `naive/` overlay in `bench/tasks/api-contrato` (only `hidden repo solution task.json`). The round-1 manual check still stands |
| F5 (minor) one hidden test does not separate before from after | open (not in fix scope) | `bench/tasks/api-contrato` is unchanged by the fix. The dry run still shows `sem solução 5/6` |
| F6 (minor) `sem-http` finds the contract in git history | **resolved** | See below |
| F7 (precision) | partly resolved | Fixed: the wait message prints `waitMs` (`api-check.js:110-112`). Open: the 20-line cap is not asserted (C2 `test/api-check.test.mjs:73` checks one line). C1 does not assert which files reach the runner (only C3 `:81`). C4's claim is not platform-qualified (the Handoff Round 2 line says the POSIX branch has not run) |

**F1 in detail.**
- `check-gate.js:126` spawns `sh -c <check>` with `detached: true` on POSIX. Node calls `setsid()`, so that `sh` leads its own session and group, G1.
- `sh -c` is non-interactive and has no job control, so every command of the composed check (`build && tests && node api-check.js`) stays in G1.
- `api-check.js:103` now spawns the API with no `detached`, so the API's shell and its server inherit G1. So does the runner (`api-check.js:56`).
- At the limit, `check-gate.js:119` runs `process.kill(-pid, 'SIGKILL')`. That reaches every member of G1: api-check, the API tree and the runner tree. This holds even though api-check's handlers cannot run on SIGKILL.
- I grepped `api-check.js` for anything that creates a new session or group: the only spawns are `:56` and `:103` (neither detached), plus `spawnSync` of `ps` (`:35`) and `taskkill` (`:48`). None of them call `setsid`.
- The C4 test reproduces this exactly: `test/api-check.test.mjs:93-98` uses `detached: !win`, then `kill(-pid)`. It should now pass on POSIX.
- Residual 1: a start command that itself makes a new group or session escapes this (`setsid`, a daemon, or a tool that double-forks). api-check cannot control that.
- Residual 2: AC 4 still says "SIGTERM do check-gate" (F10).

**api-check's own cleanup on POSIX** (`descendants`, `api-check.js:34-44`; `killTree`, `:46-50`).
- `ps -A -o pid=,ppid=` is valid on procps (Linux) and on BSD `ps` (macOS).
- The parse trims the leading spaces. It drops header or garbage lines, because `Number('PID')` is NaN and fails `if (p && pp)`.
- The BFS collects the whole subtree. All of it is snapshotted before any kill, so killing a parent first cannot hide its children.
- The weak point is a missing `ps`. Then `spawnSync` returns `stdout: null` and `(r.stdout || '')` yields no descendants, so only the direct child is killed. That is F8.

**`runWithin`.**
- The timer runs `killTree(child)` at the deadline, and `close` resolves with `status ?? 1`, so a signal-killed runner counts as a failure.
- `stop()` then kills the API (`:121`).
- The output is capped at 64 KB.
- The `error` path resolves with status 1.
- One gap: `killTree` returns early once the direct child has exited (`:47`). If the runner's shell exits while a grandchild still holds the pipes, the timer kills nothing and `close` never fires. The check-gate's group kill at 180 s still ends it. This is narrow, and part of F9.

**The "already answering" guard.**
- Any HTTP answer within 2 s counts. A closed port fails fast (ECONNREFUSED), so a normal run pays nothing.
- A non-HTTP listener on the port times out after 2 s and is not caught. The fresh API then dies with EADDRINUSE, `waitUp` sees `api.exitCode !== null` and reports "não respondeu" with the API's last lines (EADDRINUSE). That is still a clear failure.
- The probe-then-spawn race is negligible.

**F6 / bench `sem-http`** (`bench/run.mjs:361-367`).
- After the `http/` removal and the cctk.json rewrite, the block deletes `.git` and re-inits with one `inicial` commit.
- I simulated it on Windows in a scratch copy of `bench/tasks/api-contrato/repo` that was first committed as `workspace()` does:
  - `fs.rmSync('.git', { recursive: true, force: true })` removes git's read-only object files without error.
  - The new repo has 1 commit. `git ls-files` lists no `http/`.
  - `git show HEAD~1:http/pedidos.http` fails.
  - `git log --all -p | grep -c pedidos.http` returns 0.
- Nothing downstream depends on the old history. The post-run `git add -A && git diff --cached --numstat` (`:419`) diffs against the new `inicial`, and so measures only Claude's work, as for the other arms.
- The canary root-commit lookup (`:158`) applies only to canary tasks. `api-contrato` has none.
- The `--dry` path never enters `runOnce`, so this is judged by reading the code plus that simulation.
- Latent: on a task with both `semHttp` and `canaryIn: "commit"`, the re-init would commit the staged canary into `inicial`. No task combines them today.

## Findings

Ranked by severity. Lines are at 717b2b5.

1. **F8 (medium, new) - POSIX without `ps`: the API leaks on a normal exit.**
   - `descendants()` (`plugins/cctk/hooks/api-check.js:35-39`) fails open when `ps` is missing. `killTree` (`:49`) then kills only the direct child.
   - Slim Debian/Ubuntu containers and `node:*-slim` ship without procps, so this case is real.
   - With a typical `--start` (`npm run dev`, `dotnet run`), the direct child is the launcher, and the server survives api-check's normal pass or fail. Before the fix, the group kill covered this.
   - The orphan then holds the port. Every later check fails on the C11 guard ("já tem um servidor respondendo") until someone kills it by hand.
   - No message says the cleanup was partial.
   - Fix direction: on Linux, fall back to walking `/proc/*/stat` when `ps` is missing, or at least print a warning.
2. **F9 (minor, carried from round-1 path table) - an exited direct child means nothing gets killed.**
   - `killTree` returns early when the direct child has exited (`api-check.js:47`).
   - A start command that forks and exits (a daemon, `start`, `-d`) leaves the server running.
   - The same early return makes `runWithin`'s timer (`:61`) a no-op if the runner's shell exits while a grandchild holds the pipes. The gate's 180 s group kill still ends that one.
3. **F10 (minor, doc) - two stated guarantees no longer match the code.**
   - AC 4 says "inclusive quando recebe SIGTERM do check-gate" (`.specs/features/api-http/plan.md:56`). The gate sends SIGKILL to the group (`check-gate.js:119`).
   - The header claim "this process always gets to stop the API itself" (`api-check.js:6`) is not true, because `--limit` counts from api-check's start, not from the check's start.
   - Both are now harmless, because the group kill covers the API, but the text is misleading.
4. **F4 (minor, open)** - no `naive/` overlay exercises AC 8's trap in `--dry`.
5. **F7 (precision, partly open)** - the 20-line cap and C1's files are not asserted, and C4 is not platform-qualified (`test/api-check.test.mjs:73`, `:61`).
6. **F5 (minor, open)** - `cancelar inexistente: 404` passes before the solution (`bench/tasks/api-contrato/hidden/hidden.test.js:60-64`).

Residual risk: C4's POSIX branch and C12 on POSIX have never run. No Linux or macOS host is available, and the
Docker daemon was not running, so I did not start it. F1's resolution rests on the process-group analysis above.

## Carried from e85945d (round 1, not re-examined)

These were outside the fix diff and were not re-reviewed.
- (b) The httpyac CLI flags.
- (d) The `${CLAUDE_PLUGIN_ROOT}` trust analysis. Neither `check-gate.js` nor `bench/run.mjs:148` changed.
- (c) The `api-contrato` task fairness, apart from F6.
