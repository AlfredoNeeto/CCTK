// Generates the benchmark charts (light and dark SVG). Run: node docs/charts.mjs
// Numbers are copied here because bench/results/ is not in git:
// - TASKS: bench/results/2026-11-18T21-01-22-458Z/report.md (median per task, 3 runs per side);
// - FLOWS: the 26/11/2026 spec-flow round in bench/README.md (8 tasks, 3 runs each);
// - EXPERIMENTS and VERSIONS: bench/README.md, "Resultados (19/11/2026)" (test F14 checks each number is there).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// [label, metric, % vs its base, numbers as written in bench/README.md (base, arm in US$ when two), in the kit?]
// "por execução" with a US$ pair is the sum of the per-task medians, as the bench reports print it.
export const EXPERIMENTS = [
  ['/effort high com muitas regras', 'por acerto', -38, ['0,34', '0,21'], true], // "O que tem ganho medido"
  ['Advisor (consulta ao Opus)', 'por acerto', -34, ['0,156', '0,103'], true], // "O que tem ganho medido"
  ['Seção Dimensões no proposal*', 'por execução', 10, ['+10% por execução'], true], // "Dimensões de regra implícita"
  ['Subagente de busca (Haiku)', 'por acerto', 2, ['0,124', '0,127'], false], // "O que não mostrou ganho"
  ['Plugins LSP', 'por acerto', 11, ['subiu 11%'], false], // "O que não mostrou ganho"
  ['Regras implícitas (skill)', 'por execução', 21, ['+21% como skill'], false], // "O que não mostrou ganho"
  ['Dimensões em toda a spec', 'por execução', 23, ['+23% por execução'], false], // "Dimensões de regra implícita"
  ['Regras implícitas (CLAUDE.md)', 'por execução', 45, ['+45% por execução'], false], // "O que não mostrou ganho"
  // The table rounds to 0,124 -> 0,184 (+48%); the unrounded run costs give +49%, which is what the bench prose says.
  ['Pedir o Explore', 'por acerto', 49, ['~49% mais por acerto'], false], // "O que não mostrou ganho"
  ['Teste antes do código', 'por execução', 58, ['0,444', '0,701'], false], // "O que não mostrou ganho"
  ['OpenSpec em toda tarefa', 'por acerto', 353, ['0,113', '0,512'], false], // "Fluxos de spec de ponta a ponta"
  ['tlc-spec-lean em toda tarefa', 'por acerto', 527, ['0,113', '0,709'], false], // "Fluxos de spec de ponta a ponta"
  ['Protótipo ao código', 'por acerto', -16, ['0,264', '0,221'], true], // "Protótipo ao código e testes HTTP"
  ['Testes HTTP no check*', 'por acerto', -3, ['0,152', '0,148'], true], // "Protótipo ao código e testes HTTP"
  ['Revisão de segurança no Sonnet*', 'por acerto', 5, ['0,113', '0,119'], true], // "Custo do security-guidance"
  ['Revisão de segurança no Opus', 'por acerto', 11, ['0,113', '0,125'], false], // "Custo do security-guidance"
];
// [version, total US$, correct runs, runs] on the same 24 tasks: "Regressão da 1.4.0" (without security-commit-secret,
// which 1.4.0 added), "Regressão da 1.1.1" and "Rodadas anteriores".
export const VERSIONS = [
  ['1.0.2', 4.80, 46, 48],
  ['1.1.0', 3.98, 46, 48],
  ['1.1.1', 4.03, 48, 48],
  ['1.4.0', 5.21, 47, 48],
];

// kit and opus pass the dataviz palette validator (categorical slots 1-2, both modes). muted is the grey for "ficou de
// fora": against kit it passes contrast and CVD separation and fails only the chroma floor, on purpose (it is context).
export const THEMES = {
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

// Diverging bars: each decided experiment's cost change against its own base; blue entered the kit, grey stayed out.
// shortcut: the axis stops at +100%, so the two spec flows (+353%, +527%) are drawn clipped with their value written.
function experimentos(t) {
  const TOP = 126, ROW = 28, MIN = -80, MAX = 100, L = 320;
  const H = TOP + EXPERIMENTS.length * ROW + 34;
  const x = (v) => L + ((Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN)) * (W - L - 60);
  const rows = [...EXPERIMENTS].sort((a, b) => a[2] - b[2]);
  const sign = (v) => (v < 0 ? `−${-v}%` : `+${v}%`);
  const kept = EXPERIMENTS.filter((e) => e[4]).length;
  const out = [
    ...head(H, `Variação de custo de ${EXPERIMENTS.length} mudanças testadas no benchmark, cada uma contra a sua base: ${kept} entraram no kit (custo menor ou até +10%; a seção Dimensões, os testes HTTP e a revisão de segurança entraram sem ganho de acerto medido, por argumento ou como trava), ${EXPERIMENTS.length - kept} ficaram de fora por custar de 2% a 527% a mais sem um ganho de acerto que se sustentasse`, t),
    `<text x="0" y="22" font-size="18" font-weight="600">O que entrou no kit e o que ficou de fora</text>`,
    `<text x="0" y="44" font-size="13" class="m">Variação de custo de cada mudança testada contra a sua base; a métrica está no rótulo. Entra o que acerta mais com</text>`,
    `<text x="0" y="62" font-size="13" class="m">até +15% de custo por acerto, ou o que acerta o mesmo por menos. OpenSpec e tlc passam da escala.</text>`,
    `<text x="0" y="80" font-size="13" class="m">* Entrou sem ganho de acerto medido: por argumento (Dimensões) ou como trava (testes HTTP, revisão de segurança).</text>`,
    `<rect x="0" y="96" width="12" height="12" rx="2" fill="${t.kit}"/><text x="18" y="106.5" font-size="13">Entrou no kit</text>`,
    `<rect x="120" y="96" width="12" height="12" rx="2" fill="${t.muted}"/><text x="138" y="106.5" font-size="13">Ficou de fora</text>`,
  ];
  for (let v = MIN; v <= MAX; v += 20) {
    out.push(`<line x1="${x(v)}" x2="${x(v)}" y1="${TOP - 6}" y2="${H - 26}" stroke="${t.grid}" stroke-width="${v ? 1 : 2}"/>`);
    out.push(`<text x="${x(v)}" y="${H - 8}" font-size="12" class="m" text-anchor="middle">${v ? sign(v) : '0'}</text>`);
  }
  rows.forEach(([label, metric, v, , kit], i) => {
    const cy = TOP + i * ROW + ROW / 2 - 4;
    const x0 = x(Math.min(0, v)), x1 = x(Math.max(0, v));
    out.push(`<text class="l" x="${L - 12}" y="${cy + 4.5}" font-size="12.5" text-anchor="end">${label}, ${metric}</text>`);
    out.push(`<rect class="b" x="${x0}" y="${cy - 8}" width="${Math.max(2, x1 - x0)}" height="16" rx="2" fill="${kit ? t.kit : t.muted}"><title>${label}: ${sign(v)} ${metric}</title></rect>`);
    out.push(`<text class="v" x="${v < 0 ? x0 - 6 : x1 + 6}" y="${cy + 4.5}" font-size="12" font-weight="600"${v < 0 ? ' text-anchor="end"' : ''}>${sign(v)}</text>`);
  });
  return out.join('\n') + '\n</svg>\n';
}

// One dot per regression round of the full kit: cost per run, with the correct runs written on each.
function versoes(t) {
  const TOP = 96, PH = 140, MAX = 0.16, L = 70, PAD = 70;
  const H = TOP + PH + 44;
  const step = (W - L - RIGHT - 2 * PAD) / (VERSIONS.length - 1);
  const x = (i) => L + PAD + i * step;
  const y = (v) => TOP + PH - (v / MAX) * PH;
  const per = VERSIONS.map(([, total, , runs]) => total / runs);
  const desc = VERSIONS.map(([v, , ok, runs], i) => `${v} US$ ${brl(per[i])} com ${ok}/${runs}`).join(', ');
  const out = [
    ...head(H, `Regressão por versão do kit, custo por execução e acerto: ${desc}`, t),
    `<text x="0" y="22" font-size="18" font-weight="600">Entre versões: 96% a 100% de acerto, US$ 0,08 a 0,11 por execução</text>`,
    `<text x="0" y="44" font-size="13" class="m">Kit completo nas mesmas 24 tarefas, 2 execuções cada (a security-commit-secret, que entrou na 1.4.0, fica de fora).</text>`,
    `<text x="0" y="62" font-size="13" class="m">Custo por execução em US$ (equivalente na API); acima de cada ponto, as execuções 100% corretas.</text>`,
  ];
  for (let v = 0; v <= MAX + 1e-9; v += 0.04) {
    out.push(`<line x1="${L}" x2="${W - RIGHT}" y1="${y(v)}" y2="${y(v)}" stroke="${t.grid}" stroke-width="1"/>`);
    out.push(`<text x="${L - 10}" y="${y(v) + 4}" font-size="12" class="m" text-anchor="end">${v ? brl(v) : '0'}</text>`);
  }
  out.push(`<polyline points="${per.map((v, i) => `${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${t.kit}" stroke-width="2"/>`);
  VERSIONS.forEach(([v, , ok, runs], i) => {
    out.push(dot(x(i), y(per[i]), t.kit, t, `${v}: US$ ${brl(per[i], 3)} por execução, ${ok}/${runs} corretas`));
    out.push(`<text x="${x(i)}" y="${y(per[i]) - 14}" font-size="12" font-weight="600" text-anchor="middle">US$ ${brl(per[i])} · ${ok}/${runs}</text>`);
    out.push(`<text x="${x(i)}" y="${TOP + PH + 22}" font-size="13" text-anchor="middle">${v}</text>`);
  });
  return out.join('\n') + '\n</svg>\n';
}

// Writes only when run directly, so the tests can import the data without regenerating.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.join(import.meta.dirname, 'img');
  fs.mkdirSync(dir, { recursive: true });
  const charts = { custo, fluxos, experimentos, versoes };
  for (const [name, t] of Object.entries(THEMES)) {
    for (const [chart, draw] of Object.entries(charts)) fs.writeFileSync(path.join(dir, `${chart}-${name}.svg`), draw(t));
  }
  console.log(`docs/img/{${Object.keys(charts)}}-{${Object.keys(THEMES)}}.svg`);
}
