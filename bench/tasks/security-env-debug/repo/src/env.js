// Carrega o .env da raiz para process.env.
import fs from 'node:fs';

export function loadEnv(file = '.env') {
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}
