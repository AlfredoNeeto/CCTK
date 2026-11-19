// Conciliação do extrato bancário com os títulos a receber.
const DIA = 86400000;
const num = (iso) => Date.parse(`${iso}T00:00:00Z`) / DIA;

function centavos(v) {
  const c = Math.round(v * 100);
  if (!Number.isFinite(v) || v <= 0 || Math.abs(v * 100 - c) > 1e-6) throw new RangeError(`valor inválido: ${v}`);
  return c;
}

export function conciliar(lancamentos, titulos) {
  for (const lista of [lancamentos, titulos]) {
    if (new Set(lista.map((x) => x.id)).size !== lista.length) throw new Error('id repetido');
  }
  const ls = lancamentos.map((l) => ({ ...l, c: centavos(l.valor), d: num(l.data) }))
    .sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const ts = titulos.map((t) => ({ ...t, c: centavos(t.valor), v: num(t.vencimento) }))
    .sort((a, b) => a.v - b.v || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)); // vencimento, depois id
  const aberto = new Set(ts);
  const semPar = new Set(ls);
  const conciliados = [];
  const janela = (l, t) => l.d >= t.v - 5 && l.d <= t.v + 30;
  const fecha = (l, tit, tipo, diferenca) => {
    for (const t of tit) aberto.delete(t);
    semPar.delete(l);
    conciliados.push({ lancamento: l.id, titulos: tit.map((t) => t.id), tipo, diferenca });
  };

  for (const l of ls) { // 1: valor exato, vencimento mais próximo
    const cands = [...aberto].filter((t) => t.c === l.c && janela(l, t));
    if (!cands.length) continue;
    // ts já está em (vencimento, id): o primeiro com a menor distância desempata pelo mais antigo e pelo menor id
    const melhor = cands.reduce((m, t) => (Math.abs(t.v - l.d) < Math.abs(m.v - l.d) ? t : m));
    fecha(l, [melhor], 'exato', 0);
  }
  for (const l of [...semPar]) { // 2: pago com acréscimo de até 10%, título vencido
    const t = [...aberto].find((x) => janela(l, x) && l.d > x.v && l.c > x.c && l.c * 100 <= x.c * 110);
    if (t) fecha(l, [t], 'acrescimo', (l.c - t.c) / 100);
  }
  for (const l of [...semPar]) { // 3: dois títulos do mesmo cliente somando o valor
    const abertos = [...aberto].filter((t) => janela(l, t));
    let par;
    for (let i = 0; i < abertos.length && !par; i++) {
      for (let j = i + 1; j < abertos.length && !par; j++) {
        if (abertos[i].cliente === abertos[j].cliente && abertos[i].c + abertos[j].c === l.c) par = [abertos[i], abertos[j]];
      }
    }
    if (par) fecha(l, par, 'agrupado', 0);
  }
  return {
    conciliados,
    lancamentosSemPar: [...semPar].map((l) => l.id),
    titulosEmAberto: [...aberto].map((t) => t.id),
  };
}
