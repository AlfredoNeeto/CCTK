// Status line: model (warning on Opus) | context used | 5h and 7-day plan usage with reset time.
let raw = '';
process.stdin.on('data', (d) => (raw += d)).on('end', () => {
  let j = {};
  try { j = JSON.parse(raw); } catch {}
  const pct = (v) => `${Math.round(v)}%${v >= 80 ? '!' : ''}`;
  const when = (v, long) => {
    const d = typeof v === 'number' ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v);
    if (isNaN(d)) return '';
    const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return long ? `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hm}` : hm;
  };
  // Opus costs more than Sonnet for the same task (about 2x in API dollars in bench/; the Pro quota weight is undocumented).
  const opus = /opus/i.test(`${j.model?.id || ''} ${j.model?.display_name || ''}`);
  const parts = [j.model?.display_name && `${j.model.display_name}${opus ? ' ⚠ mais caro' : ''}`];
  if (j.context_window?.used_percentage != null) parts.push(`ctx ${pct(j.context_window.used_percentage)}`);
  // Share of this session's input read from cache (0..1, Claude Code 2.1.251+). Cold = past the cache TTL: the next
  // message re-sends the whole conversation at full price.
  const c = j.prompt_cache;
  if (c?.hit_ratio != null) parts.push(`cache ${Math.round(c.hit_ratio * 100)}%${c.warm === false ? ' frio' : ''}`);
  for (const [key, label, long] of [['five_hour', '5h', false], ['seven_day', '7d', true]]) {
    const r = j.rate_limits?.[key];
    if (r?.used_percentage == null) continue;
    const reset = r.resets_at ? when(r.resets_at, long) : '';
    parts.push(`${label} ${pct(r.used_percentage)}${reset ? ` (reset ${reset})` : ''}`);
  }
  process.stdout.write(parts.filter(Boolean).join(' | '));
});
