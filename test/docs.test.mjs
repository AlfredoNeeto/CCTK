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
