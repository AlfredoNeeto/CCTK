// Generates the benchmark charts (light and dark SVG). Run: node docs/charts.mjs
// Numbers are copied here because bench/results/ is not in git:
// - TASKS: bench/results/2026-11-18T21-01-22-458Z/report.md (median per task, 3 runs per side);
// - FLOWS: the 26/11/2026 spec-flow round in bench/README.md (8 tasks, 3 runs each).
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
const FLOWS = [ // [arm, US$ per run, correct runs, out of]
  ['toolkit', 0.10, 22, 24],
  ['openspec', 0.51, 24, 24],
  ['tlc', 0.71, 24, 24],
];

const THEMES = { // validated with the dataviz palette validator (categorical slots 1-2, both modes)
  light: { kit: '#2a78d6', opus: '#eb6834', ink: '#1f2328', muted: '#59636e', grid: '#d1d9e0', bg: '#ffffff' },
  dark: { kit: '#3987e5', opus: '#d95926', ink: '#f0f6fc', muted: '#9198a1', grid: '#3d444d', bg: '#0d1117' },
};

const W = 760, LEFT = 190, RIGHT = 70;
const brl = (v, d = 2) => v.toFixed(d).replace('.', ',');
const pct = (opus, kit) => Math.round((1 - kit / opus) * 100);
const head = (h, label, t) => [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-label="${label}">`,
  `<style>text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;fill:${t.ink}}.m{fill:${t.muted}}</style>`,
];
// Legend swatches are round rects so the circles are only data. A dot with a surface-colored ring, so it stays readable where it touches the connector or another dot.
const dot = (cx, cy, fill, t, tip) => `<circle cx="${cx}" cy="${cy}" r="6" fill="${fill}" stroke="${t.bg}" stroke-width="2"><title>${tip}</title></circle>`;

// Dumbbell: one row per task, factory and kit cost joined by a line, sorted by saving.
function custo(t) {
  const TOP = 96, ROW = 34, MAX = 0.4;
  const H = TOP + TASKS.length * ROW + 30;
  const x = (v) => LEFT + (v / MAX) * (W - LEFT - RIGHT);
  const total = TASKS.reduce((s, [, o, k]) => [s[0] + o, s[1] + k], [0, 0]);
  const saved = pct(total[0], total[1]);
  const rows = [...TASKS].sort((a, b) => pct(b[1], b[2]) - pct(a[1], a[2]));
  const out = [
    ...head(H, `Custo por tarefa: o kit custou ${saved}% menos que o Claude Code de fábrica nas ${TASKS.length} tarefas`, t),
    `<text x="0" y="22" font-size="18" font-weight="600">Mesma tarefa, metade do custo</text>`,
    `<text x="0" y="44" font-size="13" class="m">Custo por tarefa em US$ (equivalente na API). Total: US$ ${brl(total[0])} → US$ ${brl(total[1])} (−${saved}%), 23/24 e 22/24 execuções corretas.</text>`,
    `<rect x="0" y="62" width="12" height="12" rx="6" fill="${t.kit}"/><text x="18" y="72.5" font-size="13">Com o kit (Sonnet)</text>`,
    `<rect x="160" y="62" width="12" height="12" rx="6" fill="${t.opus}"/><text x="178" y="72.5" font-size="13">Claude Code de fábrica (Opus)</text>`,
  ];
  for (let v = 0; v <= MAX + 1e-9; v += 0.1) {
    out.push(`<line x1="${x(v)}" x2="${x(v)}" y1="${TOP - 8}" y2="${H - 26}" stroke="${t.grid}" stroke-width="1"/>`);
    out.push(`<text x="${x(v)}" y="${H - 8}" font-size="12" class="m" text-anchor="middle">${v ? brl(v) : '0'}</text>`);
  }
  rows.forEach(([label, opus, kit], i) => {
    const cy = TOP + i * ROW + ROW / 2 - 8;
    out.push(`<text x="${LEFT - 14}" y="${cy + 4.5}" font-size="13" text-anchor="end">${label}</text>`);
    out.push(`<line class="d" x1="${x(kit)}" x2="${x(opus)}" y1="${cy}" y2="${cy}" stroke="${t.muted}" stroke-width="2"/>`);
    out.push(dot(x(opus), cy, t.opus, t, `${label}: de fábrica US$ ${brl(opus, 3)}`));
    out.push(dot(x(kit), cy, t.kit, t, `${label}: com o kit US$ ${brl(kit, 3)}`));
    out.push(`<text x="${x(opus) + 14}" y="${cy + 4.5}" font-size="12" font-weight="600">−${pct(opus, kit)}%</text>`);
  });
  return out.join('\n') + '\n</svg>\n';
}

// Cost x correct runs for the end-to-end spec flows: the same accuracy, several times the cost.
function fluxos(t) {
  const TOP = 112, PH = 150, MAX = 0.8, YMIN = 18, YMAX = 24;
  const H = TOP + PH + 44;
  const x = (v) => LEFT - 120 + (v / MAX) * (W - LEFT + 120 - RIGHT);
  const y = (n) => TOP + PH - ((n - YMIN) / (YMAX - YMIN)) * PH;
  const desc = FLOWS.map(([a, c, ok, of]) => `${a} US$ ${brl(c)} com ${ok}/${of}`).join(', ');
  const out = [
    ...head(H, `Fluxos de spec, custo por execução e acerto: ${desc}. Os fluxos acertaram tudo por 5 a 7 vezes o custo`, t),
    `<text x="0" y="22" font-size="18" font-weight="600">Fluxo de spec sem revisão: acerto um pouco maior, custo 5 a 7×</text>`,
    `<text x="0" y="44" font-size="13" class="m">8 tarefas de edição, 3 execuções cada (26/11/2026). Sem ninguém revisando a spec; o eixo vertical começa em ${YMIN}.</text>`,
    `<text x="0" y="64" font-size="13" class="m">Com n=24, a diferença de acerto pode ser acaso (Fisher p≈0,49).</text>`,
  ];
  for (let n = YMIN; n <= YMAX; n += 2) {
    out.push(`<line x1="${x(0)}" x2="${x(MAX)}" y1="${y(n)}" y2="${y(n)}" stroke="${t.grid}" stroke-width="1"/>`);
    out.push(`<text x="${x(0) - 10}" y="${y(n) + 4}" font-size="12" class="m" text-anchor="end">${n}/24</text>`);
  }
  for (let v = 0; v <= MAX + 1e-9; v += 0.2) {
    out.push(`<text x="${x(v)}" y="${TOP + PH + 20}" font-size="12" class="m" text-anchor="middle">${v ? `US$ ${brl(v)}` : '0'}</text>`);
  }
  out.push(`<text x="${x(MAX)}" y="${TOP + PH + 38}" font-size="12" class="m" text-anchor="end">custo por execução →</text>`);
  out.push(`<text x="0" y="${TOP - 18}" font-size="12" class="m">execuções corretas</text>`);
  for (const [arm, cost, ok, of] of FLOWS) {
    const cx = x(cost), cy = y(ok);
    out.push(dot(cx, cy, t.kit, t, `${arm}: US$ ${brl(cost)} por execução, ${ok}/${of} corretas`));
    out.push(`<text x="${cx}" y="${cy - 28}" font-size="13" font-weight="600" text-anchor="middle">${arm}</text>`);
    out.push(`<text x="${cx}" y="${cy - 13}" font-size="12" text-anchor="middle">US$ ${brl(cost)} · ${ok}/${of}</text>`);
  }
  return out.join('\n') + '\n</svg>\n';
}

const dir = path.join(import.meta.dirname, 'img');
fs.mkdirSync(dir, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  fs.writeFileSync(path.join(dir, `custo-${name}.svg`), custo(t));
  fs.writeFileSync(path.join(dir, `fluxos-${name}.svg`), fluxos(t));
}
console.log(`docs/img/{custo,fluxos}-{${Object.keys(THEMES)}}.svg`);
