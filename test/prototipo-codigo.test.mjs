// "Levar ao código" do /cctk:prototipo (.specs/features/prototipo-codigo/checks.md), one test per check, named C<n>.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../lib/toolkit.mjs';
import { codigo, escopo } from '../plugins/cctk/skills/prototipo/scripts/render.mjs';

const SKILL = path.join(REPO_ROOT, 'plugins', 'cctk', 'skills', 'prototipo');
const RENDER = path.join(SKILL, 'scripts', 'render.mjs');
const ESTILO = fs.readFileSync(path.join(SKILL, 'assets', 'estilo.css'), 'utf8');

// A project of the given kind with an approved prototype in prototipo/.
function projeto(arquivos, tema = ':root{--cor:#0a7d4f;--erro:#c00}\n.topo h1{letter-spacing:.2px}\n') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proto-codigo-'));
  fs.mkdirSync(path.join(dir, 'prototipo'));
  fs.writeFileSync(path.join(dir, 'prototipo', 'estilo.css'), ESTILO);
  if (tema !== null) fs.writeFileSync(path.join(dir, 'prototipo', 'tema.css'), tema);
  for (const [f, c] of Object.entries(arquivos)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), typeof c === 'string' ? c : JSON.stringify(c));
  }
  return dir;
}
const ANGULAR = { 'angular.json': { projects: { app: { architect: {
  build: { options: { styles: ['src/styles.css'] } }, test: { options: { styles: ['src/styles.css'] } } } } } } };
const REACT = { 'package.json': { dependencies: { react: '^19.0.0' } }, 'src/main.jsx': '' };
const cli = (dir, ...a) => spawnSync(process.execPath, [RENDER, 'codigo', ...a], { cwd: dir, encoding: 'utf8' });

test('C1 angular: the scoped prototype CSS goes first in styles, estilo before tema', () => {
  const dir = projeto(ANGULAR);
  const r = codigo('angular', dir);
  assert.equal(r.arquivo, 'src/styles/prototipo.css');
  const css = fs.readFileSync(path.join(dir, 'src/styles/prototipo.css'), 'utf8');
  const estiloCor = css.indexOf('--cor:#2563eb'), temaCor = css.indexOf('--cor:#0a7d4f');
  assert.ok(estiloCor > 0 && temaCor > estiloCor, 'tema after estilo');
  assert.match(css, /\.prototipo \.topo h1\{letter-spacing:\.2px\}/, 'tema rules scoped too');
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'angular.json'), 'utf8'));
  assert.deepEqual(cfg.projects.app.architect.build.options.styles, ['src/styles/prototipo.css', 'src/styles.css']);
  assert.deepEqual(cfg.projects.app.architect.test.options.styles, ['src/styles/prototipo.css', 'src/styles.css'], 'component tests get it too');
});

test('C10 every selector outside @keyframes is scoped to .prototipo', () => {
  const css = escopo(`${ESTILO}\nbody.mobile{color:red}\n@import url("fonte.css");\n@layer base;\n:root{--fonte:Inter}\n`);
  assert.match(css, /^@import url\("fonte\.css"\);\n/, '@import goes to the top');
  assert.match(css, /^@layer base;$/m, '@layer statement kept');
  assert.match(css, /^\.prototipo\{--fonte:Inter\}/m, 'a rule after an @import is still scoped');
  // The Google Fonts URL has ";" inside url(...), and an @layer block holds rules that must be scoped too.
  const fontes = escopo("@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');\n:root{--cor:#1}\n@layer tema{.btn{x:1}}\n");
  assert.match(fontes, /^@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=Inter:wght@400;600&display=swap'\);$/m, 'whole Google Fonts @import');
  assert.match(fontes, /^\.prototipo\{--cor:#1\}/m, ':root after the Google Fonts @import');
  assert.match(fontes, /@layer tema\{\.prototipo \.btn\{x:1\}/, '@layer block scoped inside');
  assert.match(css, /\.prototipo \.btn\{/);
  assert.match(css, /^\.prototipo\{\s*--cor:/m, ':root becomes .prototipo');
  assert.match(css, /\.prototipo\.mobile\{color:red\}/, 'body.mobile');
  assert.match(css, /@media \(max-width:800px\)\{\.prototipo \.app\{/);
  assert.match(css, /@keyframes pulso\{to\{background-position:-200% 0\}\}/);
  // Every rule head outside @keyframes, at top level or inside @media, starts at .prototipo.
  const heads = [];
  const walk = (txt) => {
    for (let i = 0; i < txt.length;) {
      const a = txt.indexOf('{', i);
      if (a < 0) break;
      let n = 0, f = a;
      for (; f < txt.length; f++) if (txt[f] === '{') n++; else if (txt[f] === '}' && --n === 0) break;
      const h = txt.slice(i, a).trim();
      const head = h.replace(/^(@(import|layer)[^;]*;\s*)+/, ''); // statement at-rules before a rule are not its selector
      if (/^@media/.test(head)) walk(txt.slice(a + 1, f)); else if (!head.startsWith('@')) heads.push(head);
      i = f + 1;
    }
  };
  walk(css);
  assert.ok(heads.length > 50, `only ${heads.length} rules`);
  for (const h of heads) for (const s of h.split(',')) assert.match(s.trim(), /^\.prototipo([ .:[#]|$)/, `unscoped: ${s}`);
});

test('C2 react: writes the CSS and says which import to add to src/main.jsx', () => {
  const dir = projeto(REACT);
  const r = codigo('react', dir);
  assert.ok(fs.existsSync(path.join(dir, 'src/styles/prototipo.css')));
  assert.match(r.aviso, /import '\.\/styles\/prototipo\.css'/);
  assert.match(r.aviso, /src\/main\.jsx/);
});

test('C3 flutter: a ThemeData from the prototype colors, tema over estilo', () => {
  const dir = projeto({ 'pubspec.yaml': 'name: app\n' });
  assert.equal(codigo('flutter', dir).arquivo, 'lib/tema/tema_prototipo.dart');
  const dart = fs.readFileSync(path.join(dir, 'lib/tema/tema_prototipo.dart'), 'utf8');
  for (const t of ['ThemeData(', 'ColorScheme.fromSeed(', 'primary: const Color(0xFF0A7D4F)', 'error: const Color(0xFFCC0000)',
    'surface: const Color(0xFFFFFFFF)', 'surfaceContainer: const Color(0xFFF4F6F9)', 'scaffoldBackgroundColor: const Color(0xFFF4F6F9)',
    'onSurface: const Color(0xFF0F172A)', 'Flutter 3.22']) assert.ok(dart.includes(t), t);
  assert.ok(!dart.includes('fontFamily'), 'system font: no fontFamily');
});

test('C4 an existing destination is never overwritten; the CLI exits 1', () => {
  const dir = projeto(REACT);
  fs.mkdirSync(path.join(dir, 'src/styles'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src/styles/prototipo.css'), 'meu');
  assert.throws(() => codigo('react', dir), /prototipo\.css já existe/);
  assert.equal(fs.readFileSync(path.join(dir, 'src/styles/prototipo.css'), 'utf8'), 'meu');
  const r = cli(dir, 'react');
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /já existe/);
});

test('C5 no tema.css or the wrong framework: an error that says what is missing; the CLI exits 1', () => {
  assert.throws(() => codigo('react', projeto(REACT, null)), /falta .*tema\.css/);
  const dir = projeto(REACT);
  assert.throws(() => codigo('angular', dir), /não é angular: falta angular\.json/);
  const r = cli(dir, 'angular');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /angular\.json/);
});

const COMPONENTES = ['menu', 'topo', 'cards', 'filtros', 'caixa', 'tabela', 'campo', 'botões', 'selos', 'avisos', 'vazio', 'carregando', 'abas', 'modal', 'barras', 'login', 'mobile'];

test('C6 a map per framework with a table row for each catalog component', () => {
  for (const fw of ['angular', 'react', 'flutter']) {
    const f = path.join(SKILL, 'references', `codigo-${fw}.md`);
    assert.ok(fs.existsSync(f), f);
    const rows = fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.startsWith('|')).map((l) => l.split('|')[1].toLowerCase());
    for (const c of COMPONENTES) assert.ok(rows.some((r) => r.includes(c)), `${fw}: ${c}`);
  }
});

test('C7 SKILL.md has the "Levar ao código" step', () => {
  const md = fs.readFileSync(path.join(SKILL, 'SKILL.md'), 'utf8');
  const i = md.indexOf('## 6. Levar ao código');
  assert.ok(i > 0, 'section');
  const s = md.slice(i, md.indexOf('\n## ', i + 5) > 0 ? md.indexOf('\n## ', i + 5) : undefined);
  for (const t of ['R codigo', 'references/codigo-', 'componentes base', 'não reescreva']) assert.ok(s.includes(t), t);
});
