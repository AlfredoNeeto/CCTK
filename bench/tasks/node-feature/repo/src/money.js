// Arredonda em centavos.
export const centavos = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
