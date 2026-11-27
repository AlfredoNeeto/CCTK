import { percentual } from './dinheiro.js';
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

// O desconto nunca passa do subtotal: o total não fica abaixo do frete.
export function desconto(codigo, subtotal) {
  const c = cupom(codigo);
  if (subtotal < c.minimo) throw new Error(`O cupom ${codigo} exige subtotal mínimo`);
  return Math.min(subtotal, c.tipo === 'percentual' ? percentual(subtotal, c.valor) : c.valor);
}
