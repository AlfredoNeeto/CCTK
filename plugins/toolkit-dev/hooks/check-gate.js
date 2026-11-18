// PostToolUse (arg "mark"): records that this session edited files.
// Stop (arg "gate"): if there were edits, runs the project's check from .claude/toolkit.json.
// Exit 2 + stderr blocks the stop so Claude fixes the failure; the edit marker survives until the check passes.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
const dataDir = process.env.CLAUDE_PLUGIN_DATA || os.tmpdir();
const marker = path.join(dataDir, `toolkit-dirty-${input.session_id || 'nosession'}`);
const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

if (process.argv.includes('mark')) {
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

// Already blocked once and Claude stopped again without editing: don't loop on a failure it can't fix.
if (input.stop_hook_active && fs.readFileSync(marker, 'utf8') === 'failed') {
  fs.rmSync(marker, { force: true });
  process.exit(0);
}

const r = spawnSync(check, { cwd, shell: true, encoding: 'utf8', timeout: 540000, maxBuffer: 64 * 1024 * 1024 });
if (r.status === 0) {
  fs.rmSync(marker, { force: true });
  process.exit(0);
}

fs.writeFileSync(marker, 'failed');
const tail = `${r.stdout || ''}\n${r.stderr || ''}`.trim().split(/\r?\n/).slice(-40).join('\n');
process.stderr.write(
  `O check do projeto falhou (${check}). Corrija antes de encerrar.\n` +
  (r.error ? `Erro ao executar: ${r.error.message}\n` : '') +
  `Últimas linhas:\n${tail}\n`
);
process.exit(2);
