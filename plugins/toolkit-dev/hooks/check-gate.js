// PostToolUse (arg "mark"): records that this session edited files.
// Stop (arg "gate"): if there were edits, runs the project's check from .claude/toolkit.json.
// Exit 2 + stderr blocks the stop so Claude fixes the failure; the edit marker survives until the check passes.
// A check over the time limit (a slow suite, a watch mode that never ends) is killed with its whole process tree
// and the stop goes through with a warning: the gate must never hang a session.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { isTrusted } = require(path.join(__dirname, 'trust.js'));

const LIMIT_MS = Number(process.env.TOOLKIT_CHECK_TIMEOUT_MS) || 180000;

const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
const dataDir = process.env.CLAUDE_PLUGIN_DATA || os.tmpdir();
const marker = path.join(dataDir, `toolkit-dirty-${input.session_id || 'nosession'}`);
const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
// One line per gate decision, read by `claude-toolkit stats` (does the gate catch failures that then get fixed?).
const log = (result) => {
  try {
    fs.appendFileSync(path.join(dataDir, 'gate.log'), JSON.stringify({ ts: new Date().toISOString(), session: input.session_id, cwd, result }) + '\n');
  } catch { /* the log must never break the gate */ }
};

if (process.argv.includes('mark')) {
  // Docs and OpenSpec artifacts can't break the build: writing a proposal shouldn't cost a full check.
  const file = String(input.tool_input?.file_path || input.tool_input?.notebook_path || '');
  if (/\.(md|mdx|txt)$/i.test(file) || /(^|[\\/])openspec[\\/]/i.test(file)) process.exit(0);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(marker, 'dirty');
  process.exit(0);
}

if (!fs.existsSync(marker)) process.exit(0); // no edits this session: nothing to check

let check;
try {
  check = JSON.parse(fs.readFileSync(path.join(cwd, '.claude', 'toolkit.json'), 'utf8')).check;
} catch {
  process.exit(0); // project has no check configured
}
if (!check) process.exit(0);

// The command comes from the repository: run it only once the user approved it for this folder.
if (!isTrusted(cwd, check)) {
  fs.rmSync(marker, { force: true });
  log('untrusted');
  process.stdout.write(JSON.stringify({
    systemMessage: `O check deste projeto ainda não foi aprovado e não rodou: ${check}\n` +
      'Se o comando for seguro, aprove num terminal, na pasta do projeto: npx github:AlfredoNeeto/claude-toolkit trust',
  }));
  process.exit(0);
}

// Already blocked once and Claude stopped again without editing: don't loop on a failure it can't fix.
if (input.stop_hook_active && fs.readFileSync(marker, 'utf8') === 'failed') {
  fs.rmSync(marker, { force: true });
  log('giveup');
  process.exit(0);
}

// spawnSync's timeout only kills the shell; on Windows its children keep the pipes open and the call never returns.
function killTree(pid) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true });
  else try { process.kill(-pid, 'SIGKILL'); } catch { /* already gone */ }
}

function runCheck() {
  return new Promise((resolve) => {
    const child = spawn(check, { cwd, shell: true, windowsHide: true, detached: process.platform !== 'win32' });
    let out = '';
    const keep = (d) => { out = (out + d).slice(-64 * 1024); };
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; killTree(child.pid); }, LIMIT_MS);
    child.on('error', (error) => { clearTimeout(timer); resolve({ status: 1, out, error }); });
    child.on('close', (status) => { clearTimeout(timer); resolve({ status, out, timedOut }); });
  });
}

runCheck().then((r) => {
  if (r.timedOut) {
    fs.rmSync(marker, { force: true });
    log('timeout');
    process.stdout.write(JSON.stringify({
      systemMessage: `O check do projeto passou de ${Math.round(LIMIT_MS / 60000)} min e foi interrompido (${check}). ` +
        'Troque por uma versão mais rápida em .claude/toolkit.json (por exemplo, só build e typecheck).',
    }));
    process.exit(0);
  }
  if (r.status === 0) {
    fs.rmSync(marker, { force: true });
    log('pass');
    process.exit(0);
  }
  fs.writeFileSync(marker, 'failed');
  log('fail');
  const tail = r.out.trim().split(/\r?\n/).slice(-40).join('\n');
  process.stderr.write(
    `O check do projeto falhou (${check}). Corrija antes de encerrar.\n` +
    (r.error ? `Erro ao executar: ${r.error.message}\n` : '') +
    `Últimas linhas:\n${tail}\n`
  );
  process.exit(2);
});
