// `claude-toolkit stats`: real usage from the local transcripts (~/.claude/projects) and the check-gate log.
// Everything stays local: nothing is sent anywhere.
import fs from 'node:fs';
import path from 'node:path';

const DAY = 86400000;

// Monday of the UTC week, as YYYY-MM-DD.
export const weekOf = (ts) => {
  const d = new Date(ts);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7))).toISOString().slice(0, 10);
};

const jsonl = (file) => {
  const out = [];
  for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
    try { if (l) out.push(JSON.parse(l)); } catch { /* partial line from a session still writing */ }
  }
  return out;
};

const files = (dir, test, since) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }) : [])
  .map((f) => path.join(dir, f))
  .filter((f) => test(f) && fs.statSync(f).mtimeMs >= since);

// One entry per API message: a message spans several transcript lines that repeat its usage, so dedupe by id.
export function readMessages(projectsDir, since) {
  const byId = new Map();
  for (const f of files(projectsDir, (x) => x.endsWith('.jsonl'), since)) {
    const sub = f.split(path.sep).includes('subagents');
    for (const e of jsonl(f)) {
      const m = e.type === 'assistant' && e.message;
      if (!m?.usage || !m.model || m.model === '<synthetic>' || Date.parse(e.timestamp) < since) continue;
      byId.set(m.id || e.uuid, { ts: e.timestamp, session: e.sessionId, model: m.model, sub, usage: m.usage });
    }
  }
  return [...byId.values()];
}

export function readGate(pluginDataDir, since) {
  return files(pluginDataDir, (x) => path.basename(x) === 'gate.log', since)
    .flatMap(jsonl).filter((e) => Date.parse(e.ts) >= since);
}

export function summarize(messages, gate) {
  const weeks = {};
  const week = (ts) => (weeks[weekOf(ts)] ??= {
    sessions: new Set(), input: 0, cacheWrite: 0, cacheRead: 0, output: 0, models: {}, sessionModels: {},
    gateFail: 0, gateCaught: 0, gateGiveup: 0,
  });
  for (const m of messages) {
    const w = week(m.ts);
    const u = m.usage;
    w.input += u.input_tokens || 0;
    w.cacheWrite += u.cache_creation_input_tokens || 0;
    w.cacheRead += u.cache_read_input_tokens || 0;
    w.output += u.output_tokens || 0;
    w.models[m.model] = (w.models[m.model] || 0) + (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.output_tokens || 0);
    if (!m.sub) { // subagents run on their own model by design: not a mid-session switch
      w.sessions.add(m.session);
      (w.sessionModels[m.session] ??= new Set()).add(m.model);
    }
  }
  // Caught = the gate blocked a stop and, later in the same session, the check passed.
  const bySession = {};
  for (const e of [...gate].sort((a, b) => a.ts.localeCompare(b.ts))) (bySession[e.session] ??= []).push(e);
  for (const evs of Object.values(bySession)) {
    for (const e of evs) {
      const w = week(e.ts);
      if (e.result === 'fail') w.gateFail++;
      if (e.result === 'giveup') w.gateGiveup++;
    }
    const firstFail = evs.findIndex((e) => e.result === 'fail');
    if (firstFail >= 0 && evs.slice(firstFail).some((e) => e.result === 'pass')) week(evs[firstFail].ts).gateCaught++;
  }
  return Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).map(([start, w]) => ({
    week: start,
    sessions: w.sessions.size,
    fresh: w.input + w.cacheWrite + w.output,
    cacheRead: w.cacheRead,
    cacheHit: w.cacheRead / (w.input + w.cacheWrite + w.cacheRead || 1),
    models: w.models,
    switches: Object.values(w.sessionModels).filter((s) => s.size > 1).length,
    gate: { fail: w.gateFail, caught: w.gateCaught, giveup: w.gateGiveup },
  }));
}

export function stats(p, days = 28) {
  const since = Date.now() - days * DAY;
  return summarize(readMessages(path.join(p.claude, 'projects'), since), readGate(path.join(p.claude, 'plugins', 'data'), since));
}

const n = (x) => Math.round(x).toLocaleString('pt-BR');
const short = (model) => model.replace(/^claude-/, '').replace(/-\d+(-\d+)*$/, '');
const opusShare = (w) => {
  const total = Object.values(w.models).reduce((s, x) => s + x, 0);
  return total ? Object.entries(w.models).filter(([m]) => /opus/i.test(m)).reduce((s, [, x]) => s + x, 0) / total : 0;
};

export function format(weeks, days) {
  if (!weeks.length) return `Nenhuma sessão nos últimos ${days} dias.`;
  const lines = [`Uso dos últimos ${days} dias (transcrições locais em ~/.claude/projects; nada sai da máquina)`, ''];
  for (const w of weeks) {
    const total = Object.values(w.models).reduce((s, x) => s + x, 0) || 1;
    const mix = Object.entries(w.models).sort((a, b) => b[1] - a[1]).map(([m, x]) => `${short(m)} ${Math.round((x / total) * 100)}%`).join(', ');
    lines.push(`Semana de ${w.week.split('-').reverse().join('/')}`,
      `  Sessões: ${w.sessions} · tokens sem cache: ${n(w.fresh)} · releitura de cache: ${n(w.cacheRead)} (${Math.round(w.cacheHit * 100)}% da entrada)`,
      `  Modelos (tokens sem cache): ${mix}`,
      ...(opusShare(w) > 0.3 ? [`  ⚠ ${Math.round(opusShare(w) * 100)}% no Opus. No benchmark, a mesma tarefa no Sonnet custou cerca de metade, ` +
        'com a mesma qualidade. Use o Opus só para planejar (claude --model opus).'] : []),
      `  Sessões com troca de modelo no meio: ${w.switches}${w.switches ? ' (cada troca relê a conversa sem o desconto do cache)' : ''}`,
      `  Check-gate: ${w.gate.fail} bloqueios, ${w.gate.caught} sessões em que o Claude corrigiu e o check passou, ${w.gate.giveup} desistências`, '');
  }
  return lines.join('\n');
}
