// node --test plugins/toolkit-dev/hooks
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { verdict } = require('./secret-guard.js');
const { trust } = require('./trust.js');

const run = (script, args, input, env) =>
  spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
    input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, ...env },
  });

// A project with a check the user already approved, unless trusted is false.
function project(check, trusted = true) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-proj-'));
  if (check !== undefined) {
    fs.mkdirSync(path.join(dir, '.claude'));
    fs.writeFileSync(path.join(dir, '.claude', 'toolkit.json'), JSON.stringify({ check }));
    if (trusted) trust(dir, check);
  }
  return dir;
}

// The same, as a git repo with everything committed (the snapshot only works inside git).
function gitProject(check) {
  const dir = project(check);
  fs.writeFileSync(path.join(dir, 'app.js'), 'module.exports = 1;');
  const g = spawnSync('git -c core.autocrlf=false init -q && git add -A && git -c user.name=t -c user.email=t@t commit -qm i', { cwd: dir, shell: true, encoding: 'utf8' });
  assert.strictEqual(g.status, 0, g.stderr);
  return dir;
}

test('check-gate', async (t) => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-data-'));
  // Fake home for the trust list, here (trust()) and in the hook processes, which inherit process.env.
  const realHome = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = process.env.USERPROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-home-'));
  t.after(() => { for (const [k, v] of Object.entries(realHome)) if (v === undefined) delete process.env[k]; else process.env[k] = v; });
  const env = { CLAUDE_PLUGIN_DATA: data, CLAUDE_PROJECT_DIR: '' };
  const pass = 'node -e "process.exit(0)"';
  const fail = 'node -e "console.log(\'boom\');process.exit(1)"';

  await t.test('no edits: does not run the check', () => {
    const r = run('check-gate.js', ['gate'], { session_id: 's1', cwd: project(fail) }, env);
    assert.strictEqual(r.status, 0);
  });
  await t.test('edits without config: allows stop', () => {
    run('check-gate.js', ['mark'], { session_id: 's2' }, env);
    assert.strictEqual(run('check-gate.js', ['gate'], { session_id: 's2', cwd: project() }, env).status, 0);
  });
  await t.test('edits + passing check: allows stop and clears marker', () => {
    run('check-gate.js', ['mark'], { session_id: 's3' }, env);
    assert.strictEqual(run('check-gate.js', ['gate'], { session_id: 's3', cwd: project(pass) }, env).status, 0);
    assert.ok(!fs.existsSync(path.join(data, 'toolkit-dirty-s3')));
  });
  await t.test('edits + failing check: blocks with output, then stop_hook_active without new edits lets go', () => {
    const cwd = project(fail);
    run('check-gate.js', ['mark'], { session_id: 's4' }, env);
    const r = run('check-gate.js', ['gate'], { session_id: 's4', cwd }, env);
    assert.strictEqual(r.status, 2);
    assert.match(r.stderr, /boom/);
    assert.strictEqual(run('check-gate.js', ['gate'], { session_id: 's4', cwd, stop_hook_active: true }, env).status, 0);
  });
  await t.test('failure, new edit, still failing: blocks again even with stop_hook_active', () => {
    const cwd = project(fail);
    run('check-gate.js', ['mark'], { session_id: 's5' }, env);
    run('check-gate.js', ['gate'], { session_id: 's5', cwd }, env);
    run('check-gate.js', ['mark'], { session_id: 's5' }, env);
    assert.strictEqual(run('check-gate.js', ['gate'], { session_id: 's5', cwd, stop_hook_active: true }, env).status, 2);
  });
  await t.test('a check that never ends is killed at the time limit and the stop goes through', () => {
    const cwd = project('node -e "setInterval(() => {}, 1000)"');
    run('check-gate.js', ['mark'], { session_id: 's6' }, env);
    const started = Date.now();
    const r = run('check-gate.js', ['gate'], { session_id: 's6', cwd }, { ...env, TOOLKIT_CHECK_TIMEOUT_MS: '1500' });
    assert.strictEqual(r.status, 0);
    assert.ok(Date.now() - started < 15000, `levou ${Date.now() - started} ms`);
    assert.match(JSON.parse(r.stdout).systemMessage, /interrompido/);
    assert.ok(!fs.existsSync(path.join(data, 'toolkit-dirty-s6')));
  });
  await t.test('gate.log records each decision per session', () => {
    const log = fs.readFileSync(path.join(data, 'gate.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    const of = (s) => log.filter((e) => e.session === s).map((e) => e.result);
    assert.deepStrictEqual([of('s1'), of('s2'), of('s3'), of('s4'), of('s5'), of('s6')], [[], [], ['pass'], ['fail', 'giveup'], ['fail', 'fail'], ['timeout']]);
  });
  await t.test('a check the user never approved does not run, and editing an approved one revokes it', () => {
    const cwd = project(fail, false);
    run('check-gate.js', ['mark'], { session_id: 's7' }, env);
    const r = run('check-gate.js', ['gate'], { session_id: 's7', cwd }, env);
    assert.strictEqual(r.status, 0);
    assert.match(JSON.parse(r.stdout).systemMessage, /não foi aprovado[\s\S]*claude-toolkit trust/);
    assert.ok(!fs.existsSync(path.join(data, 'toolkit-dirty-s7')), 'the warning shows once per edit, not on every stop');

    trust(cwd, pass); // approved a different command than the one in toolkit.json
    run('check-gate.js', ['mark'], { session_id: 's7' }, env);
    assert.strictEqual(run('check-gate.js', ['gate'], { session_id: 's7', cwd }, env).status, 0);
    trust(cwd, fail);
    run('check-gate.js', ['mark'], { session_id: 's7' }, env);
    assert.strictEqual(run('check-gate.js', ['gate'], { session_id: 's7', cwd }, env).status, 2);
    // Same folder by another spelling (Windows 8.3 short name in %TEMP%, a symlink): still the approved check.
    assert.ok(require('./trust.js').isTrusted(fs.realpathSync.native(cwd), fail));
  });
  await t.test('editing only docs or OpenSpec files does not mark the session', () => {
    for (const file_path of ['/p/README.md', 'C:\\p\\notas.txt', 'C:\\p\\openspec\\changes\\x\\tasks.json']) {
      run('check-gate.js', ['mark'], { session_id: 's8', tool_input: { file_path } }, env);
    }
    assert.ok(!fs.existsSync(path.join(data, 'toolkit-dirty-s8')));
    run('check-gate.js', ['mark'], { session_id: 's8', tool_input: { file_path: '/p/src/app.ts' } }, env);
    assert.ok(fs.existsSync(path.join(data, 'toolkit-dirty-s8')));
  });
  // The hooks of one session, as Claude Code calls them: turn = user prompt, shell = Claude ran a shell command.
  const hooksOf = (id, cwd) => ({
    turn: () => run('check-gate.js', ['turn'], { session_id: id, cwd }, env),
    shell: () => run('check-gate.js', ['shell'], { session_id: id }, env),
    gate: (extra = {}) => run('check-gate.js', ['gate'], { session_id: id, cwd, ...extra }, env),
  });
  await t.test('edits through the shell (no Edit/Write) are caught by the git snapshot', () => {
    const cwd = gitProject(fail);
    const h = hooksOf('s9', cwd);
    assert.strictEqual(h.turn().status, 0);
    h.shell();
    assert.strictEqual(h.gate().status, 0, 'a shell command that changed nothing');

    fs.writeFileSync(path.join(cwd, 'README.md'), 'só documentação');
    h.shell();
    assert.strictEqual(h.gate().status, 0, 'docs written by the shell do not count');

    fs.writeFileSync(path.join(cwd, 'app.js'), 'module.exports = 2; // sed -i'); // tracked file changed, like sed -i
    h.shell();
    const r = h.gate();
    assert.strictEqual(r.status, 2);
    assert.match(r.stderr, /boom/);
    assert.strictEqual(h.gate({ stop_hook_active: true }).status, 0, 'gives up when nothing changed since the failure');

    fs.writeFileSync(path.join(cwd, 'novo.js'), 'x'); // new untracked file, like cat > novo.js
    h.shell();
    assert.strictEqual(h.gate({ stop_hook_active: true }).status, 2, 'a new shell edit after the failure runs it again');
  });
  await t.test('what the user changes (IDE, pull, branch switch) is not taken for an edit by Claude', () => {
    const cwd = gitProject(fail);
    const h = hooksOf('s11', cwd);
    h.turn();
    fs.writeFileSync(path.join(cwd, 'app.js'), 'module.exports = 4; // meio do caminho');
    assert.strictEqual(h.gate().status, 0, 'user edit during a turn in which Claude ran no shell command');

    fs.writeFileSync(path.join(cwd, 'app.js'), 'module.exports = 5; // ainda quebrado');
    h.turn(); // next prompt: the user's change goes into the snapshot
    h.shell(); // Claude only reads (git status, cat...)
    assert.strictEqual(h.gate().status, 0, 'user edit before the prompt, read-only shell command');
  });
  await t.test('files the check itself writes do not count as an edit', () => {
    const cwd = gitProject('node -e "require(\'fs\').writeFileSync(\'build.out\', String(Date.now()))"');
    const h = hooksOf('s10', cwd);
    h.turn();
    fs.writeFileSync(path.join(cwd, 'app.js'), 'module.exports = 3;');
    h.shell();
    assert.strictEqual(h.gate().status, 0);
    assert.ok(fs.existsSync(path.join(cwd, 'build.out')), 'the check ran');
    h.shell();
    h.gate();
    const runs = fs.readFileSync(path.join(data, 'gate.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((e) => e.session === 's10');
    assert.deepStrictEqual(runs.map((e) => e.result), ['pass'], 'no edit since: the check did not run again');
  });
});

test('secret-guard', () => {
  const n = ['DB_CONN', 'ADO_PAT_DEFAULTCOLLECTION'];
  for (const cmd of ['echo $DB_CONN', 'echo "${DB_CONN}"', 'Write-Output $env:DB_CONN', '$env:ADO_PAT_DEFAULTCOLLECTION',
    'printenv', 'env', 'env | grep DB', 'Get-ChildItem env:', 'cat ~/.claude-toolkit/secrets.env', 'printf "%s" $DB_CONN',
    'security find-generic-password -s claude-toolkit -a ado-x -w', 'secret-tool lookup service claude-toolkit account ado-x',
    'Get-Content C:/Users/a/creds/ado-x.dpapi | ConvertTo-SecureString',
    "[Environment]::GetEnvironmentVariable('DB_CONN')", "Write-Output [Environment]::GetEnvironmentVariable('DB_CONN')",
    "$x = 1; [Environment]::GetEnvironmentVariable(\"DB_CONN\", 'User')", '[Environment]::GetEnvironmentVariables()',
    'npx github:AlfredoNeeto/claude-toolkit trust', 'npx -y github:AlfredoNeeto/claude-toolkit#v1.1.0 trust']) {
    assert.ok(verdict(cmd, n), `should block: ${cmd}`);
  }
  for (const cmd of ['curl -H "Authorization: Bearer $DB_CONN" https://x', 'sqlcmd -S "$DB_CONN" -Q "select 1"',
    'echo ok', 'dotnet test', 'env FOO=1 npm test', 'git status', 'npx github:AlfredoNeeto/claude-toolkit stats',
    // checks the variable without showing it: the 5 blocks measured in bench/ were this, each costing a turn
    "$t = [Environment]::GetEnvironmentVariable('DB_CONN'); \"definida: $([bool]$t) (tamanho: $($t.Length))\"",
    "[Environment]::GetEnvironmentVariable('PATH')"]) {
    assert.strictEqual(verdict(cmd, n), null, `should allow: ${cmd}`);
  }
});

test('secret-guard via node -e like hooks.json', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-home-'));
  fs.mkdirSync(path.join(home, '.claude-toolkit'));
  fs.writeFileSync(path.join(home, '.claude-toolkit', 'secrets.env'), 'API_KEY=abc\n');
  const r = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(__dirname, 'secret-guard.js'))})`], {
    input: JSON.stringify({ tool_input: { command: 'echo $API_KEY' } }), encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
  assert.strictEqual(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'deny');
});

test('secrets: writes plain NAME=value lines and only names to context', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-home-'));
  fs.mkdirSync(path.join(home, '.claude-toolkit'));
  fs.writeFileSync(path.join(home, '.claude-toolkit', 'secrets.env'), 'API_KEY=abc123\nDB_CONN=Server=x;Pwd=y z\n');
  const envFile = path.join(home, 'envfile');
  const r = run('secrets.js', [], {}, { HOME: home, USERPROFILE: home, CLAUDE_ENV_FILE: envFile });
  const lines = fs.readFileSync(envFile, 'utf8').trim().split('\n');
  assert.deepStrictEqual(lines, ['API_KEY=abc123', "DB_CONN='Server=x;Pwd=y z'"]);
  const ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /API_KEY, DB_CONN/);
  assert.doesNotMatch(ctx, /abc123/);
});
