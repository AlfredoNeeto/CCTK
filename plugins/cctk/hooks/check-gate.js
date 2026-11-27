// UserPromptSubmit (arg "turn"): snapshot of the git working tree at the start of each turn, so what the user changed
// in the IDE, a pull or a branch switch before the prompt is never taken for an edit by Claude.
// PostToolUse (arg "mark"): records that this session edited files with Edit/Write.
// PostToolUse on Bash/PowerShell (arg "shell"): records that Claude ran a shell command this turn.
// Stop (arg "gate"): if there were edits (a mark, or a shell command plus a working tree that differs from the
// snapshot), runs the project's check from .claude/cctk.json.
// Exit 2 + stderr blocks the stop so Claude fixes the failure; the edit marker survives until the check passes.
// A check over the time limit (a slow suite, a watch mode that never ends) is killed with its whole process tree
// and the stop goes through with a warning: the gate must never hang a session.
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { isTrusted, readCheck } = require(path.join(__dirname, 'trust.js'));

const LIMIT_MS = Number(process.env.CCTK_CHECK_TIMEOUT_MS) || 180000;
const WEEK = 7 * 86400000;

const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
const dataDir = process.env.CLAUDE_PLUGIN_DATA || os.tmpdir();
const session = input.session_id || 'nosession';
const marker = path.join(dataDir, `toolkit-dirty-${session}`);
const baseFile = path.join(dataDir, `toolkit-base-${session}`);
const shellFlag = path.join(dataDir, `toolkit-shell-${session}`);
const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
// One line per gate decision, read by `cctk stats` (does the gate catch failures that then get fixed?).
const log = (result) => {
  try {
    fs.appendFileSync(path.join(dataDir, 'gate.log'), JSON.stringify({ ts: new Date().toISOString(), session: input.session_id, cwd, result }) + '\n');
  } catch { /* the log must never break the gate */ }
};
// Docs and OpenSpec artifacts can't break the build: writing a proposal shouldn't cost a full check.
const isDoc = (f) => /\.(md|mdx|txt)$/i.test(f) || /(^|[\\/])openspec[\\/]/i.test(f);

if (process.argv.includes('mark')) {
  if (isDoc(String(input.tool_input?.file_path || input.tool_input?.notebook_path || ''))) process.exit(0);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(marker, 'dirty');
  process.exit(0);
}

if (process.argv.includes('shell')) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(shellFlag, '');
  process.exit(0);
}

const check = readCheck(cwd);

// HEAD plus every changed, deleted, staged or untracked file (docs excluded) with its size and mtime, hashed.
// Catches `cat > f`, `sed -i`, Set-Content... that never go through Edit/Write. null outside git or if git fails;
// each call has a short time limit so the hook stays well inside its own.
function snapshot() {
  const git = (...args) => spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', timeout: 3000, windowsHide: true, maxBuffer: 16 << 20 });
  const head = git('rev-parse', '-q', '--verify', 'HEAD');
  const changed = git('ls-files', '-z', '-m', '-d', '-o', '--exclude-standard');
  const staged = git('diff', '--cached', '--name-only', '--relative', '-z');
  if (changed.status !== 0 || staged.status !== 0) return null;
  const files = [...new Set(`${changed.stdout}\0${staged.stdout}`.split('\0'))].filter((f) => f && !isDoc(f)).sort();
  const state = files.map((f) => {
    try { const s = fs.statSync(path.join(cwd, f)); return `${f}:${s.size}:${s.mtimeMs}`; } catch { return `${f}:deleted`; }
  });
  return crypto.createHash('sha256').update([head.stdout.trim(), ...state].join('\n')).digest('hex');
}
const saveBase = (snap) => {
  try { if (snap) fs.writeFileSync(baseFile, snap); else fs.rmSync(baseFile, { force: true }); } catch { /* fall back to the marker */ }
};

if (process.argv.includes('turn')) {
  fs.rmSync(shellFlag, { force: true });
  if (check) {
    fs.mkdirSync(dataDir, { recursive: true });
    saveBase(snapshot());
  }
  // A few small files per session: drop the ones older than a week.
  try {
    for (const f of fs.readdirSync(dataDir)) {
      const p = path.join(dataDir, f);
      if (/^toolkit-(base|dirty|shell)-/.test(f) && Date.now() - fs.statSync(p).mtimeMs > WEEK) fs.rmSync(p, { force: true });
    }
  } catch { /* housekeeping only */ }
  process.exit(0);
}

if (!check) process.exit(0); // project has no check configured

const state = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8') : null;
let base = null;
try { base = fs.readFileSync(baseFile, 'utf8'); } catch { /* no snapshot: the marker alone decides */ }
// Only when Claude ran a shell command this turn: a tree changed by the user mid-turn alone must not trigger it.
const ranShell = fs.existsSync(shellFlag);
fs.rmSync(shellFlag, { force: true });
const shellEdits = ranShell && base !== null && snapshot() !== base;
if (!state && !shellEdits) process.exit(0); // no edits this turn: nothing to check

// The command comes from the repository: run it only once the user approved it for this folder.
if (!isTrusted(cwd, check)) {
  fs.rmSync(marker, { force: true });
  saveBase(snapshot());
  log('untrusted');
  process.stdout.write(JSON.stringify({
    systemMessage: `O check deste projeto ainda não foi aprovado e não rodou: ${check}\n` +
      'Se o comando for seguro, aprove num terminal, na pasta do projeto: cctk trust',
  }));
  process.exit(0);
}

// Already blocked once and Claude stopped again without editing: don't loop on a failure it can't fix.
if (input.stop_hook_active && state === 'failed' && !shellEdits) {
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
    // ${CLAUDE_PLUGIN_ROOT} works in a check shared across Windows and Unix (no %VAR% vs $VAR): replaced here.
    const cmd = check.split('${CLAUDE_PLUGIN_ROOT}').join(path.resolve(__dirname, '..'));
    const child = spawn(cmd, { cwd, shell: true, windowsHide: true, detached: process.platform !== 'win32' });
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
  // Snapshot after the check: what the check itself writes (build output) is not an edit by Claude.
  saveBase(snapshot());
  if (r.timedOut) {
    fs.rmSync(marker, { force: true });
    log('timeout');
    process.stdout.write(JSON.stringify({
      systemMessage: `O check do projeto passou de ${Math.round(LIMIT_MS / 60000)} min e foi interrompido (${check}). ` +
        'Troque por uma versão mais rápida em .claude/cctk.json (por exemplo, só build e typecheck).',
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
