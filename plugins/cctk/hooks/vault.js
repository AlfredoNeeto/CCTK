// The variable vault: values live encrypted in the OS credential store (one entry, read in a single call), the
// names in ~/.cctk/secrets.names, so the guard can match them on every command without decrypting anything.
// Shared by the hooks and the CLI.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { setCred, getCred } = require(path.join(__dirname, 'creds.js'));

const CRED = 'vault';
const dir = () => path.join(os.homedir(), '.cctk');
const namesFile = () => path.join(dir(), 'secrets.names');
const legacyFile = () => path.join(dir(), 'secrets.env'); // plain NAME=value, up to 1.2.0

const listNames = () => { try { return fs.readFileSync(namesFile(), 'utf8').split(/\r?\n/).filter(Boolean); } catch { return []; } };

// For writes: a store that can't be read must stop the change, or saving one variable would drop the others.
function loadVault() {
  if (!listNames().length) return {}; // no PowerShell/Keychain call for an empty vault
  const raw = getCred(CRED);
  if (raw == null) throw new Error('não consegui ler o cofre do sistema');
  return JSON.parse(raw);
}

// For the session hook: fail-open, an unreadable store means no variables, never a broken session.
const readVault = () => { try { return loadVault(); } catch { return {}; } };

function writeVault(vars) {
  fs.mkdirSync(dir(), { recursive: true });
  setCred(CRED, JSON.stringify(vars));
  fs.writeFileSync(namesFile(), Object.keys(vars).map((n) => `${n}\n`).join(''), { mode: 0o600 });
}

// Moves a 1.2.0 secrets.env into the store and deletes it. The plain file goes only after the store took the values.
function migrateVault() {
  if (!fs.existsSync(legacyFile())) return;
  const vars = loadVault();
  for (const line of fs.readFileSync(legacyFile(), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !(m[1] in vars)) vars[m[1]] = m[2];
  }
  writeVault(vars);
  fs.rmSync(legacyFile());
}

// Names the guard protects: everything in the vault plus Azure DevOps PATs a user set as env vars by hand
// (the installer keeps PATs in the OS credential store, never in the environment).
function secretNames() {
  const names = listNames();
  for (const k of Object.keys(process.env)) if (/^(ADO_PAT_|AZURE_DEVOPS_PAT$)/i.test(k)) names.push(k);
  return [...new Set(names)];
}

module.exports = { loadVault, readVault, writeVault, migrateVault, listNames, secretNames };
