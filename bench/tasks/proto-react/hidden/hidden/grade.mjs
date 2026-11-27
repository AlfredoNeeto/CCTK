// Runs the hidden Vitest tests and prints them as TAP lines (# pass / # fail / not ok N - name), which bench/run.mjs reads.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const out = 'hidden-result.json';
fs.rmSync(out, { force: true });
spawnSync('npx', ['vitest', 'run', 'hidden', '--reporter=json', `--outputFile=${out}`], { shell: true, stdio: 'inherit' });
let tests = [];
try {
  tests = JSON.parse(fs.readFileSync(out, 'utf8')).testResults.flatMap((f) => f.assertionResults);
} catch { /* the suite did not even load: everything failed */ }
tests.forEach((t, i) => console.log(`${t.status === 'passed' ? 'ok' : 'not ok'} ${i + 1} - ${t.title}`));
const pass = tests.filter((t) => t.status === 'passed').length;
const total = Math.max(tests.length, 7); // 7 hidden tests: a suite that failed to load counts as 7 failures
console.log(`# pass ${pass}\n# fail ${total - pass}`);
process.exit(pass === total ? 0 : 1);
