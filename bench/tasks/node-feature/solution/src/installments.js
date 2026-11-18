import { centavos } from './money.js';

export function parcelar(valor, parcelas) {
  if (!(valor > 0)) throw new RangeError('valor deve ser maior que zero');
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12) throw new RangeError('parcelas de 1 a 12');
  const i = 0.0199;
  const bruta = parcelas <= 3 ? valor / parcelas : (valor * i) / (1 - (1 + i) ** -parcelas);
  const parcela = centavos(bruta);
  if (parcela < 20) throw new RangeError('parcela mínima de R$ 20,00');
  return { parcela, total: centavos(parcela * parcelas) };
}
