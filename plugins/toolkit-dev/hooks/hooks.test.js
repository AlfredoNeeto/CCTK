// node --test plugins/toolkit-dev/hooks
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { verdict } = require('./secret-guard.js');

const run = (script, args, input, env) =>
  spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
    input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, ...env },
  });

function project(check) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-proj-'));
  if (check !== undefined) {
    fs.mkdirSync(path.join(dir, '.claude'));
    fs.writeFileSync(path.join(dir, '.claude', 'toolkit.json'), JSON.stringify({ check }));
  }
  return dir;
}

test('check-gate', async (t) => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-data-'));
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
});

test('secret-guard', () => {
  const n = ['DB_CONN', 'ADO_PAT_DEFAULTCOLLECTION'];
  for (const cmd of ['echo $DB_CONN', 'echo "${DB_CONN}"', 'Write-Output $env:DB_CONN', '$env:ADO_PAT_DEFAULTCOLLECTION',
    'printenv', 'env', 'env | grep DB', 'Get-ChildItem env:', 'cat ~/.claude-toolkit/secrets.env', 'printf "%s" $DB_CONN',
    'security find-generic-password -s claude-toolkit -a ado-x -w', 'secret-tool lookup service claude-toolkit account ado-x',
    'Get-Content C:/Users/a/creds/ado-x.dpapi | ConvertTo-SecureString',
    "[Environment]::GetEnvironmentVariable('DB_CONN')", "Write-Output [Environment]::GetEnvironmentVariable('DB_CONN')",
    "$x = 1; [Environment]::GetEnvironmentVariable(\"DB_CONN\", 'User')", '[Environment]::GetEnvironmentVariables()']) {
    assert.ok(verdict(cmd, n), `should block: ${cmd}`);
  }
  for (const cmd of ['curl -H "Authorization: Bearer $DB_CONN" https://x', 'sqlcmd -S "$DB_CONN" -Q "select 1"',
    'echo ok', 'dotnet test', 'env FOO=1 npm test', 'git status',
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
