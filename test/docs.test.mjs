// Doc structure checks (.specs/features/docs-uso/checks.md), one test per check, named C<n>. Wording lives in docs-conteudo.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../lib/toolkit.mjs';
import { read, headings, section, GUIA, PROMPTS, svgs, count } from './docs-lib.mjs';

test('C1 GUIA opens with the goal index linking the three tracks', () => {
  const g = GUIA();
  const idx = section(g, 'o-que-você-quer-fazer');
  for (const a of ['#primeiro-uso', '#desenvolver', '#prototipar-e-especificar']) assert.ok(idx.includes(`(${a})`), a);
  assert.ok(g.indexOf('## O que você quer fazer?') < g.indexOf('## Primeiro uso'), 'index before the first track');
});

test('C3 README Primeiros passos links the Primeiro uso track', () => {
  assert.ok(section(read('README.md'), 'primeiros-passos').includes('docs/GUIA.md#primeiro-uso'));
});

test('C4 anchors cited today still exist, and every GUIA anchor link resolves', () => {
  const ids = headings(GUIA());
  for (const a of ['tokens-e-senhas-cofre', 'azure-devops-server', 'o-check-antes-de-encerrar', 'feature-ou-bug-com-regra-de-negócio']) {
    assert.ok(ids.includes(a), a);
  }
  const skills = fs.readdirSync(path.join(REPO_ROOT, 'plugins/cctk/skills')).map((d) => `plugins/cctk/skills/${d}/SKILL.md`);
  const docs = ['README.md', 'bench/README.md', ...fs.readdirSync(path.join(REPO_ROOT, 'docs')).filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`), ...skills];
  for (const f of docs.filter((d) => fs.existsSync(path.join(REPO_ROOT, d)))) {
    const text = read(f);
    for (const [, a] of text.matchAll(/GUIA\.md#([^)\s]+)/g)) assert.ok(ids.includes(decodeURIComponent(a)), `${f} -> GUIA.md#${a}`);
    if (f === 'docs/GUIA.md') for (const [, a] of text.matchAll(/\]\(#([^)]+)\)/g)) assert.ok(ids.includes(decodeURIComponent(a)), `GUIA -> #${a}`);
  }
});

test('C9 every principle in PROMPTS.md has a bad and a good example and a source', () => {
  const p = section(PROMPTS(), 'princípios');
  const items = p.split(/^### /m).slice(1);
  assert.ok(items.length >= 4, `only ${items.length} principles`);
  for (const it of items) {
    const name = it.split('\n')[0];
    assert.ok(it.includes('❌') && it.includes('✅'), `${name}: ❌/✅`);
    assert.match(it, /\(https:\/\//, `${name}: source link`);
  }
});

test('C10 PROMPTS.md links only to Anthropic sources', () => {
  const ok = new Set(['platform.claude.com', 'docs.anthropic.com', 'code.claude.com', 'docs.claude.com', 'www.anthropic.com', 'claude.com']);
  const hosts = [...PROMPTS().matchAll(/https:\/\/([^/)\s>]+)/g)].map((m) => m[1]);
  assert.ok(hosts.length, 'no sources');
  for (const h of hosts) assert.ok(ok.has(h), h);
});

test('C12 GUIA and README link PROMPTS.md', () => {
  assert.match(GUIA(), /\]\(PROMPTS\.md/);
  assert.match(read('README.md'), /\]\(docs\/PROMPTS\.md/);
});

test('C17 cost chart is a dumbbell sorted by saving', () => {
  const all = svgs();
  for (const n of ['custo-light', 'custo-dark']) {
    const s = all[n];
    assert.equal(count(s, /<line [^>]*class="d"/g), 8, `${n}: connectors`);
    assert.equal(count(s, /<circle /g), 16, `${n}: dots`);
    const pct = [...s.matchAll(/>−(\d+)%</g)].map((m) => +m[1]);
    assert.equal(pct.length, 8, `${n}: % labels`);
    assert.deepEqual(pct, [...pct].sort((a, b) => b - a), `${n}: sorted by saving`);
    assert.ok(s.includes('(−52%)'), `${n}: total in subtitle`);
  }
});

test('C18 flows chart plots cost x correct runs for the three arms', () => {
  const all = svgs();
  for (const n of ['fluxos-light', 'fluxos-dark']) {
    const s = all[n];
    assert.equal(count(s, /<circle /g), 3, `${n}: dots`);
    // Point labels are their own <text> elements, so the aria-label and the axis ticks can't stand in for them.
    for (const [arm, value] of [['toolkit', 'US$ 0,10 · 22/24'], ['openspec', 'US$ 0,51 · 24/24'], ['tlc', 'US$ 0,71 · 24/24']]) {
      assert.match(s, new RegExp(`>${arm}</text>`), `${n}: ${arm} label`);
      assert.ok(s.includes(`>${value}</text>`), `${n}: ${value} label`);
    }
    for (const tick of ['18/24', '24/24', 'US$ 0,20', 'US$ 0,80']) assert.ok(s.includes(`>${tick}</text>`), `${n}: axis ${tick}`);
  }
});

test('C19 every chart has an accessible description', () => {
  const all = svgs();
  for (const [n, s] of Object.entries(all)) {
    assert.match(s, /role="img"/, n);
    const label = s.match(/aria-label="([^"]+)"/)?.[1] || '';
    for (const t of n.startsWith('custo') ? ['fábrica', 'kit', '52%'] : ['custo', 'acerto']) assert.ok(label.includes(t), `${n}: ${t}`);
  }
});

test('C21 bench README shows the flows chart in its section', () => {
  const b = read('bench/README.md'); // the section is a bold lead paragraph, up to the next one
  const start = b.indexOf('**Fluxos de spec de ponta a ponta');
  assert.ok(start >= 0, 'missing section');
  const s = b.slice(start, b.indexOf('\n**', start + 1));
  assert.match(s, /<picture>[\s\S]*fluxos-dark\.svg[\s\S]*fluxos-light\.svg[\s\S]*<\/picture>/);
});

// docs-ferramenta (.specs/features/docs-ferramenta/checks.md): check C<n> is test F<n>.
const README = () => read('README.md');
const SITUACOES = () => read('docs/SITUACOES.md');
const DOC_FILES = () => ['README.md', 'bench/README.md', ...fs.readdirSync(path.join(REPO_ROOT, 'docs')).filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`)];
const RAW = 'https://raw.githubusercontent.com/AlfredoNeeto/cctk/main/';

test('F1 README maps the documentation before the commands', () => {
  const r = README();
  assert.ok(r.indexOf('## Documentação') >= 0 && r.indexOf('## Documentação') < r.indexOf('## Comandos'), 'Documentação before Comandos');
  const rows = section(r, 'documentação').split('\n').filter((l) => l.startsWith('|'));
  for (const link of ['docs/GUIA.md#primeiro-uso', 'docs/SITUACOES.md', 'docs/PROMPTS.md', 'docs/GUIA.md)', 'bench/README.md']) {
    const row = rows.find((l) => l.includes(`](${link}`));
    assert.ok(row, link);
    assert.ok(row.replace(/\[[^\]]*\]\([^)]*\)/g, '').replace(/[|\s]/g, '').length > 10, `${link}: says what it is for`);
  }
});

test('F2 README Comandos cites every flag cli.mjs accepts', () => {
  // The flags cctk itself accepts are the ones in its usage line; other '--x' in cli.mjs are passed to other tools.
  const usage = read('cli.mjs').match(/'Uso: ([^']+)'/)[1];
  const flags = new Set(usage.match(/--[a-z][a-z-]*/g));
  assert.ok(flags.size >= 2, [...flags].join());
  const s = section(README(), 'comandos');
  for (const f of flags) assert.ok(s.includes(f), f);
});

test('F3 README has a short FAQ', () => {
  const s = section(README(), 'perguntas-frequentes');
  const qs = s.split(/^(?:### .+|\*\*.+\?\*\*)$/m);
  assert.ok(qs.length - 1 >= 5, `only ${qs.length - 1} questions`);
  for (const a of qs.slice(1)) assert.ok(a.trim().split('\n').filter((l) => l.trim()).length <= 3, `answer too long: ${a.trim().slice(0, 60)}`);
});

test('F4 README images use absolute GitHub URLs that exist', () => {
  const urls = [...README().matchAll(/\b(?:src|srcset)="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(urls.length, 'no images');
  for (const u of urls) {
    assert.ok(u.startsWith(RAW), u);
    assert.ok(fs.existsSync(path.join(REPO_ROOT, u.slice(RAW.length))), `missing ${u}`);
  }
});

test('F5 README stays at most 200 lines', () => {
  assert.ok(README().split('\n').length <= 200);
});

test('F6 SITUACOES.md has at least 12 situations with Quando, a prompt and Confira', () => {
  const items = SITUACOES().split(/^### /m).slice(1);
  assert.ok(items.length >= 12, `only ${items.length}`);
  for (const it of items) {
    const name = it.split('\n')[0];
    for (const t of ['Quando', '```text', 'Confira']) assert.ok(it.includes(t), `${name}: ${t}`);
  }
});

test('F8 every command and skill cited in SITUACOES.md exists', () => {
  const s = SITUACOES(), cli = read('cli.mjs');
  const subs = new Set([...s.matchAll(/\bcctk ([a-z]+)/g)].map((m) => m[1])); // inline and inside code blocks
  const skills = new Set([...s.matchAll(/\/cctk:([a-z-]+)/g)].map((m) => m[1]));
  assert.ok(subs.size && skills.size, 'nothing cited');
  for (const c of subs) assert.ok(cli.includes(`cmd === '${c}'`), `cctk ${c}`);
  for (const k of skills) assert.ok(fs.existsSync(path.join(REPO_ROOT, 'plugins/cctk/skills', k)), `/cctk:${k}`);
});

test('F9 GUIA index and README map link SITUACOES.md', () => {
  assert.match(section(GUIA(), 'o-que-você-quer-fazer'), /\]\(SITUACOES\.md/);
  assert.match(section(README(), 'documentação'), /\]\(docs\/SITUACOES\.md/);
});

test('F10 PROMPTS.md has at least six templates by situation', () => {
  const s = section(PROMPTS(), 'modelos-por-situação');
  assert.ok(count(s, /```text/g) >= 6, 'six ```text blocks');
  for (const t of ['bug', 'feature', 'pergunta', 'refatora', 'revis', 'documento']) assert.ok(s.toLowerCase().includes(t), t);
});

const charts = async () => { svgs(); return import('../docs/charts.mjs'); };
const svg = (n) => read(`docs/img/${n}.svg`);

test('F13 experiments chart: one bar per experiment, in vs out colored, sorted, metric on each label', async () => {
  const { EXPERIMENTS, THEMES } = await charts();
  for (const [mode, t] of Object.entries(THEMES)) {
    const s = svg(`experimentos-${mode}`);
    const bars = [...s.matchAll(/<rect class="b"[^>]*fill="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(bars.length, EXPERIMENTS.length, `${mode}: bars`);
    assert.notEqual(t.kit, t.muted, `${mode}: two colors`);
    // Each bar's color follows its own "in the kit?" flag, in the chart's order (sorted by the % change).
    const sorted = [...EXPERIMENTS].sort((a, b) => a[2] - b[2]);
    assert.deepEqual(bars, sorted.map((e) => (e[4] ? t.kit : t.muted)), `${mode}: color by in/out`);
    const pct = [...s.matchAll(/<text class="v"[^>]*>([+−])(\d+)%</g)].map((m) => (m[1] === '−' ? -m[2] : +m[2]));
    assert.equal(pct.length, EXPERIMENTS.length, `${mode}: % labels`);
    assert.deepEqual(pct, [...pct].sort((a, b) => a - b), `${mode}: sorted`);
    const labels = [...s.matchAll(/<text class="l"[^>]*>([^<]+)</g)].map((m) => m[1]);
    assert.equal(labels.length, EXPERIMENTS.length, `${mode}: row labels`);
    for (const l of labels) assert.match(l, /, por (acerto|execução)$/, l);
  }
});

test('F14 every experiment and version number is written in bench/README.md', async () => {
  const { EXPERIMENTS, VERSIONS } = await charts();
  const b = read('bench/README.md');
  for (const [v, total, ok, runs] of VERSIONS) {
    assert.ok(b.includes(`US$ ${total.toFixed(2).replace('.', ',')}`), `${v}: US$ ${total}`);
    assert.ok(b.includes(`${ok}/${runs}`), `${v}: ${ok}/${runs}`);
  }
  for (const [label, , pct, evidence] of EXPERIMENTS) {
    for (const e of evidence) assert.ok(b.includes(e), `${label}: "${e}"`);
    if (evidence.length === 2 && evidence.every((e) => /^\d,\d+$/.test(e))) {
      const [base, arm] = evidence.map((e) => +e.replace(',', '.'));
      assert.equal(pct, Math.round((arm / base - 1) * 100), `${label}: % from the pair`);
    }
  }
});

test('F15 versions chart: one dot per regression round with its accuracy', async () => {
  await charts();
  for (const n of ['versoes-light', 'versoes-dark']) {
    const s = svg(n);
    assert.equal(count(s, /<circle /g), 4, `${n}: dots`);
    for (const t of ['1.0.2', '1.1.0', '1.1.1', '1.4.0']) assert.ok(s.includes(`>${t}</text>`), `${n}: ${t}`);
    for (const t of ['US$ 0,10 · 46/48', 'US$ 0,08 · 46/48', 'US$ 0,08 · 48/48', 'US$ 0,11 · 47/48']) assert.ok(s.includes(`>${t}</text>`), `${n}: ${t}`);
    assert.ok(s.includes('mesmas 24 tarefas'), `${n}: subtitle`);
  }
});

test('F16 new charts are accessible and use the validated colors', async () => {
  const { THEMES } = await charts();
  for (const [mode, t] of Object.entries(THEMES)) {
    const allowed = new Set(Object.values(t));
    for (const n of [`experimentos-${mode}`, `versoes-${mode}`]) {
      const s = svg(n);
      assert.match(s, /role="img"/, n);
      assert.ok((s.match(/aria-label="([^"]+)"/)?.[1] || '').includes('custo'), `${n}: aria-label`);
      for (const [, c] of s.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/gi)) assert.ok(allowed.has(c), `${n}: ${c}`);
    }
  }
});

test('F17 bench README opens with a summary and shows both new charts', () => {
  const b = read('bench/README.md');
  assert.match(b, /^# [^\n]+\n+## Resumo\n/, 'Resumo is the first thing under the title');
  assert.ok(section(b, 'resumo').split('\n').filter((l) => l.trim()).length <= 8, 'Resumo at most 8 lines');
  for (const n of ['experimentos', 'versoes']) assert.match(b, new RegExp(`<picture>[\\s\\S]*?${n}-dark\\.svg[\\s\\S]*?${n}-light\\.svg[\\s\\S]*?</picture>`), n);
});

test('F18 relative links and images in the docs point to existing files', () => {
  for (const f of DOC_FILES()) {
    const text = read(f);
    for (const [, md, html] of text.matchAll(/\]\(((?!https?:|#|mailto:)[^)#\s]+)[^)]*\)|\b(?:src|srcset)="((?!https?:)[^"]+)"/g)) {
      const link = decodeURIComponent(md || html);
      assert.ok(fs.existsSync(path.join(REPO_ROOT, path.dirname(f), link)), `${f} -> ${link}`);
    }
  }
});

test('F19 anchors between the docs resolve', () => {
  for (const f of DOC_FILES()) {
    const text = read(f);
    for (const [, file, anchor] of text.matchAll(/\]\(((?!https?:)[^)#\s]*)#([^)\s]+)\)/g)) {
      const target = file ? path.posix.join(path.posix.dirname(f), file) : f;
      if (!target.endsWith('.md')) continue;
      assert.ok(headings(read(target)).includes(decodeURIComponent(anchor)), `${f} -> ${file}#${anchor}`);
    }
  }
});
