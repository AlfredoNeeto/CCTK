// Soma valores em centavos para evitar erro de ponto flutuante.
export function soma(...valores) {
  return valores.reduce((s, v) => s + Math.round(v * 100), 0) / 100;
}
