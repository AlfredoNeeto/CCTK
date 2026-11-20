// Launches the Azure DevOps MCP for one collection with the PAT read from the OS credential store.
// The PAT exists only in this process tree, never in the shell Claude uses.
// Usage (written into ~/.claude.json by the installer): node ado-mcp.js <collection-url> <credential-name>
const path = require('path');
const { spawn } = require('child_process');
const { getCred } = require(path.join(__dirname, 'creds.js'));

const ADO_MCP = '@tiberriver256/mcp-server-azure-devops@0.1.54';
const [url, name] = process.argv.slice(2);
const pat = url && name && getCred(name);
if (!pat) {
  process.stderr.write(`PAT "${name}" não encontrado no cofre do sistema. Rode: cctk ado add ${url || '<url>'}\n`);
  process.exit(1);
}

const win = process.platform === 'win32';
const child = spawn(win ? 'npx.cmd' : 'npx', ['-y', ADO_MCP], {
  stdio: 'inherit',
  shell: win, // .cmd files can't be spawned without a shell on Windows
  env: { ...process.env, AZURE_DEVOPS_ORG_URL: url, AZURE_DEVOPS_AUTH_METHOD: 'pat', AZURE_DEVOPS_PAT: pat },
});
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
