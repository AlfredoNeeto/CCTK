// Frete em centavos: valor base até 1 kg, mais um adicional por kg (ou fração) acima de 1 kg.
const regiao = { SP: 'sudeste', RJ: 'sudeste', MG: 'sudeste', ES: 'sudeste', PR: 'sul', SC: 'sul', RS: 'sul' };
const tabela = { sudeste: [1500, 500], sul: [1800, 600], demais: [2500, 900] };

export function calcular(uf, pesoGramas) {
  const [base, porKg] = tabela[regiao[uf] ?? 'demais'];
  const kgExtras = Math.max(0, Math.ceil((pesoGramas - 1000) / 1000));
  return base + kgExtras * porKg;
}

export const freteDoPedido = (uf, pesoGramas, subtotal) => (subtotal >= 30000 ? 0 : calcular(uf, pesoGramas));
