// Encargos por pagamento em atraso (multa e juros de mora).
const DIA = 86400000;
const dia = (iso) => Date.parse(`${iso}T00:00:00Z`) / DIA; // UTC: getDay() local erraria o dia da semana
const iso = (n) => new Date(n * DIA).toISOString().slice(0, 10);

export function calcularAtraso({ valor, vencimento, pagamento, multaPct, jurosMesPct, feriados = [] }) {
  if (!Number.isFinite(valor) || valor <= 0) throw new RangeError('valor inválido');
  const vc = Math.round(valor * 100);
  if (Math.abs(valor * 100 - vc) > 1e-6) throw new RangeError('valor com mais de 2 casas');
  if (!Number.isFinite(multaPct) || multaPct < 0 || multaPct > 2) throw new RangeError('multa fora do limite');
  if (!Number.isFinite(jurosMesPct) || jurosMesPct < 0 || jurosMesPct > 1) throw new RangeError('juros fora do limite');

  const venc = dia(vencimento);
  const pag = dia(pagamento);
  const util = (n) => ![0, 6].includes(new Date(n * DIA).getUTCDay()) && !feriados.includes(iso(n));
  let prazo = venc;
  while (!util(prazo)) prazo++;
  if (pag <= prazo) return { diasAtraso: 0, multa: 0, juros: 0, total: vc / 100 };

  const diasAtraso = pag - venc;
  const multa = Math.round((vc * multaPct) / 100);
  const juros = Math.round((vc * jurosMesPct * diasAtraso) / 3000);
  return { diasAtraso, multa: multa / 100, juros: juros / 100, total: (vc + multa + juros) / 100 };
}
