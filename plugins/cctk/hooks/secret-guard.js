// PreToolUse on Bash|PowerShell: denies commands that would print a secret or touch the vault, and commits whose
// diff carries a credential. Catches accidents, not a determined attacker: code Claude writes can still read its
// own environment.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { secretNames } = require(path.join(__dirname, 'vault.js'));

function verdict(cmd, names) {
  if (/\.(cctk|claude-toolkit)\b/i.test(cmd)) return 'acessa o cofre de variáveis (~/.cctk)';
  if (/\b(cctk|claude-toolkit)\S*\s+trust\b/i.test(cmd)) return 'aprova o check do projeto, o que só você pode fazer, num terminal';
  // The kit's own modules, loaded by hand: trust.js approves checks, creds.js reads the vault.
  if (/trusted-checks|\b(trust|creds)\.js\b[\s\S]*\b(trust|getCred|setCred)\s*\(|\b(require|import)\b[\s\S]*\b(trust|creds)\.js\b/i.test(cmd)) {
    return 'usa os módulos internos do kit (aprovação de check ou cofre)';
  }
  if (/find-generic-password|secret-tool\s+lookup|ConvertTo-SecureString|SecureStringToBSTR|\.dpapi\b/i.test(cmd)) return 'lê o cofre de credenciais do sistema';
  if (/(^|[|;&]\s*)(printenv|env|set|export\s+-p|declare\s+-x)\s*($|[|;&>])/m.test(cmd)) return 'lista todas as variáveis de ambiente';
  if (/\b(Get-ChildItem|gci|ls|dir|Get-Item)\s+env:/i.test(cmd)) return 'lista variáveis de ambiente';
  if (/\[Environment\]::GetEnvironmentVariables\(/i.test(cmd)) return 'lista variáveis de ambiente';
  for (const n of names) {
    // The singular .NET call is how Claude checks a variable without showing it ($t = ...; [bool]$t): only
    // block it where it prints, like a $NAME reference.
    const ref = `(\\$(\\{${n}\\}|${n}\\b|env:${n}\\b)|\\[Environment\\]::GetEnvironmentVariable\\(\\s*['"]${n}['"][^)]*\\))`;
    if (new RegExp(`\\b(echo|printf|print|Write-Output|Write-Host|cat|type|Out-File|Set-Content|Add-Content|tee)\\b[^|;&]*${ref}`, 'i').test(cmd)) return `imprimiria ${n}`;
    if (new RegExp(`(^|;)\\s*${ref}\\s*(;|$)`, 'im').test(cmd)) return `imprimiria ${n}`;
  }
  return null;
}

// Credentials that should never reach a commit. Placeholders like Password=${DB_PASS} or <senha> don't match.
const LEAKS = [
  ['chave AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['token do GitHub', /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/],
  ['chave da Anthropic/OpenAI', /\bsk-(ant|proj)-[A-Za-z0-9_-]{20,}/],
  ['token do Slack', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['chave privada', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['senha em connection string', /\b(password|pwd)\s*=\s*(?![$%{<\[(]|\*{3})[^;'"\s]{4,}/i],
  ['PAT do Azure DevOps', /\b(pat|token)\b.{0,40}\b([a-z2-7]{52}|[A-Za-z0-9]{84})\b/i],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
];

// Added lines of a unified diff (-U0) as { file, line, kind }; never the value itself.
function scanDiff(diff) {
  const found = [];
  let file = '', line = 0;
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ')) { file = l.slice(4).replace(/^b\//, ''); continue; }
    const h = l.match(/^@@ -\S+ \+(\d+)/);
    if (h) { line = Number(h[1]); continue; }
    if (!l.startsWith('+')) continue;
    const hit = LEAKS.find(([, re]) => re.test(l));
    if (hit) found.push({ file, line, kind: hit[0] });
    line++;
  }
  return found;
}

// `git commit` (with -a, the tracked changes too): what would go into the commit. Fail-open: any git error or the
// 3 s limit lets the commit through.
function commitLeaks(cmd, cwd) {
  if (!/\bgit\b[^|;&]*\bcommit\b/.test(cmd)) return [];
  const all = /\bcommit\b[^|;&]*\s(-[A-Za-z]*a[A-Za-z]*|--all)\b/.test(cmd);
  const r = spawnSync('git', ['diff', all ? 'HEAD' : '--cached', '-U0', '--no-color', '--no-ext-diff'],
    { cwd, encoding: 'utf8', timeout: 3000, windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  return r.status === 0 ? scanDiff(r.stdout) : [];
}

// require.main is undefined when hooks.json loads this via `node -e`; tests require() it instead.
if (!require.main || require.main === module) {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const cmd = String(input.tool_input?.command || '');
  let reason = verdict(cmd, secretNames());
  if (reason) reason = `Bloqueado pelo toolkit: o comando ${reason}. Use a variável por referência sem exibir o valor.`;
  else {
    const leaks = commitLeaks(cmd, input.cwd || process.cwd());
    if (leaks.length) {
      reason = `Bloqueado pelo toolkit: o commit leva credenciais (${leaks.slice(0, 10).map((f) => `${f.file}:${f.line} ${f.kind}`).join('; ')}). ` +
        'Tire o valor do código (use variável de ambiente ou o cofre: cctk secret set) e refaça o stage. ' +
        'Se for um valor falso de teste, peça ao usuário para fazer o commit ele mesmo, num terminal.';
    }
  }
  if (reason) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
    }));
  }
}

module.exports = { verdict, scanDiff };
