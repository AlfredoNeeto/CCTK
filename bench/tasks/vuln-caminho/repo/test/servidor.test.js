import test from 'node:test';
import assert from 'node:assert/strict';
import { servidor } from '../src/servidor.js';

test('GET /fotos/logo.txt devolve a foto', async () => {
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  try {
    const r = await fetch(`http://127.0.0.1:${servidor.address().port}/fotos/logo.txt`);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /logo da empresa/);
  } finally { servidor.close(); }
});
