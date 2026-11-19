// PreToolUse on Bash|PowerShell: denies commands that would print a secret or touch the vault.
// Catches accidents, not a determined attacker: code Claude writes can still read its own environment.
const fs = require('fs');
const path = require('path');
const { secretNames } = require(path.join(__dirname, 'vault.js'));

function verdict(cmd, names) {
  if (/\.claude-toolkit/i.test(cmd)) return 'acessa o cofre de variáveis (~/.claude-toolkit)';
  if (/claude-toolkit\S*\s+trust\b/i.test(cmd)) return 'aprova o check do projeto, o que só você pode fazer, num terminal';
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

// require.main is undefined when hooks.json loads this via `node -e`; tests require() it instead.
if (!require.main || require.main === module) {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const reason = verdict(String(input.tool_input?.command || ''), secretNames());
  if (reason) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Bloqueado pelo toolkit: o comando ${reason}. Use a variável por referência sem exibir o valor.`,
      },
    }));
  }
}

module.exports = { verdict };
