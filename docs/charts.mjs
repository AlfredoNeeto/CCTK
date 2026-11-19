// Generates the README benchmark chart (light and dark SVG). Run: node docs/charts.mjs
// Numbers come from bench/results/2026-11-18T21-01-22-458Z/report.md (median per task, 3 runs per side);
// they are copied here because bench/results/ is not in git.
import fs from 'node:fs';
import path from 'node:path';

const TASKS = [ // [label, factory Opus US$, kit Sonnet US$]
  ['Dias úteis (.NET)', 0.345, 0.156],
  ['Importar CSV', 0.284, 0.124],
  ['Condição de corrida', 0.28, 0.12],
  ['Feature .NET', 0.204, 0.103],
  ['Feature Node', 0.193, 0.088],
  ['Pergunta sobre o código', 0.153, 0.07],
  ['Corrigir bug', 0.127, 0.074],
  ['Pergunta com pegadinha', 0.121, 0.078],
];

const THEMES = { // validated with the dataviz palette validator (categorical slots 1-2, both modes)
  light: { kit: '#2a78d6', opus: '#eb6834', ink: '#1f2328', muted: '#59636e', grid: '#d1d9e0' },
  dark: { kit: '#3987e5', opus: '#d95926', ink: '#f0f6fc', muted: '#9198a1', grid: '#3d444d' },
};

const W = 760, LEFT = 190, RIGHT = 56, TOP = 92, BAR = 12, GAP = 2, ROW = 40, MAX = 0.4;
const H = TOP + TASKS.length * ROW + 34;
const x = (v) => LEFT + (v / MAX) * (W - LEFT - RIGHT);
const brl = (v, d = 2) => v.toFixed(d).replace('.', ',');
// Horizontal bar: square at the baseline, 4px rounded data end.
const bar = (y, v, fill) => {
  const x1 = x(v), r = 4;
  return `<path d="M${LEFT} ${y}H${x1 - r}Q${x1} ${y} ${x1} ${y + r}V${y + BAR - r}Q${x1} ${y + BAR} ${x1 - r} ${y + BAR}H${LEFT}Z" fill="${fill}"/>`;
};

function svg(t) {
  const total = TASKS.reduce((s, [, o, k]) => [s[0] + o, s[1] + k], [0, 0]);
  const saved = Math.round((1 - total[1] / total[0]) * 100);
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Custo por tarefa: o kit custou ${saved}% menos que o Claude Code de fábrica">`,
    `<style>text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;fill:${t.ink}}.m{fill:${t.muted}}</style>`,
    `<text x="0" y="22" font-size="18" font-weight="600">Mesma tarefa, metade do custo</text>`,
    `<text x="0" y="44" font-size="13" class="m">Custo por tarefa em US$ (equivalente na API). Total: US$ ${brl(total[0])} → US$ ${brl(total[1])} (−${saved}%), 23/24 e 22/24 execuções corretas.</text>`,
    `<rect x="0" y="60" width="12" height="12" rx="2" fill="${t.opus}"/><text x="18" y="70.5" font-size="13">Claude Code de fábrica (Opus)</text>`,
    `<rect x="230" y="60" width="12" height="12" rx="2" fill="${t.kit}"/><text x="248" y="70.5" font-size="13">Com o kit (Sonnet)</text>`,
  ];
  for (let v = 0; v <= MAX + 1e-9; v += 0.1) {
    out.push(`<line x1="${x(v)}" x2="${x(v)}" y1="${TOP - 6}" y2="${H - 28}" stroke="${t.grid}" stroke-width="1"/>`);
    out.push(`<text x="${x(v)}" y="${H - 10}" font-size="12" class="m" text-anchor="middle">${v ? brl(v) : '0'}</text>`);
  }
  TASKS.forEach(([label, opus, kit], i) => {
    const y = TOP + i * ROW + 4;
    out.push(`<text x="${LEFT - 12}" y="${y + BAR + 5}" font-size="13" text-anchor="end">${label}</text>`);
    out.push(bar(y, opus, t.opus), bar(y + BAR + GAP, kit, t.kit));
    out.push(`<text x="${x(kit) + 6}" y="${y + BAR + GAP + 10}" font-size="12" font-weight="600">−${Math.round((1 - kit / opus) * 100)}%</text>`);
  });
  return out.join('\n') + '\n</svg>\n';
}

const dir = path.join(import.meta.dirname, 'img');
fs.mkdirSync(dir, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) fs.writeFileSync(path.join(dir, `custo-${name}.svg`), svg(t));
console.log(`docs/img/custo-{${Object.keys(THEMES)}}.svg`);
