// Valores em centavos (inteiros) em toda a loja.
export const formatar = (centavos) => `R$ ${(centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const percentual = (centavos, pct) => Math.round((centavos * pct) / 100);
