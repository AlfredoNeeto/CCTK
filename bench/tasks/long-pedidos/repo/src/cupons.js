// Cupons: percentual (valor em %) ou fixo (valor em centavos); minimo = subtotal mínimo em centavos.
const cupons = new Map([
  ['BEMVINDO10', { tipo: 'percentual', valor: 10, minimo: 10000 }],
  ['VIP25', { tipo: 'percentual', valor: 25, minimo: 30000 }],
  ['DESC50', { tipo: 'fixo', valor: 5000, minimo: 0 }],
]);

export function cupom(codigo) {
  const c = cupons.get(codigo);
  if (!c) throw new Error(`Cupom ${codigo} inválido`);
  return { codigo, ...c };
}
