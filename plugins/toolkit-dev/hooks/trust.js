// Which project checks the user approved. .claude/toolkit.json comes with the repository, so a cloned repo (or a PR)
// picks the command the Stop hook runs: it only runs after the user approves that exact command for that folder,
// in a terminal (`claude-toolkit trust`). The list lives in ~/.claude-toolkit, which Claude can't edit (deny rules
// and secret-guard). Shared by the hook and the CLI.
// shortcut: approving `npm test` trusts the command, not the package.json script it calls; same as running it by hand.
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const trustFile = () => path.join(os.homedir(), '.claude-toolkit', 'trusted-checks.json');
const key = (dir, check) => {
  // realpath: the same folder can arrive as C:\Users\ALFRED~1\... or via a symlink; the key must not depend on that.
  let d = path.resolve(dir);
  try { d = fs.realpathSync.native(d); } catch { /* folder gone: the plain path still works as a key */ }
  return crypto.createHash('sha256').update(`${process.platform === 'win32' ? d.toLowerCase() : d}\n${check}`).digest('hex');
};
const list = () => { try { return JSON.parse(fs.readFileSync(trustFile(), 'utf8')); } catch { return []; } };

const isTrusted = (dir, check) => list().includes(key(dir, check));

function trust(dir, check) {
  fs.mkdirSync(path.dirname(trustFile()), { recursive: true });
  fs.writeFileSync(trustFile(), JSON.stringify([...new Set([...list(), key(dir, check)])]) + '\n', { mode: 0o600 });
}

module.exports = { isTrusted, trust };
