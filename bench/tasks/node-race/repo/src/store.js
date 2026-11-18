// Simula o banco remoto de estoque: toda operação é assíncrona e leva um "tempo de rede".
const rows = new Map();
let failNext = false;
const tick = () => new Promise((r) => setTimeout(r, Math.random() * 3));

export const store = {
  async get(sku) { await tick(); const r = rows.get(sku); return r ? { ...r } : null; },
  async set(sku, row) {
    await tick();
    if (failNext) { failNext = false; throw new Error('timeout do banco'); }
    rows.set(sku, { ...row });
  },
  // Helpers de teste
  seed(sku, available) { rows.set(sku, { sku, available, reserved: 0 }); },
  failNextWrite() { failNext = true; },
  peek(sku) { return rows.get(sku); },
};
