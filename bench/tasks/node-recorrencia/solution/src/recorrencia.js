// Ocorrências de um evento recorrente (agenda de cobranças).
const DIA = 86400000;
const num = (iso) => Date.parse(`${iso}T00:00:00Z`) / DIA;
const iso = (n) => new Date(n * DIA).toISOString().slice(0, 10);
const dow = (n) => new Date(n * DIA).getUTCDay();
const segunda = (n) => n - ((dow(n) + 6) % 7);
const ultimoDia = (ano, mes) => new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
const MARGEM = 31; // o ajuste para dia útil pode trazer para a janela datas de fora dela

export function gerarOcorrencias(regra, de, ate) {
  const { freq, intervalo = 1, excecoes = [], feriados = [], ajuste = 'nenhum' } = regra;
  if (!['semanal', 'mensal'].includes(freq)) throw new RangeError('freq inválida');
  if (!Number.isInteger(intervalo) || intervalo < 1) throw new RangeError('intervalo inválido');
  if (!['nenhum', 'proximo', 'anterior'].includes(ajuste)) throw new RangeError('ajuste inválido');
  if (regra.dia !== undefined && regra.ordinal !== undefined) throw new RangeError('dia e ordinal juntos');
  if (regra.dia !== undefined && (!Number.isInteger(regra.dia) || regra.dia === 0 || regra.dia < -1 || regra.dia > 31)) throw new RangeError('dia inválido');
  if (regra.ordinal && (![1, 2, 3, 4, 5, -1].includes(regra.ordinal.n) || !(regra.ordinal.diaSemana >= 0 && regra.ordinal.diaSemana <= 6))) {
    throw new RangeError('ordinal inválido');
  }

  const inicio = num(regra.inicio);
  const limite = Math.min(regra.fim ? num(regra.fim) : Infinity, num(ate) + MARGEM);
  const vezes = regra.vezes ?? Infinity;
  const padrao = [];
  const aceita = (d) => { if (d >= inicio && d <= limite && padrao.length < vezes) padrao.push(d); };

  if (freq === 'semanal') {
    const dias = regra.diasSemana ?? [dow(inicio)];
    const sem0 = segunda(inicio);
    for (let d = inicio; d <= limite && padrao.length < vezes; d++) {
      if (dias.includes(dow(d)) && ((segunda(d) - sem0) / 7) % intervalo === 0) aceita(d);
    }
  } else {
    const ini = new Date(inicio * DIA);
    for (let m = 0; ; m += intervalo) {
      const ano = ini.getUTCFullYear() + Math.floor((ini.getUTCMonth() + m) / 12);
      const mes = (ini.getUTCMonth() + m) % 12;
      if (Date.UTC(ano, mes, 1) / DIA > limite || padrao.length >= vezes) break;
      const fim = ultimoDia(ano, mes);
      let d;
      if (regra.ordinal) {
        const { n, diaSemana } = regra.ordinal;
        if (n === -1) {
          const u = Date.UTC(ano, mes, fim) / DIA;
          d = u - ((dow(u) - diaSemana + 7) % 7);
        } else {
          const p = Date.UTC(ano, mes, 1) / DIA;
          d = p + ((diaSemana - dow(p) + 7) % 7) + (n - 1) * 7;
          if (new Date(d * DIA).getUTCMonth() !== mes) continue; // o mês não tem o n-ésimo
        }
      } else {
        const dia = regra.dia ?? ini.getUTCDate();
        d = Date.UTC(ano, mes, dia === -1 ? fim : Math.min(dia, fim)) / DIA;
      }
      aceita(d);
    }
  }

  const util = (d) => ![0, 6].includes(dow(d)) && !feriados.includes(iso(d));
  const passo = { proximo: 1, anterior: -1 }[ajuste];
  const datas = new Set();
  for (const p of padrao) {
    if (excecoes.includes(iso(p))) continue;
    let d = p;
    if (passo) while (!util(d)) d += passo;
    if (d >= num(de) && d <= num(ate)) datas.add(d);
  }
  return [...datas].sort((a, b) => a - b).map(iso);
}
