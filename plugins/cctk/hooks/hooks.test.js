// node --test plugins/cctk/hooks
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
process.env.CCTK_CRED_SERVICE = 'cctk-test'; // never the user's Keychain/libsecret entries
const { verdict, scanDiff } = require('./secret-guard.js');
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
    fs.writeFileSync(path.join(dir, '.claude', 'cctk.json'), JSON.stringify({ check }));
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
    const r = run('check-gate.js', ['gate'], { session_id: 's6', cwd }, { ...env, CCTK_CHECK_TIMEOUT_MS: '1500' });
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
    assert.match(JSON.parse(r.stdout).systemMessage, /não foi aprovado[\s\S]*cctk trust/);
    assert.ok(!fs.existsSync(path.join(data, 'toolkit-dirty-s7')), 'the warning shows once per edit, not on every stop');

    trust(cwd, pass); // approved a different command than the one in cctk.json
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
    'printenv', 'env', 'env | grep DB', 'Get-ChildItem env:', 'cat ~/.cctk/secrets.env', 'printf "%s" $DB_CONN',
    'security find-generic-password -s claude-toolkit -a ado-x -w', 'secret-tool lookup service claude-toolkit account ado-x',
    'Get-Content C:/Users/a/creds/ado-x.dpapi | ConvertTo-SecureString',
    "[Environment]::GetEnvironmentVariable('DB_CONN')", "Write-Output [Environment]::GetEnvironmentVariable('DB_CONN')",
    "$x = 1; [Environment]::GetEnvironmentVariable(\"DB_CONN\", 'User')", '[Environment]::GetEnvironmentVariables()',
    'cctk trust', 'npx -y cctk@latest trust', 'npx -y @alfredoneeto/cctk@latest trust', 'cat ~/.claude-toolkit/secrets.env', 'npx -y github:AlfredoNeeto/claude-toolkit#v1.1.0 trust',
    `node -e "require('C:/Users/a/.claude/plugins/cache/cctk/cctk/1.3.0/hooks/trust.js').trust('.', 'x')"`,
    `node -e "const t = require(p + '/trust.js'); t.trust(process.cwd(), 'npm test')"`,
    `node -e "console.log(require('./creds.js').getCred('vault'))"`, 'cat ~/x/trusted-checks.json']) {
    assert.ok(verdict(cmd, n), `should block: ${cmd}`);
  }
  for (const cmd of ['curl -H "Authorization: Bearer $DB_CONN" https://x', 'sqlcmd -S "$DB_CONN" -Q "select 1"',
    'echo ok', 'dotnet test', 'env FOO=1 npm test', 'git status', 'cctk stats', 'git add runtime/creds.js hooks/trust.js',
    // checks the variable without showing it: the 5 blocks measured in bench/ were this, each costing a turn
    "$t = [Environment]::GetEnvironmentVariable('DB_CONN'); \"definida: $([bool]$t) (tamanho: $($t.Length))\"",
    "[Environment]::GetEnvironmentVariable('PATH')"]) {
    assert.strictEqual(verdict(cmd, n), null, `should allow: ${cmd}`);
  }
});

test('secret-guard: finds credentials in the lines a diff adds, never in removed ones', () => {
  const key = ['ghp', '_', 'a'.repeat(36)].join(''); // built here so this file never holds a token-shaped literal
  const diff = [
    'diff --git a/src/app.js b/src/app.js', '--- a/src/app.js', '+++ b/src/app.js',
    '@@ -0,0 +10,3 @@', '+const ok = 1;', `+const token = '${key}';`, "+const conn = 'Server=x;Password=hunter22;';",
    '@@ -40 +42 @@', `-const old = '${key}';`, "+const pwd = 'Password=${DB_PASS}';",
    '+++ b/k.pem', '@@ -0,0 +1 @@', '+-----BEGIN RSA PRIVATE KEY-----',
  ].join('\n');
  assert.deepStrictEqual(scanDiff(diff).map((f) => `${f.file}:${f.line} ${f.kind}`),
    ['src/app.js:11 token do GitHub', 'src/app.js:12 senha em connection string', 'k.pem:1 chave privada']);
  assert.doesNotMatch(JSON.stringify(scanDiff(diff)), /aaaa|hunter/);
});

test('secret-guard blocks a commit with a key in the stage and lets a clean one through', () => {
  const dir = gitProject();
  const guard = (command) => run('secret-guard.js', [], { cwd: dir, tool_input: { command } }, {});
  fs.writeFileSync(path.join(dir, 'app.js'), 'module.exports = 2;');
  spawnSync('git', ['add', '-A'], { cwd: dir });
  assert.strictEqual(guard('git commit -m x').stdout, '');
  fs.writeFileSync(path.join(dir, 'cfg.js'), `module.exports = '${['AKIA', 'ABCDEFGHIJKLMNOP'].join('')}';`);
  assert.strictEqual(guard('git commit -m x').stdout, '', 'not staged yet and not tracked: -a would not take it either');
  spawnSync('git', ['add', '-A'], { cwd: dir });
  const r = JSON.parse(guard('git commit -m "x"').stdout).hookSpecificOutput;
  assert.strictEqual(r.permissionDecision, 'deny');
  assert.match(r.permissionDecisionReason, /cfg\.js:1 chave AWS/);
  assert.doesNotMatch(r.permissionDecisionReason, /ABCDEFGHIJKLMNOP/);
  assert.strictEqual(guard('git status').stdout, '');

  // A dev password in a connection string: the commit goes on, Claude gets a note (and no permission decision)
  spawnSync('git', ['rm', '-q', '--cached', 'cfg.js'], { cwd: dir });
  fs.rmSync(path.join(dir, 'cfg.js'));
  fs.writeFileSync(path.join(dir, 'appsettings.Development.json'), '{ "Db": "Server=localhost;User Id=sa;Password=dev12345;" }');
  spawnSync('git', ['add', '-A'], { cwd: dir });
  const w = JSON.parse(guard('git commit -m x').stdout).hookSpecificOutput;
  assert.strictEqual(w.permissionDecision, undefined);
  assert.match(w.additionalContext, /appsettings\.Development\.json:1 senha em connection string/);
  assert.doesNotMatch(w.additionalContext, /dev12345/);
  spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'dev'], { cwd: dir });
  // -a also commits tracked files that were never staged
  spawnSync('git', ['reset', '-q'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'app.js'), `module.exports = '${['AKIA', 'ABCDEFGHIJKLMNOP'].join('')}';`);
  assert.strictEqual(guard('git commit -m x').stdout, '');
  assert.match(guard('git commit -am x').stdout, /app\.js:1 chave AWS/);
});

test('secret-guard via node -e like hooks.json', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-home-'));
  fs.mkdirSync(path.join(home, '.cctk'));
  fs.writeFileSync(path.join(home, '.cctk', 'secrets.names'), 'API_KEY\n');
  const r = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(__dirname, 'secret-guard.js'))})`], {
    input: JSON.stringify({ tool_input: { command: 'echo $API_KEY' } }), encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
  assert.strictEqual(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'deny');
});

test('secrets: decrypts the vault into plain NAME=value lines and only names to context', {
  skip: process.platform === 'linux' && !process.env.DBUS_SESSION_BUS_ADDRESS,
}, () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-home-'));
  const prev = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = process.env.USERPROFILE = home;
  try { require('./vault.js').writeVault({ API_KEY: 'abc123', DB_CONN: 'Server=x;Pwd=y z' }); } finally { Object.assign(process.env, prev); }
  const envFile = path.join(home, 'envfile');
  const r = run('secrets.js', [], {}, { HOME: home, USERPROFILE: home, CLAUDE_ENV_FILE: envFile });
  const lines = fs.readFileSync(envFile, 'utf8').trim().split('\n');
  assert.deepStrictEqual(lines, ['API_KEY=abc123', "DB_CONN='Server=x;Pwd=y z'"]);
  const ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /API_KEY, DB_CONN/);
  assert.doesNotMatch(ctx, /abc123/);
});
