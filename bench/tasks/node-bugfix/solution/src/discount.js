export function applyDiscount(total, coupon = 0) {
  let pct = 0;
  if (total >= 1000) pct = 0.15;
  else if (total >= 500) pct = 0.1;
  else if (total >= 100) pct = 0.05;
  const result = Math.max(0, total * (1 - pct) - coupon);
  return Math.round(result * 100) / 100;
}
