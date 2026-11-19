// Shared by the hooks: where the vault lives and how to read it.
const fs = require('fs');
const os = require('os');
const path = require('path');

const vaultFile = () => path.join(os.homedir(), '.claude-toolkit', 'secrets.env');

function readVault(file = vaultFile()) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

// Names the guard protects: everything in the vault plus Azure DevOps PATs a user set as env vars by hand
// (the installer keeps PATs in the OS credential store, never in the environment).
function secretNames() {
  const names = Object.keys(readVault());
  for (const k of Object.keys(process.env)) if (/^(ADO_PAT_|AZURE_DEVOPS_PAT$)/i.test(k)) names.push(k);
  return [...new Set(names)];
}

module.exports = { vaultFile, readVault, secretNames };
