#!/usr/bin/env node
// Ferramentas do /cctk:prototipo. Usa o Playwright que o cctk já instala (o CLI bloqueia file:, por isso o script).
// Saída curta de propósito: o Claude lê só o resumo, nunca o HTML nem a imagem, salvo quando pede.
//   init <pasta> [--mobile]           copia estilo.css e cria tema.css
//   medir <print>                     tamanho real da tela do print (zoom 200% de tela retina)
//   checar <pasta>                    links quebrados, rolagem horizontal, texto estourando ou sobreposto, erros de console
//   prints <pasta> [--anotar] [tela.html[#estado] ...]   PNG de cada tela em <pasta>/prints/
//   lado <original.png|jpg> <tela.html> <saida.png>     original x protótipo numa imagem só, já reduzida
//   pdf <especificacao.md|html> [saida.pdf]             PDF A4 com número de página
//   unico <pasta> <saida.html>        um HTML só, com CSS e imagens dentro e navegação entre as telas
//   zip <pasta> <saida.zip>           zip para mandar ao cliente (sem prints, notas e rascunhos)
//   codigo <angular|react|flutter> [raiz]   o tema do protótipo aprovado no projeto (CSS global ou ThemeData)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(HERE, '..', 'assets');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = (f) => pathToFileURL(path.resolve(f)).href;
const telas = (dir) => fs.readdirSync(dir).filter((f) => /\.html?$/i.test(f) && !f.startsWith('.') && !/^especificacao/i.test(f)).sort();

// ---------- Markdown -> HTML (o subconjunto que o modelo de especificação usa) ----------
function inline(s) {
  const codes = [];
  s = esc(s).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\\([\\`*_{}\[\]()#+\-.!|>~])/g, '$1');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}
const cells = (l) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim());

export function md2html(md) {
  const L = md.replace(/<!--[\s\S]*?-->/g, '').replace(/\r/g, '').split('\n');
  const out = [];
  for (let i = 0; i < L.length;) {
    const l = L[i];
    let m;
    if (!l.trim()) { i++; continue; }
    if ((m = l.match(/^```\s*(\w*)/))) {
      const buf = [];
      for (i++; i < L.length && !/^```/.test(L[i]); i++) buf.push(L[i]);
      i++;
      out.push(m[1] === 'mermaid' ? `<pre class="mermaid">${esc(buf.join('\n'))}</pre>` : `<pre><code>${esc(buf.join('\n'))}</code></pre>`);
    } else if ((m = l.match(/^(#{1,6})\s+(.*)/))) {
      out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++;
    } else if (/^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(l)) {
      out.push('<hr>'); i++;
    } else if (/^\s*\|/.test(l) && /^\s*\|?\s*:?-{3,}/.test(L[i + 1] || '')) {
      const head = cells(l);
      const rows = [];
      for (i += 2; i < L.length && /^\s*\|/.test(L[i]); i++) rows.push(cells(L[i]));
      out.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${
        rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    } else if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const ol = /^\s*\d+\./.test(l);
      const items = [];
      for (; i < L.length && L[i].trim() && (/^\s*([-*]|\d+\.)\s+/.test(L[i]) || /^\s{2,}/.test(L[i])); i++) {
        if (/^\s*([-*]|\d+\.)\s+/.test(L[i]) && !/^\s{2,}/.test(L[i])) items.push(L[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        else items[items.length - 1] += ' ' + L[i].trim().replace(/^([-*]|\d+\.)\s+/, '· ');
      }
      out.push(`<${ol ? 'ol' : 'ul'}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${ol ? 'ol' : 'ul'}>`);
    } else if (/^>\s?/.test(l)) {
      const buf = [];
      for (; i < L.length && /^>\s?/.test(L[i]); i++) buf.push(L[i].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
    } else if ((m = l.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/))) {
      out.push(`<figure><img src="${esc(m[2])}" alt="${esc(m[1])}">${m[1] ? `<figcaption>${inline(m[1])}</figcaption>` : ''}</figure>`); i++;
    } else {
      const buf = [];
      for (; i < L.length && L[i].trim() && !/^(#{1,6}\s|```|>|\s*\||\s*([-*]|\d+\.)\s+)/.test(L[i]); i++) buf.push(L[i].trim());
      if (!buf.length) buf.push(L[i++].trim());
      out.push(`<p>${inline(buf.join(' '))}</p>`);
    }
  }
  return out.join('\n');
}

const PDF_CSS = `@page{size:A4;margin:16mm 15mm 18mm}
body{font:10pt/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a;margin:0}
h1{font-size:20pt;margin:0 0 8pt;padding-bottom:6pt;border-bottom:2px solid #0f172a}
h2{font-size:14pt;margin:20pt 0 6pt;padding-bottom:3pt;border-bottom:1px solid #cbd5e1}
h3{font-size:11.5pt;margin:14pt 0 4pt}h4{font-size:10.5pt;margin:12pt 0 4pt}
h1,h2,h3,h4{break-after:avoid}p,li{orphans:3;widows:3}p{margin:0 0 6pt}ul,ol{margin:0 0 6pt;padding-left:18pt}
table{width:100%;border-collapse:collapse;margin:4pt 0 10pt;font-size:9pt}tr{break-inside:avoid}
th,td{border:1px solid #cbd5e1;padding:4pt 6pt;text-align:left;vertical-align:top}th{background:#f1f5f9}
code{font:8.5pt Consolas,monospace;background:#f1f5f9;padding:0 3px;border-radius:3px}
pre{font:8.5pt/1.4 Consolas,monospace;background:#f8fafc;border:1px solid #e2e8f0;padding:8pt;white-space:pre-wrap;break-inside:avoid}
pre code{background:none;padding:0}pre.mermaid{background:none;border:0;text-align:center}
figure{margin:6pt 0 10pt;break-inside:avoid;text-align:center}
figure img{max-width:100%;max-height:205mm;border:1px solid #cbd5e1}
figcaption{font-size:8.5pt;color:#64748b;margin-top:3pt}
blockquote{margin:6pt 0;padding:6pt 10pt;border-left:3px solid #94a3b8;background:#f8fafc}
hr{border:0;break-after:page}`;

// ---------- Playwright ----------
let pwCache;
function playwright() {
  if (pwCache) return pwCache;
  let root;
  try { root = execSync('npm root -g', { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
  for (const base of [process.cwd(), root && path.join(root, '@playwright', 'cli'), root].filter(Boolean)) {
    const req = createRequire(path.join(base, 'noop.js'));
    for (const name of ['playwright-core', 'playwright']) { try { return (pwCache = req(name)); } catch {} }
  }
  throw new Error('Playwright não encontrado. Rode: npm install -g @playwright/cli');
}
async function browser() {
  const { chromium } = playwright();
  for (const opts of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) {
    try { return await chromium.launch(opts); } catch {}
  }
  throw new Error('Nenhum Chrome/Edge encontrado. Instale o Chrome ou rode: npx playwright install chromium');
}
async function abrir(page, file, hash = '') {
  await page.goto(url(file) + hash, { waitUntil: 'load', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  if (await page.evaluate(() => document.body.classList.contains('mobile'))) await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.fonts.ready);
}

async function checar(dir) {
  let notas = {};
  let problemas = 0;
  try { notas = anotacoes(dir); } catch (e) { console.log(`anotacoes.json inválido: ${e.message}`); problemas++; }
  for (const k of Object.keys(notas)) {
    if (!fs.existsSync(path.join(dir, k.split('#')[0]))) { console.log(`anotacoes.json: tela não existe: ${k}`); problemas++; }
  }
  const b = await browser();
  try {
    for (const f of telas(dir)) {
      const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
      const erros = [];
      page.on('pageerror', (e) => erros.push(`erro de script: ${e.message}`));
      page.on('console', (m) => m.type() === 'error' && erros.push(`console: ${m.text().slice(0, 120)}`));
      page.on('requestfailed', (r) => erros.push(`não carregou: ${decodeURI(r.url()).split('/').slice(-2).join('/')}`));
      await abrir(page, path.join(dir, f));
      const r = await page.evaluate(() => {
        const out = [];
        const sel = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].map((c) => '.' + c).join('') +
          ` "${(e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)}"`;
        const W = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > W + 1) out.push(`rolagem horizontal: ${document.documentElement.scrollWidth}px numa janela de ${W}px`);
        if (!document.querySelector('link[href*="estilo.css"]')) out.push('não liga o estilo.css');
        const estouro = [...document.querySelectorAll('.btn,.selo,.valor,label,th,.card,.caixa>header,.barra-app,.nav-inferior a,.menu nav a')]
          .filter((e) => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX === 'visible').slice(0, 3);
        for (const e of estouro) out.push(`texto estourando: ${sel(e)}`);
        // Texto sobre texto: compara a caixa de cada trecho visível. Menu fixo/grudado sobre o conteúdo é de propósito.
        const fixo = new Map();
        const preso = (e) => {
          if (!e || e === document.body) return false;
          if (!fixo.has(e)) fixo.set(e, /fixed|sticky/.test(getComputedStyle(e).position) || preso(e.parentElement));
          return fixo.get(e);
        };
        const trechos = [];
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n; (n = tw.nextNode());) {
          const t = n.textContent.trim();
          if (!t || preso(n.parentElement) || getComputedStyle(n.parentElement).visibility === 'hidden') continue;
          const rg = document.createRange();
          rg.selectNodeContents(n);
          for (const b of rg.getClientRects()) if (b.width > 2 && b.height > 2) trechos.push({ b, n, t: t.replace(/\s+/g, ' ').slice(0, 25) });
        }
        const sobre = [];
        for (let i = 0; i < trechos.length && sobre.length < 3; i++) {
          for (let j = i + 1; j < trechos.length; j++) {
            const a = trechos[i], c = trechos[j];
            if (a.n === c.n) continue;
            const x = Math.min(a.b.right, c.b.right) - Math.max(a.b.left, c.b.left);
            const y = Math.min(a.b.bottom, c.b.bottom) - Math.max(a.b.top, c.b.top);
            if (x > 3 && y > 0.35 * Math.min(a.b.height, c.b.height)) { sobre.push(`texto sobreposto: "${a.t}" × "${c.t}"`); break; }
          }
        }
        out.push(...sobre);
        const nums = [...document.querySelectorAll('[data-anotacao]')].map((e) => e.dataset.anotacao);
        const dup = nums.filter((n, i) => nums.indexOf(n) !== i);
        if (dup.length) out.push(`anotação repetida: ${[...new Set(dup)].join(', ')}`);
        const links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))
          .filter((h) => h && !/^(#|https?:|mailto:|tel:|javascript:)/i.test(h));
        return { out, links };
      });
      // Notebook comum e largura da maioria dos prints: o que cabe em 1440 pode vazar aqui.
      await page.setViewportSize({ width: 1280, height: 900 });
      const sw = await page.evaluate(() => !document.body.classList.contains('mobile') && document.documentElement.scrollWidth);
      if (sw > 1281 && !r.out.some((o) => o.startsWith('rolagem horizontal'))) r.out.push(`rolagem horizontal: ${sw}px numa janela de 1280px (cabe em 1440, não em notebook)`);
      for (const [k, itens] of Object.entries(notas)) {
        if (k.split('#')[0] !== f) continue;
        const faltam = await page.evaluate(MARCAR, itens);
        if (faltam.length) r.out.push(`anotação sem alvo em ${k}: ${faltam.join(', ')}`);
      }
      for (const h of new Set(r.links)) {
        if (!fs.existsSync(path.resolve(dir, decodeURI(h.split(/[?#]/)[0])))) r.out.push(`link quebrado: ${h}`);
      }
      const todos = [...r.out, ...new Set(erros)];
      problemas += todos.length;
      console.log(todos.length ? `${f}:\n  - ${todos.join('\n  - ')}` : `${f}: ok`);
      await page.close();
    }
  } finally { await b.close(); }
  if (problemas) process.exitCode = 1;
}

const ANOTAR = () => {
  for (const el of document.querySelectorAll('[data-anotacao]')) {
    const r = el.getBoundingClientRect();
    const b = document.createElement('span');
    b.textContent = el.dataset.anotacao;
    Object.assign(b.style, { position: 'absolute', left: `${Math.max(2, r.left + scrollX - 12)}px`, top: `${Math.max(2, r.top + scrollY - 12)}px`,
      width: '24px', height: '24px', borderRadius: '50%', background: '#ea580c', color: '#fff', font: '700 13px/24px system-ui,sans-serif',
      textAlign: 'center', zIndex: 2147483647, boxShadow: '0 0 0 2px #fff,0 1px 4px rgba(0,0,0,.3)' });
    const caixa = document.createElement('div'); // fora do elemento: overflow do pai não corta o contorno
    Object.assign(caixa.style, { position: 'absolute', left: `${r.left + scrollX - 3}px`, top: `${r.top + scrollY - 3}px`,
      width: `${r.width + 6}px`, height: `${r.height + 6}px`, border: '2px solid rgba(234,88,12,.75)', borderRadius: '4px',
      boxSizing: 'border-box', pointerEvents: 'none', zIndex: 2147483646 });
    document.body.append(caixa, b);
  }
};

// anotacoes.json: { "tela.html": ["seletor do 1", "seletor do 2"], "tela.html#modal": ["seletor do 3"] }.
// A numeração continua entre as chaves da mesma tela, na ordem do arquivo. Evita editar o HTML número a número.
export function anotacoes(dir) {
  const f = path.join(dir, 'anotacoes.json');
  if (!fs.existsSync(f)) return {};
  const json = JSON.parse(fs.readFileSync(f, 'utf8'));
  const prox = {};
  const out = {};
  for (const [chave, sels] of Object.entries(json)) {
    const tela = chave.split('#')[0];
    prox[tela] ||= 1;
    out[chave] = sels.map((sel) => ({ n: prox[tela]++, sel }));
  }
  return out;
}
const MARCAR = (itens) => {
  const faltam = [];
  if (itens.length) document.querySelectorAll('[data-anotacao]').forEach((e) => e.removeAttribute('data-anotacao'));
  for (const { n, sel } of itens) {
    let el = null;
    try { el = document.querySelector(sel); } catch {}
    if (el) el.dataset.anotacao = n; else faltam.push(`${n} (${sel})`);
  }
  return faltam;
};

async function prints(dir, anotar, lista) {
  const alvo = lista.length ? lista : telas(dir);
  const notas = anotar ? anotacoes(dir) : {};
  fs.mkdirSync(path.join(dir, 'prints'), { recursive: true });
  const b = await browser();
  try {
    for (const t of alvo) {
      const [f, h] = t.split('#');
      const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      await abrir(page, path.join(dir, f), h ? '#' + h : '');
      if (anotar) {
        const faltam = await page.evaluate(MARCAR, notas[t] || []);
        if (faltam.length) console.log(`aviso ${t}: anotação sem alvo ${faltam.join(', ')}`);
        await page.evaluate(ANOTAR);
      }
      const nome = f.replace(/\.html?$/i, '') + (h ? `--${h}` : '') + '.png';
      await page.screenshot({ path: path.join(dir, 'prints', nome), fullPage: !h });
      console.log(`ok prints/${nome}`);
      await page.close();
    }
  } finally { await b.close(); }
}

async function lado(original, tela, saida) {
  const b = await browser();
  const tmp = path.join(path.dirname(path.resolve(saida)), `.lado-${process.pid}`);
  try {
    const page = await b.newPage();
    await page.goto(url(original));
    let { w, h } = await page.evaluate(() => ({ w: document.images[0].naturalWidth, h: document.images[0].naturalHeight }));
    const dpr = zoom(w, h);
    await page.setViewportSize({ width: Math.round(w / dpr), height: Math.round(h / dpr) });
    const p2 = await b.newPage({ viewport: { width: Math.round(w / dpr), height: Math.round(h / dpr) }, deviceScaleFactor: dpr });
    await abrir(p2, tela);
    const largo = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await p2.screenshot({ path: tmp + '.png' });
    const W = 1560; // cabe no limite de imagem do Claude sem ser reduzida de novo
    fs.writeFileSync(tmp + '.html', `<!doctype html><meta charset="utf-8"><style>body{margin:0;font:600 14px system-ui;background:#fff}
      .l{display:flex;gap:8px;width:${W}px}.l div{flex:1}.l p{margin:4px 0;background:#0f172a;color:#fff;padding:4px 8px}img{width:100%;display:block;outline:1px solid #cbd5e1}</style>
      <div class="l"><div><p>ORIGINAL</p><img src="${url(original)}"></div><div><p>PROTÓTIPO</p><img src="${url(tmp + '.png')}"></div></div>`);
    await page.setViewportSize({ width: W, height: 400 });
    await page.goto(url(tmp + '.html'));
    await page.screenshot({ path: saida, fullPage: true });
    if (largo > 1) console.log(`atenção: o protótipo passa ${largo}px da largura do print; a imagem corta o que está à direita. Faça a linha caber.`);
    console.log(`ok ${saida} (abra esta imagem para comparar)`);
  } finally {
    await b.close();
    for (const e of ['.png', '.html']) fs.rmSync(tmp + e, { force: true });
  }
}

async function pdf(entrada, saida) {
  saida ||= entrada.replace(/\.(md|html?)$/i, '') + '.pdf';
  const dir = path.dirname(path.resolve(entrada));
  const src = fs.readFileSync(entrada, 'utf8');
  const corpo = /\.md$/i.test(entrada) ? md2html(src) : src;
  const titulo = (corpo.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1] || path.basename(entrada)).replace(/<[^>]+>/g, '');
  const tmp = path.join(dir, `.pdf-${process.pid}.html`);
  fs.writeFileSync(tmp, /<html/i.test(corpo) ? corpo
    : `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${esc(titulo)}</title><style>${PDF_CSS}</style><body>${corpo}</body></html>`);
  const b = await browser();
  try {
    const page = await b.newPage();
    await page.goto(url(tmp), { waitUntil: 'load', timeout: 30000 });
    if (await page.$('pre.mermaid')) { // diagrama: precisa de rede; sem rede fica o texto do diagrama
      const ok = await Promise.race([
        page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js' })
          .then(() => page.evaluate(async () => { mermaid.initialize({ startOnLoad: false }); await mermaid.run(); return true; })),
        new Promise((r) => setTimeout(() => r(false), 10000)),
      ]).catch(() => false);
      if (!ok) console.log('aviso: diagrama mermaid sem rede, ficou como texto');
    }
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: saida, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, outline: true, tagged: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="font:8px system-ui,sans-serif;color:#64748b;width:100%;padding:0 15mm;display:flex;justify-content:space-between">
        <span>${esc(titulo)}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>` });
    console.log(`ok ${saida}`);
  } finally {
    await b.close();
    fs.rmSync(tmp, { force: true });
  }
}

// ---------- HTML único e zip ----------
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.webp': 'image/webp' };
export function unico(dir) {
  const fs_ = telas(dir);
  if (!fs_.length) throw new Error(`nenhuma tela em ${dir}`);
  const primeira = ['index.html', 'login.html'].find((f) => fs_.includes(f)) || fs_[0];
  const ordem = [primeira, ...fs_.filter((f) => f !== primeira)];
  const id = (f) => 'p-' + f.replace(/\.html?$/i, '').replace(/[^\w-]/g, '-');
  const css = new Set();
  let titulo = '';
  const secoes = ordem.map((f) => {
    let h = fs.readFileSync(path.join(dir, f), 'utf8');
    titulo ||= h.match(/<title>(.*?)<\/title>/i)?.[1] || 'Protótipo';
    for (const m of h.matchAll(/<link[^>]+href="([^"]+\.css)"/gi)) if (!/^https?:/i.test(m[1])) css.add(m[1]);
    const classe = h.match(/<body[^>]*class="([^"]*)"/i)?.[1] || '';
    h = (h.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? h)
      .replace(/href="([^"#:]+\.html?)(#[^"]*)?"/gi, (m, alvo) => fs_.includes(alvo) ? `href="#${id(alvo)}"` : m)
      .replace(/src="([^":]+\.(png|jpe?g|svg|gif|webp))"/gi, (m, s, ext) => {
        const p = path.join(dir, s);
        return fs.existsSync(p) ? `src="data:${MIME['.' + ext.toLowerCase()]};base64,${fs.readFileSync(p).toString('base64')}"` : m;
      });
    return `<section class="pagina" data-classe="${classe}" id="${id(f)}">${h}</section>`;
  });
  const estilos = [...css].map((c) => (fs.existsSync(path.join(dir, c)) ? fs.readFileSync(path.join(dir, c), 'utf8') : '')).join('\n');
  const fontes = [...new Set([...fs.readFileSync(path.join(dir, primeira), 'utf8').matchAll(/<link[^>]+href="(https:\/\/fonts[^"]+)"[^>]*>/gi)].map((m) => m[0]))].join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title>${fontes}<style>${estilos}
.pagina[hidden]{display:none!important}</style></head><body>
${secoes.join('\n')}
<script>function mostrar(){var a=location.hash.slice(1),e=a&&document.getElementById(a),s=e&&e.closest('.pagina')||document.querySelector('.pagina');
document.querySelectorAll('.pagina').forEach(function(p){p.hidden=p!==s});document.body.className=s.dataset.classe;if(e===s)scrollTo(0,0)}
addEventListener('hashchange',mostrar);mostrar();</script></body></html>`;
}

const FORA = /^(prints|revisao|\.[^/]*)(\/|$)|^notas\.md$|^anotacoes\.json$|^especificacao\.(md|html?)$|\.zip$/i;
export function zip(files) {
  const d = new Date();
  const tempo = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const data = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const partes = [];
  const central = [];
  let off = 0;
  for (const f of files) {
    const nome = Buffer.from(f.name);
    const comp = zlib.deflateRawSync(f.data);
    const crc = zlib.crc32(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(tempo, 10); local.writeUInt16LE(data, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(f.data.length, 22); local.writeUInt16LE(nome.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt16LE(tempo, 12); c.writeUInt16LE(data, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20);
    c.writeUInt32LE(f.data.length, 24); c.writeUInt16LE(nome.length, 28); c.writeUInt32LE(off, 42);
    partes.push(local, nome, comp);
    central.push(c, nome);
    off += 30 + nome.length + comp.length;
  }
  const cd = Buffer.concat(central);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(files.length, 8); fim.writeUInt16LE(files.length, 10);
  fim.writeUInt32LE(cd.length, 12); fim.writeUInt32LE(off, 16);
  return Buffer.concat([...partes, cd, fim]);
}
export function arquivosDoZip(dir) {
  const raiz = path.basename(path.resolve(dir));
  const lista = [];
  const andar = (sub) => {
    for (const e of fs.readdirSync(path.join(dir, sub), { withFileTypes: true })) {
      const rel = sub ? `${sub}/${e.name}` : e.name;
      if (FORA.test(rel)) continue;
      if (e.isDirectory()) andar(rel);
      else lista.push({ name: `${raiz}/${rel}`, data: fs.readFileSync(path.join(dir, rel)) });
    }
  };
  andar('');
  const inicio = ['index.html', 'login.html'].find((f) => lista.some((x) => x.name === `${raiz}/${f}`)) || telas(dir)[0];
  lista.unshift({ name: `${raiz}/LEIA-ME.txt`, data: Buffer.from(
    `Protótipo navegável.\r\n\r\n1. Extraia a pasta inteira (no Windows: botão direito > Extrair tudo).\r\n` +
    `2. Abra ${inicio} no navegador.\r\n\r\nAbrir direto de dentro do zip faz as telas perderem o visual.\r\n`) });
  return lista;
}

// Zoom de quem tirou o print: retrato de celular (1170 px = 390 × 3) ou desktop retina/200% (2560 px = 1280 × 2).
export const zoom = (w, h) => (h > w * 1.4 && w <= 1300 ? Math.min(3, Math.max(1, Math.round(w / 390))) : w > 2000 ? 2 : 1);

// Tamanho de PNG ou JPEG sem abrir o navegador.
export function medidas(buf) {
  if (buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.readUInt16BE(0) === 0xffd8) {
    for (let i = 2; i + 9 < buf.length;) {
      const m = buf.readUInt16BE(i);
      if (m >= 0xffc0 && m <= 0xffcf && ![0xffc4, 0xffc8, 0xffcc].includes(m)) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

// ---------- Levar ao código: o tema do protótipo aprovado no projeto Angular, React ou Flutter ----------
// Web: o estilo.css + tema.css viram estilo global, com as mesmas classes, e o Claude não reescreve CSS.
// Flutter: as variáveis viram um ThemeData. Nunca sobrescreve arquivo existente.
const AVISO_CSS = '/* Gerado por `R codigo` a partir do protótipo aprovado (estilo.css + tema.css), com escopo .prototipo: vale só dentro de um\n' +
  '   contêiner class="prototipo", então as telas que o app já tem não mudam. Para mudar cor ou fonte, mude o tema.css do protótipo e gere de novo. */\n';

// Cada seletor passa a valer só dentro de `raiz`: `.btn` -> `.prototipo .btn`; `:root`, `html`, `body` -> `.prototipo`;
// `body.mobile` -> `.prototipo.mobile`. @media e @supports são escopados por dentro; @keyframes e @font-face ficam como estão.
// shortcut: cobre CSS sem aninhamento, que é o que estilo.css e tema.css usam; CSS aninhado pediria um parser de verdade.
export function escopo(css, raiz = '.prototipo') {
  const sel = (s) => s.split(',').map((x) => {
    x = x.trim();
    if (x === '*') return `${raiz}, ${raiz} *`;
    if (/^(:root|html|body)$/.test(x)) return raiz;
    if (/^(html|body)[.:[#]/.test(x)) return raiz + x.replace(/^(html|body)/, '');
    if (/^(html|body)\s/.test(x)) return `${raiz} ${x.replace(/^(html|body)\s+/, '')}`;
    return `${raiz} ${x}`;
  }).join(',');
  const fim = (txt, abre) => { // index after the '}' that closes the '{' at `abre`
    let n = 0;
    for (let j = abre; j < txt.length; j++) if (txt[j] === '{') n++; else if (txt[j] === '}' && --n === 0) return j + 1;
    return txt.length;
  };
  const semComentario = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let out = '';
  for (let i = 0; i < semComentario.length;) {
    const abre = semComentario.indexOf('{', i);
    if (abre < 0) { out += semComentario.slice(i); break; }
    const cabeca = semComentario.slice(i, abre).trim();
    const f = fim(semComentario, abre);
    if (/^@(media|supports)\b/.test(cabeca)) out += `${cabeca}{${escopo(semComentario.slice(abre + 1, f - 1), raiz)}}\n`;
    else if (cabeca.startsWith('@')) out += `${semComentario.slice(i, f).trim()}\n`;
    else if (cabeca) out += `${sel(cabeca)}${semComentario.slice(abre, f)}\n`;
    i = f;
  }
  return out;
}

function variaveis(css) {
  const v = {};
  for (const bloco of css.matchAll(/:root\s*\{([^}]*)\}/g)) {
    for (const [, nome, valor] of bloco[1].matchAll(/--([\w-]+)\s*:\s*([^;]+)/g)) v[nome] = valor.trim();
  }
  return v;
}

function corDart(valor, nome) {
  let v = valor.trim().toLowerCase();
  let m = v.match(/^#([0-9a-f]{3})$/);
  if (m) v = `#${[...m[1]].map((c) => c + c).join('')}`;
  if ((m = v.match(/^#([0-9a-f]{6})$/))) return `Color(0xFF${m[1].toUpperCase()})`;
  if ((m = v.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/))) {
    return `Color(0xFF${m.slice(1).map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase()})`;
  }
  throw new Error(`--${nome}: cor "${valor}" não suportada (use #rgb, #rrggbb ou rgb(r,g,b))`);
}

const temaDart = (v) => {
  const cor = (n) => corDart(v[n], n);
  const fonte = (v.fonte || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
  const sistema = !fonte || /^(system-ui|-apple-system|sans-serif|serif|monospace|inherit)$/i.test(fonte);
  return `// Gerado por \`R codigo flutter\` a partir do protótipo aprovado (prototipo/tema.css). Gere de novo se o tema mudar.
import 'package:flutter/material.dart';

const double raioPrototipo = ${parseFloat(v.raio) || 8};

final ThemeData temaPrototipo = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: const ${cor('cor')},
    primary: const ${cor('cor')},
    onPrimary: const ${cor('sobre-cor')},
    surface: const ${cor('superficie')},
    surfaceContainerLowest: const ${cor('fundo')},
    onSurface: const ${cor('texto')},
    error: const ${cor('erro')},
  ),
  scaffoldBackgroundColor: const ${cor('fundo')},${sistema ? '' : `\n  fontFamily: '${fonte}',`}
);
`;
};

export function codigo(alvo, raiz = '.', origem = path.join(raiz, 'prototipo')) {
  const tema = path.join(origem, 'tema.css');
  if (!fs.existsSync(tema)) throw new Error(`falta ${tema}: gere e aprove o protótipo antes (R init e as telas)`);
  const estiloArq = fs.existsSync(path.join(origem, 'estilo.css')) ? path.join(origem, 'estilo.css') : path.join(ASSETS, 'estilo.css');
  const estilo = fs.readFileSync(estiloArq, 'utf8');
  const temaCss = fs.readFileSync(tema, 'utf8');
  const existe = (f) => fs.existsSync(path.join(raiz, f));
  const pkg = existe('package.json') ? JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8')) : {};
  const ehReact = Boolean({ ...pkg.dependencies, ...pkg.devDependencies }.react);
  const exige = { angular: ['angular.json', existe('angular.json')], react: ['package.json com react', ehReact], flutter: ['pubspec.yaml', existe('pubspec.yaml')] }[alvo];
  if (!exige) throw new Error(`framework "${alvo}" não suportado: use angular, react ou flutter`);
  if (!exige[1]) throw new Error(`este projeto não é ${alvo}: falta ${exige[0]} em ${path.resolve(raiz)}`);
  const destino = alvo === 'flutter' ? 'lib/tema/tema_prototipo.dart' : 'src/styles/prototipo.css';
  const arq = path.join(raiz, destino);
  if (fs.existsSync(arq)) throw new Error(`${arq} já existe; não sobrescrevi (apague ou renomeie, e rode de novo)`);
  const conteudo = alvo === 'flutter' ? temaDart({ ...variaveis(estilo), ...variaveis(temaCss) }) : `${AVISO_CSS}${escopo(`${estilo}\n${temaCss}`)}`;
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  fs.writeFileSync(arq, conteudo);
  let aviso = '';
  if (alvo === 'angular') { // antes dos estilos do app, que continuam podendo sobrescrever
    const f = path.join(raiz, 'angular.json');
    const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
    let n = 0;
    for (const p of Object.values(cfg.projects || {})) {
      const styles = p.architect?.build?.options?.styles;
      if (Array.isArray(styles) && !styles.includes(destino)) { styles.unshift(destino); n++; }
    }
    if (n) fs.writeFileSync(f, `${JSON.stringify(cfg, null, 2)}\n`);
    else aviso = `angular.json sem "styles" no build: acrescente "${destino}" à mão`;
  } else if (alvo === 'react') {
    const entrada = ['src/main.tsx', 'src/main.jsx', 'src/index.tsx', 'src/index.jsx', 'src/main.js', 'src/index.js'].find(existe) || 'o arquivo de entrada';
    aviso = `ponha \`import './styles/prototipo.css'\` no topo de ${entrada}`;
  } else {
    aviso = 'use `theme: temaPrototipo` no MaterialApp (import do lib/tema/tema_prototipo.dart)';
  }
  return { arquivo: destino, aviso };
}

// ---------- CLI ----------
async function main([cmd, ...a]) {
  const flags = new Set(a.filter((x) => x.startsWith('--')));
  const pos = a.filter((x) => !x.startsWith('--'));
  if (cmd === 'init' && pos[0]) {
    fs.mkdirSync(pos[0], { recursive: true });
    fs.copyFileSync(path.join(ASSETS, 'estilo.css'), path.join(pos[0], 'estilo.css'));
    const tema = path.join(pos[0], 'tema.css');
    if (!fs.existsSync(tema)) fs.writeFileSync(tema, '/* Cores e fonte do projeto: sobrescreva aqui as variáveis de estilo.css (--cor, --cor-escura, --cor-clara, --fundo, --texto, --fonte, --raio...). */\n:root{}\n');
    console.log(`ok ${pos[0]}/estilo.css e ${pos[0]}/tema.css${flags.has('--mobile') ? ' (mobile: use <body class="mobile"><div class="tela">)' : ''}`);
  } else if (cmd === 'medir' && pos[0]) {
    const m = medidas(fs.readFileSync(pos[0]));
    if (!m) throw new Error('formato não reconhecido (use PNG ou JPEG)');
    const z = zoom(m.w, m.h);
    console.log(z === 1 ? `print ${m.w}×${m.h} px: monte para ${m.w} px de largura, medidas do print valem como estão`
      : `print ${m.w}×${m.h} px: tela de ${Math.round(m.w / z)} px com zoom ${z * 100}%. Monte para ${Math.round(m.w / z)} px de largura e divida por ${z} o tamanho de texto, espaçamento e altura que você ler no print`);
  } else if (cmd === 'checar' && pos[0]) await checar(pos[0]);
  else if (cmd === 'prints' && pos[0]) await prints(pos[0], flags.has('--anotar'), pos.slice(1));
  else if (cmd === 'lado' && pos.length === 3) await lado(...pos);
  else if (cmd === 'pdf' && pos[0]) await pdf(pos[0], pos[1]);
  else if (cmd === 'unico' && pos.length === 2) { fs.writeFileSync(pos[1], unico(pos[0])); console.log(`ok ${pos[1]}`); }
  else if (cmd === 'zip' && pos.length === 2) {
    const files = arquivosDoZip(pos[0]);
    fs.writeFileSync(pos[1], zip(files));
    console.log(`ok ${pos[1]} (${files.length} arquivos)`);
  } else if (cmd === 'codigo' && pos[0]) {
    const r = codigo(pos[0], pos[1] || '.');
    console.log(`ok ${r.arquivo}${r.aviso ? `; ${r.aviso}` : ''}`);
  } else {
    console.error('uso: init <pasta> [--mobile] | medir <print> | checar <pasta> | prints <pasta> [--anotar] [tela.html[#estado]...] | ' +
      'lado <original> <tela.html> <saida.png> | pdf <arquivo.md|html> [saida.pdf] | unico <pasta> <saida.html> | zip <pasta> <saida.zip> | ' +
      'codigo <angular|react|flutter> [raiz do projeto]');
    process.exitCode = 2;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => { console.error(`erro: ${e.message}`); process.exitCode = 1; });
}
