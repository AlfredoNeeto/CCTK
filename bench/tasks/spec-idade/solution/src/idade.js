// Idade dos clientes (cadastro).
export function idade(nascimento, hoje) {
  const re = /^(\d{4})-(\d{2})-(\d{2})$/;
  const [n, h] = [nascimento, hoje].map((s) => re.exec(s)?.slice(1).map(Number));
  if (!n || !h) throw new RangeError('data inválida');
  if (nascimento > hoje) throw new RangeError('nascimento no futuro');
  const fezAniversario = h[1] > n[1] || (h[1] === n[1] && h[2] >= n[2]);
  return h[0] - n[0] - (fezAniversario ? 0 : 1);
}
