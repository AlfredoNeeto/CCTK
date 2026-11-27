// Partes do render.mjs do /cctk:prototipo que não precisam de navegador.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { md2html, zip, unico, arquivosDoZip, zoom, medidas, anotacoes } from '../plugins/cctk/skills/prototipo/scripts/render.mjs';

test('md2html: tabela, lista, imagem, código, comentário e escape', () => {
  const h = md2html([
    '<!-- some -->', '# Título', '', '| A | B |', '|---|---|', '| `x` | a \\| b |', '',
    '- um **forte**', '- dois', '', '![10.1 – Tela](prints/t.png)', '', '```mermaid', 'flowchart LR', '```', '', 'texto <b> e \\(1\\)',
  ].join('\n'));
  assert.ok(!h.includes('some'));
  assert.match(h, /<h1>Título<\/h1>/);
  assert.match(h, /<td><code>x<\/code><\/td><td>a \| b<\/td>/);
  assert.match(h, /<ul><li>um <strong>forte<\/strong><\/li><li>dois<\/li><\/ul>/);
  assert.match(h, /<figure><img src="prints\/t.png" alt="10.1 – Tela"><figcaption>/);
  assert.match(h, /<pre class="mermaid">flowchart LR<\/pre>/);
  assert.match(h, /texto &lt;b&gt; e \(1\)/);
});

test('zip: abre e devolve o conteúdo original', () => {
  const data = Buffer.from('olá protótipo'.repeat(50));
  const z = zip([{ name: 'p/a.html', data }]);
  // lê o primeiro arquivo pelo cabeçalho local
  assert.strictEqual(z.readUInt32LE(0), 0x04034b50);
  const n = z.readUInt16LE(26), size = z.readUInt32LE(18);
  assert.strictEqual(z.subarray(30, 30 + n).toString(), 'p/a.html');
  assert.deepStrictEqual(zlib.inflateRawSync(z.subarray(30 + n, 30 + n + size)), data);
  assert.strictEqual(z.readUInt32LE(z.length - 22), 0x06054b50);
});

test('zip e HTML único: arquivos certos e links trocados por âncoras', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proto-'));
  fs.writeFileSync(path.join(dir, 'estilo.css'), '.x{color:red}');
  fs.writeFileSync(path.join(dir, 'login.html'), '<html><head><title>T</title><link rel="stylesheet" href="estilo.css"></head><body class="entrada"><a href="painel.html">ir</a><form action="painel.html"></form></body></html>');
  fs.writeFileSync(path.join(dir, 'painel.html'), '<html><body><a href="login.html#x">sair</a><a href="https://e.com/a.html">fora</a></body></html>');
  fs.writeFileSync(path.join(dir, 'notas.md'), 'interno');
  fs.writeFileSync(path.join(dir, 'anotacoes.json'), '{"login.html":["#a","#b"],"painel.html":[".x"],"login.html#m":["#m"]}');
  assert.deepStrictEqual(anotacoes(dir), { 'login.html': [{ n: 1, sel: '#a' }, { n: 2, sel: '#b' }], 'painel.html': [{ n: 1, sel: '.x' }], 'login.html#m': [{ n: 3, sel: '#m' }] });
  fs.mkdirSync(path.join(dir, 'prints'));
  fs.writeFileSync(path.join(dir, 'prints', 'a.png'), 'x');
  const nomes = arquivosDoZip(dir).map((f) => f.name.split('/').slice(1).join('/'));
  assert.deepStrictEqual(nomes.sort(), ['LEIA-ME.txt', 'estilo.css', 'login.html', 'painel.html']);
  const u = unico(dir);
  assert.match(u, /\.x\{color:red\}/);
  assert.match(u, /<section class="pagina" data-classe="entrada" id="p-login"><a href="#p-painel">/);
  assert.match(u, /href="#p-login">sair/);
  assert.match(u, /<form action="#p-painel">/);
  assert.match(u, /href="https:\/\/e.com\/a.html"/);
  assert.ok(u.indexOf('p-login') < u.indexOf('p-painel'));
});

test('medir: tamanho de PNG e JPEG e zoom de quem tirou o print', () => {
  const png = Buffer.alloc(24); png.writeUInt32BE(0x89504e47, 0); png.writeUInt32BE(2560, 16); png.writeUInt32BE(1600, 20);
  assert.deepStrictEqual(medidas(png), { w: 2560, h: 1600 });
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0x09, 0xe4, 0x04, 0x92, 3, 0, 0, 0]);
  assert.deepStrictEqual(medidas(jpg), { w: 1170, h: 2532 });
  assert.strictEqual(medidas(Buffer.from('nada de imagem aqui')), null);
  const largura = ([w, h]) => Math.round(w / zoom(w, h));
  assert.deepStrictEqual([[2560, 1600], [1440, 4000], [1920, 1080], [1170, 2532], [1080, 2400], [390, 844]].map(largura), [1280, 1440, 1920, 390, 360, 390]);
});
