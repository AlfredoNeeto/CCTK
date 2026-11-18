// SessionStart: exports the vault to the shell Claude uses (CLAUDE_ENV_FILE) and tells Claude only the names.
const fs = require('fs');
const path = require('path');
const { readVault, secretNames } = require(path.join(__dirname, 'vault.js'));

const vault = readVault();
const names = Object.keys(vault);

// Plain NAME=value lines: the only form Claude Code also copies to PowerShell.
// shortcut: values with spaces/quotes are single-quoted for bash, which PowerShell may skip; upgrade if someone needs those on Windows.
const quote = (v) => (/^[\w@%+=:,./-]*$/.test(v) ? v : `'${v.replace(/'/g, `'\\''`)}'`);
if (process.env.CLAUDE_ENV_FILE && names.length) {
  fs.appendFileSync(process.env.CLAUDE_ENV_FILE, names.map((n) => `${n}=${quote(vault[n])}`).join('\n') + '\n');
}

const all = secretNames();
if (!all.length) process.exit(0);
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext:
      `Variáveis de ambiente disponíveis (valores ocultos): ${all.join(', ')}. ` +
      'Use-as por referência ($NOME no bash, $env:NOME no PowerShell). Nunca imprima, registre em log ou grave os valores.',
  },
}));
