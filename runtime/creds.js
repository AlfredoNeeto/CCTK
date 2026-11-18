// OS credential store, no dependencies: DPAPI (Windows), Keychain (macOS), libsecret (Linux).
// Secrets travel via stdin, never argv, so they don't show up in the process list.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SERVICE = 'claude-toolkit';
const credDir = () => path.join(os.homedir(), '.claude-toolkit', 'creds');
const dpapiFile = (name) => path.join(credDir(), `${name}.dpapi`);
const ps = (script, opts) =>
  spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', ...opts });

function assertName(name) {
  if (!/^[A-Za-z0-9_.-]+$/.test(name)) throw new Error(`Nome de credencial inválido: ${name}`);
}

function setCred(name, value) {
  assertName(name);
  if (process.platform === 'win32') {
    fs.mkdirSync(credDir(), { recursive: true });
    const r = ps('$v=[Console]::In.ReadToEnd(); ConvertTo-SecureString $v -AsPlainText -Force | ConvertFrom-SecureString | Set-Content -LiteralPath $env:TK_FILE',
      { input: value, env: { ...process.env, TK_FILE: dpapiFile(name) } });
    if (r.status !== 0) throw new Error(`DPAPI falhou: ${r.stderr}`);
  } else if (process.platform === 'darwin') {
    // `security -i` reads the command from stdin, keeping the value out of argv.
    const r = spawnSync('security', ['-i'], {
      input: `add-generic-password -U -s ${SERVICE} -a ${name} -w "${value.replace(/["\\]/g, '\\$&')}"\n`, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`Keychain falhou: ${r.stderr}`);
  } else {
    const r = spawnSync('secret-tool', ['store', `--label=${SERVICE} ${name}`, 'service', SERVICE, 'account', name], { input: value, encoding: 'utf8' });
    if (r.error || r.status !== 0) throw new Error('libsecret indisponível: instale o pacote libsecret-tools (secret-tool) e rode de novo.');
  }
}

function getCred(name) {
  assertName(name);
  let r;
  if (process.platform === 'win32') {
    if (!fs.existsSync(dpapiFile(name))) return null;
    r = ps('$s=Get-Content -LiteralPath $env:TK_FILE | ConvertTo-SecureString; [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))',
      { env: { ...process.env, TK_FILE: dpapiFile(name) } });
  } else if (process.platform === 'darwin') {
    r = spawnSync('security', ['find-generic-password', '-s', SERVICE, '-a', name, '-w'], { encoding: 'utf8' });
  } else {
    r = spawnSync('secret-tool', ['lookup', 'service', SERVICE, 'account', name], { encoding: 'utf8' });
  }
  return r.status === 0 && r.stdout ? r.stdout.replace(/\r?\n$/, '') : null;
}

module.exports = { setCred, getCred };
