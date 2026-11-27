// Helpers for the doc tests (docs.test.mjs: structure, in npm test; docs-conteudo.test.mjs: wording, run by hand).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT } from '../lib/toolkit.mjs';

export const read = (f) => fs.readFileSync(path.join(REPO_ROOT, f), 'utf8');
// GitHub's heading anchor: lowercase, drop punctuation (keeps letters with accents, digits, - and _), spaces to -.
export const slug = (h) => h.trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-');
export const headings = (md) => [...md.matchAll(/^#{1,6} (.+)$/gm)].map((m) => slug(m[1]));
// The text under the heading whose slug is `id`, up to the next heading of the same or a higher level.
export function section(md, id) {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => /^#{1,6} /.test(l) && slug(l.replace(/^#+ /, '')) === id);
  assert.ok(start >= 0, `missing section #${id}`);
  const level = lines[start].match(/^#+/)[0].length;
  const end = lines.findIndex((l, i) => i > start && /^#{1,6} /.test(l) && l.match(/^#+/)[0].length <= level);
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n');
}
export function inOrder(text, needles) {
  let at = -1;
  for (const n of needles) {
    const i = text.indexOf(n, at + 1);
    assert.ok(i > at, `"${n}" missing or out of order`);
    at = i;
  }
}
export const numbered = (text) => assert.match(text, /^1\. .+\n(?:.*\n)*?2\. /m, 'not a numbered list');

export const GUIA = () => read('docs/GUIA.md');
export const PROMPTS = () => read('docs/PROMPTS.md');
export const COFRE = () => section(GUIA(), 'tokens-e-senhas-cofre');

export const svgs = () => {
  execFileSync(process.execPath, [path.join(REPO_ROOT, 'docs/charts.mjs')], { stdio: 'ignore' });
  return Object.fromEntries(['custo-light', 'custo-dark', 'fluxos-light', 'fluxos-dark'].map((n) => [n, read(`docs/img/${n}.svg`)]));
};
export const count = (s, re) => (s.match(re) || []).length;
