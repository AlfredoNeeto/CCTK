// Leitura da linha digitável de boleto bancário (Febraban).
const DIA = 86400000;
const addDias = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DIA).toISOString().slice(0, 10);
const dias = (a, b) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DIA;

export function mod10(num) {
  let s = 0;
  for (let i = num.length - 1, w = 2; i >= 0; i--, w = 3 - w) {
    const p = Number(num[i]) * w;
    s += p > 9 ? p - 9 : p;
  }
  return (10 - (s % 10)) % 10;
}

export function mod11(num) {
  let s = 0;
  for (let i = num.length - 1, w = 2; i >= 0; i--, w = w === 9 ? 2 : w + 1) s += Number(num[i]) * w;
  const dv = 11 - (s % 11);
  return dv === 0 || dv >= 10 ? 1 : dv;
}

export function lerBoleto(linha, hoje) {
  const d = String(linha ?? '').replace(/[.\s]/g, '');
  if (!/^\d{47}$/.test(d)) throw new Error('tamanho inválido');
  const campos = [d.slice(0, 10), d.slice(10, 21), d.slice(21, 32)];
  campos.forEach((c, i) => {
    if (mod10(c.slice(0, -1)) !== Number(c.at(-1))) throw new Error(`DV do campo ${i + 1} inválido`);
  });
  const fator = d.slice(33, 37);
  const livre = campos[0].slice(4, 9) + campos[1].slice(0, 10) + campos[2].slice(0, 10);
  const codigoBarras = d.slice(0, 4) + d[32] + d.slice(33, 47) + livre;
  if (mod11(codigoBarras.slice(0, 4) + codigoBarras.slice(5)) !== Number(codigoBarras[4])) throw new Error('DV geral inválido');
  if (d[3] !== '9') throw new Error('moeda inválida');

  let vencimento = null;
  if (fator !== '0000') {
    const f = Number(fator);
    if (f < 1000) throw new Error('fator de vencimento inválido');
    const antigo = addDias('1997-10-07', f);
    const novo = addDias('2025-02-22', f - 1000);
    vencimento = dias(novo, hoje) <= dias(antigo, hoje) ? novo : antigo;
  }
  return { banco: d.slice(0, 3), vencimento, valor: Number(d.slice(37, 47)) / 100, codigoBarras };
}
