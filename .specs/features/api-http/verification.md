# Testar a API por HTTP no check verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: 717b2b5..cf377c1 (fix, restricted to `plugins/cctk/hooks/api-check.js` and `.specs/features/api-http/*`; `920e3da` belongs to prototipo-codigo and is out of scope), on top of rounds 1-2 at 7360c73..717b2b5
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Why not PASS: every proof re-ran at cf377c1 and is green: C1-C9, C11 and C12. C10, the entry rule, still has no
bench round, so it stays **pending**. It is not proven and has not failed. The gate cannot accept a PASS while a
check is unproven. This is the third and last bounded round, so C10 goes to the user.

F8 (POSIX without `ps`) is resolved: the `/proc` fallback parses `/proc/<pid>/stat` correctly, including a `comm`
with spaces and parentheses. I checked this by running the verbatim `parents()`/`descendants()` source against a
fake `/proc` tree. F10 is resolved: AC 4 and the header now say what the code does. F9 is recorded honestly for the
`--start` daemon case. The runner half of round-2 F9 is not recorded (minor, see Findings).

Scope: the fix diff (`api-check.js` +18/-6: `parents()` split out of `descendants()`, header lines 6-8; `plan.md`
AC 4; `checks.md` Round 3 Handoff line), plus every non-PASS verdict from round 2 (C10, F4, F5, F7, F8, F9, F10).
Run on Windows 11, Node v24.21.0, in a detached worktree of cf377c1.

## Checks (verified at cf377c1)

All proofs re-ran in full at cf377c1. `test/api-check.test.mjs`, `test/api-check-httpyac.test.mjs`, `bench/run.mjs`
and `check-gate.js` are unchanged by `717b2b5..cf377c1` (diffstat checked), so test citations carry from 717b2b5.
Code citations in `api-check.js` were refreshed, because lines moved.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | API up: the runner gets the files and exit 0 passes; with real httpyac, `?? status == 200` passes and `== 404` on a 200 route fails | `node --test test/api-check.test.mjs`: `✔ C1 with the API up, ...` (1.2 s) · `node --test test/api-check-httpyac.test.mjs`: `✔ C1 real httpyac: ...` (5.5 s) | `test/api-check.test.mjs:60` - `assert.equal(r.status, 0, ...)` / `:61` - `/passaram/`. `test/api-check-httpyac.test.mjs:35` / `:39` / `:40` | PASS |
| C2 | `--start` that never opens the port with `--wait 2` exits 1 in < 10 s; stderr has "não respondeu" and the API's last line | same run: `✔ C2 ...` (2.1 s) | `test/api-check.test.mjs:70-73`. Message at `api-check.js:124` | PASS |
| C3 | runner exit 1 makes api-check exit 1 and print the runner output | same run: `✔ C3 ...` (1.2 s) | `test/api-check.test.mjs:79` / `:81` - `/corretor: .*saude\.http.* -> 200/`. Code `api-check.js:132-137` | PASS |
| C4 | port closed after a pass, after a fail, and after the tree is killed the way the check-gate does | same run: `✔ C4 ...` (2.7 s) | `test/api-check.test.mjs:88` / `:90` / `:97` (`taskkill /T /F`) / `:99`. POSIX branch `:98` (`process.kill(-child.pid, 'SIGKILL')`) has not run; by analysis it passes (round 2, F1) | PASS (Windows run; POSIX by analysis) |
| C5 | no matching file: exits 0, says so, never starts the API | same run: `✔ C5 ...` | `test/api-check.test.mjs:132-134`. Code `api-check.js:98-101` | PASS |
| C6 | check-gate and bench replace `${CLAUDE_PLUGIN_ROOT}` | same run: `✔ C6 ...` · `node bench/run.mjs --dry --tasks api-contrato` exit 0 | `test/api-check.test.mjs:153`. Code `plugins/cctk/hooks/check-gate.js:125`, `bench/run.mjs:148` | PASS |
| C7 | init-project "Testes HTTP" step creates `http/<recurso>.http` with status and body asserts, and the env file | same run: `✔ C7 ...` | `test/api-check.test.mjs:166` | PASS (untouched; re-run) |
| C8 | the same step writes the composed check and reminds `cctk trust` | same run: `✔ C8 ...` | `test/api-check.test.mjs:171` / `:172` | PASS (untouched; re-run) |
| C9 | dry run: hidden tests fail without the solution, pass with it, and the check passes | `node bench/run.mjs --dry --tasks api-contrato` -> `ok   api-contrato: sem solução 5/6, com solução 6/6, check passa`, exit 0 | `bench/run.mjs:205` / `:207`, `bench/tasks/api-contrato/task.json:4` | PASS |
| C10 | in a real round, `toolkit` passes more often than `sem-http` at no more than +15% cost per pass | not run - there is still no round | `test/api-check-rodada.test.mjs:22` / `:24` (exists, has not run) | PENDING - no round yet |
| C11 | something already answering at `--url`: exits 1, says "já tem um servidor respondendo", never runs `--start` | same run: `✔ C11 ...` (0.27 s) | `test/api-check.test.mjs:111` - `assert.equal(r.status, 1)` / `:112` - `/já tem um servidor respondendo/` / `:113` - `!fs.existsSync(... 'subiu.txt')`. Code `api-check.js:108-111` | PASS |
| C12 | hanging runner with `--limit 4`: exits 1 in < 20 s, says "interrompido", and the port closes | same run: `✔ C12 ...` (4.2 s) | `test/api-check.test.mjs:121` / `:122` / `:123` - `/interrompido/` / `:124` - `waitPort(port, false)`. Code `api-check.js:66-77` | PASS (Windows) |

Every named test appears on its own line in the output: 10/10 in `test/api-check.test.mjs` and 1/1 in
`test/api-check-httpyac.test.mjs`.

## Gate (verified at cf377c1)

- `node --test test/api-check.test.mjs`: 10 passed, 0 failed (11.9 s), exit 0
- `node --test test/api-check-httpyac.test.mjs`: 1 passed, 0 failed (5.5 s, real httpyac through npx)
- `node bench/run.mjs --dry --tasks api-contrato`: `ok`, exit 0
- `npm test`: 108 tests, 107 passed, 0 failed, 1 skipped (`real claude ... # defina E2E_REAL=1`), exit 0
- C10: not run (pending)

## Round-2 findings (re-judged at cf377c1)

| Finding | Status | Evidence |
| --- | --- | --- |
| F8 (medium) POSIX without `ps`: the API leaks on a normal exit | **resolved** (by analysis plus a parse test; Linux not run) | See below |
| F10 (minor, doc) AC 4 and the header no longer matched the code | **resolved** | See below |
| F9 (minor) an exited direct child means nothing gets killed | **recorded as a known limit**, half of it | `api-check.js:7-8`, `checks.md` Round 3 line. Honest for `--start`; the runner half is not recorded. See below |
| F4 (minor) AC 8's trap has no automated proof | open (not in fix scope) | `bench/tasks/api-contrato` unchanged |
| F5 (minor) one hidden test does not separate before from after | open (not in fix scope) | dry run still `sem solução 5/6` |
| F7 (precision) 20-line cap, C1's files, C4 platform | open (not in fix scope) | `test/api-check.test.mjs:73`, `:61`; `checks.md:27` C4 still not platform-qualified |

**F8 in detail** (`parents()`, `api-check.js:37-48`; `descendants()`, `:50-56`).
- `ps` path when `ps` works: `spawnSync('ps', ['-A', '-o', 'pid=,ppid='])` (`:38`), then the same
  `trim().split(/\s+/).map(Number)` parse and the same `if (p && pp)` filter (`:52`) as at 717b2b5. The only
  change is that it is now taken only on `!r.error && r.status === 0` (`:39`). With procps or BSD `ps`, which exit 0,
  the behaviour is unchanged. A `ps` that rejects `-A`/`-o` (BusyBox builds) now falls through to `/proc` instead of
  yielding nothing, which is an improvement.
- `/proc` path: it lists numeric entries of `/proc` and reads `/proc/<pid>/stat`. It takes
  `stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1]`. proc(5) gives the format `"%d (%s) %c %d ..."` (pid, comm,
  state, ppid). After the last `)` comes one space, so `+2` lands on the state, `[0]` is the state, and `[1]` is the
  ppid. `lastIndexOf` is the right choice, because comm can hold `)` and spaces but nothing follows the last `)`
  except the fixed fields.
- Parse test: I loaded the verbatim `parents()`/`descendants()` text from `api-check.js` into node. I pointed `'/proc'`
  at a fake tree and `ps` at a missing binary (the script lives in the session scratchpad). The stat lines covered:
  `101 (npm run dev) S 100 ...`, `102 (a) b) (c) R 101 ...`, `103 (node) S 102 ...\n` (trailing newline),
  `104 ()) Z 103 ...` (zombie, comm `)`), ppid 0 entries, a non-numeric dir, and a numeric dir with no `stat` (process
  gone). The result was `pairs [[1,0],[100,1],[101,100],[102,101],[103,102],[104,103],[2,0],[200,1],[]]`.
  `descendants(100)` gave `[101,102,103,104]` (expected) and `descendants(1)` gave `[100,101,102,103,104,200]`
  (expected). The vanished process gives `[]`, which the `p && pp` filter drops.
- No `/proc` and no `ps` (macOS without `ps`, not a realistic host) returns `[]`. That is the round-2 behaviour: only
  the direct child is killed.
- On Windows `killTree` returns at `:60` before `descendants`, so the new code cannot run there. It also cannot
  regress the Windows proofs, which are green.
- Not run: no Linux host. The fs calls are plain `readdirSync`/`readFileSync`, so the residual risk is low.

**F10 in detail.**
- AC 4 (`plan.md:56`) now reads "derrubar a árvore de processos da API em toda saída, e a API SHALL ficar no grupo de
  processos do check, para cair junto quando o check-gate mata a árvore no limite de 3 minutos".
- That matches the code. The gate spawns the check with `detached` on POSIX (`check-gate.js:126`) and kills `-pid`
  with SIGKILL, or runs `taskkill /T /F` on Windows (`:117-119`). api-check spawns the API with no `detached`
  (`api-check.js:115`). The SIGTERM wording is gone.
- The header (`api-check.js:6-8`) says "--limit bounds this process" (true: `deadline` caps `waitMs` at `:122` and the
  runner at `:132`). It also says that past 3 minutes the gate kills the group and the API goes with it. The false
  claim "this process always gets to stop the API itself" is gone.

**F9 honesty.**
- The `--start` half is recorded honestly. The header says "a --start that forks a daemon and exits is not followed",
  and the Handoff repeats it. Neither claims the gate's group kill catches such a daemon, which is correct, because a
  daemon normally calls `setsid`.
- AC 4's "em toda saída" is still unqualified. It is consistent only in the narrow sense that a reparented daemon is
  no longer in the API's tree.
- The runner half of round-2 F9 is not recorded anywhere. `killTree` returns early when the direct child has exited
  (`api-check.js:59`), so `runWithin`'s timer (`:73`) is a no-op if the runner's shell exits while a grandchild holds
  the pipes. The gate's 180 s group kill still ends it. This is minor.

## Findings

Ranked by severity. Lines are at cf377c1.

1. **C10 (pending, blocks PASS)** - no bench round has run. `test/api-check-rodada.test.mjs:22` / `:24` exist and
   have never run. After three rounds this goes to the user.
2. **F9 (minor, partly recorded)** - the runner half is not in the known limit. If the runner's shell has exited while
   a grandchild holds the pipes, `killTree` returns early (`plugins/cctk/hooks/api-check.js:59`) and the `--limit`
   timer (`:73`) does nothing. The gate's group kill bounds it at 180 s. AC 4's "em toda saída"
   (`.specs/features/api-http/plan.md:56`) does not mention the daemon exception.
3. **F4 (minor, open)** - no `naive/` overlay exercises AC 8's trap in `--dry` (`bench/tasks/api-contrato/`).
4. **F7 (precision, open)** - the 20-line cap is not asserted (`test/api-check.test.mjs:73`), C1 does not assert
   which files reach the runner (`:61`), and C4 is not platform-qualified (`.specs/features/api-http/checks.md:27`).
5. **F5 (minor, open)** - `cancelar inexistente: 404` passes before the solution
   (`bench/tasks/api-contrato/hidden/hidden.test.js:60-64`).

Residual risk: C4's POSIX branch, C12 on POSIX and the new `/proc` path have never run on Linux or macOS. Only Windows
is available. F1 and F8 rest on analysis and the fake-`/proc` parse test.

## Carried from 717b2b5 and e85945d (not re-examined)

These were outside the fix diff and were not re-reviewed.
- F1, F2, F3 and F6 (resolved in round 2). The fix touched none of their code paths: the guard, `runWithin`,
  `bench/run.mjs` and `check-gate.js` are unchanged.
- (b) The httpyac CLI flags.
- (d) The `${CLAUDE_PLUGIN_ROOT}` trust analysis.
- (c) The `api-contrato` task fairness.
