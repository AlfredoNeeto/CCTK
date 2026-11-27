// What the bench reads outside the Claude result (.specs/features/bench-cota): the security-guidance log of a run and
// the text of `/usage`. Kept apart from run.mjs, which runs on import, so the tests can call them.

// security-guidance writes one "Review usage: ... model=<id> ... est_cost_usd=<n>" line per finished review, and
// "Stop hook: reviewing N changed files" when the end-of-reply review starts. In -p, a review still running at
// teardown is cancelled (code.claude.com/docs/en/hooks), so a start with no stop usage line counts as incomplete.
export function sgUsage(text = '') {
  const lines = text.split(/\r?\n/);
  const usage = lines.filter((l) => l.includes('Review usage:'));
  const cost = usage.reduce((s, l) => s + Number(l.match(/est_cost_usd=([\d.]+)/)?.[1] || 0), 0);
  const models = [...new Set(usage.map((l) => l.match(/\bmodel=(\S+)/)?.[1]).filter(Boolean))];
  const started = lines.filter((l) => l.includes('Stop hook: reviewing')).length;
  const stopped = usage.filter((l) => /\breview=stop\b/.test(l)).length;
  return { cost: Math.round(cost * 1e6) / 1e6, models, reviews: usage.length, incomplete: Math.max(0, started - stopped) };
}

// `claude -p "/usage"` prints "Current session: 45% used · resets <when>" and "Current week (all models): 34% used · ...".
export function parseUsage(text = '') {
  const read = (re) => { const m = text.match(re); return m && { pct: Number(m[1]), resets: (m[2] || '').trim() }; };
  const session = read(/Current session:\s*(\d+)% used(?:\s*·\s*resets ([^\n]+))?/);
  const week = read(/Current week \(all models\):\s*(\d+)% used(?:\s*·\s*resets ([^\n]+))?/);
  return session && week ? { session, week } : null;
}

// "Nov 27, 8:19pm (America/Cuiaba)" or "Dec 4, 3pm (...)" as minutes in a year, to compare two readings; null if unreadable.
const MESES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export function minutos(texto = '') {
  const m = texto.match(/^(\w{3})\w*\s+(\d{1,2}),\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  const mes = m && MESES.indexOf(m[1].toLowerCase());
  if (!m || mes < 0) return null;
  const h = (Number(m[3]) % 12) + (m[5].toLowerCase() === 'pm' ? 12 : 0);
  return ((mes * 31 + Number(m[2])) * 24 + h) * 60 + Number(m[4] || 0);
}

// US$ per 1% of each window, or why that window can't be used. `cost` is everything the round spent.
export function quota(before, after, cost) {
  const out = {};
  for (const k of ['session', 'week']) {
    const delta = after[k].pct - before[k].pct;
    // /usage rounds the reset time ("8:19pm" then "8:20pm", "2:59pm" then "3pm"): only a jump of more than 30 min, or
    // usage going down, is a real reset. An unreadable time falls back to comparing the text.
    const a = minutos(before[k].resets), b = minutos(after[k].resets);
    const reiniciou = delta < 0 || (a !== null && b !== null ? Math.abs(b - a) > 30 : before[k].resets !== after[k].resets);
    if (reiniciou) out[k] = { invalid: 'a janela reiniciou durante a rodada' };
    else if (delta <= 0) out[k] = { invalid: 'a cota não se moveu: a rodada foi pequena demais para medir' };
    else out[k] = { delta, perPct: cost / delta };
  }
  return out;
}
