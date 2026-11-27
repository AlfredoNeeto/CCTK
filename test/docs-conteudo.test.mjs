// Doc wording checks (.specs/features/docs-uso/checks.md), outside npm test so editing a sentence on purpose breaks nothing.
// Run: node --test test/docs-conteudo.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { section, inOrder, numbered, GUIA, PROMPTS, COFRE } from './docs-lib.mjs';

test('C2 Primeiro uso is numbered from install to the statusline', () => {
  const s = section(GUIA(), 'primeiro-uso');
  numbered(s);
  inOrder(s, ['cctk install', '/cctk:init-project', 'ommit', 'cctk trust', 'Sonnet']);
});

test('C5 Desenvolver has a table for direct request vs OpenSpec with the 5x cost', () => {
  const s = section(GUIA(), 'desenvolver');
  const rows = s.split('\n').filter((l) => l.startsWith('|'));
  assert.ok(rows.some((r) => /direto/i.test(r)), 'row for asking directly');
  assert.ok(rows.some((r) => /OpenSpec/.test(r)), 'row for OpenSpec');
  assert.ok(s.includes('5×'));
});

test('C6 Desenvolver walks an OpenSpec example in order', () => {
  inOrder(section(GUIA(), 'desenvolver'), ['/openspec-propose', 'Dimensões', '/openspec-apply-change', '/openspec-verify-change', '/openspec-archive-change']);
});

test('C7 Prototipar e especificar is numbered from prototype to OpenSpec', () => {
  const s = section(GUIA(), 'prototipar-e-especificar');
  numbered(s);
  inOrder(s, ['/cctk:prototipo', 'especificação', 'especificacao.md', '/openspec-propose']);
});

test('C8 prototype numbers and warnings are kept', () => {
  const g = GUIA();
  for (const t of ['18%', 'US$ 0,26 a 0,30', 'US$ 0,25 a 0,31', 'tarje nome e CPF', 'Não use dados reais de cliente']) assert.ok(g.includes(t), t);
});

test('C11 PROMPTS.md has a Claude Code section', () => {
  const s = section(PROMPTS(), 'no-claude-code');
  for (const t of ['@', 'pronto', '/clear', 'plan']) assert.ok(s.includes(t), t);
});

test('C13 vault section follows the value from set to $NAME', () => {
  inOrder(COFRE(), ['cctk secret set', 'cofre do sistema', '/clear', 'terminal', '$API_TOKEN']);
});

test('C14 vault section says where the variable does not reach', () => {
  for (const t of ['MCP', 'IDE', 'fora do Claude']) assert.ok(COFRE().includes(t), t);
});

test('C15 vault section has a bash and a PowerShell example', () => {
  const blocks = [...COFRE().matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]);
  assert.ok(blocks.some((b) => /\$API_TOKEN/.test(b) && !/\$env:/.test(b)), 'bash block');
  assert.ok(blocks.some((b) => b.includes('$env:API_TOKEN')), 'PowerShell block');
});

test('C16 vault section covers overwrite and the limits', () => {
  const s = COFRE();
  for (const t of ['sobrescreve', 'desenvolvimento']) assert.ok(s.includes(t), t);
  assert.match(s, /Windows[^\n]*`\/`|`\/`[^\n]*Windows/);
});

