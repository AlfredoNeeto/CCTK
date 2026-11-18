const tables = new Map();
let seq = 0;
const t = (name) => tables.get(name) ?? tables.set(name, new Map()).get(name);
export const db = {
  async insert(name, row) { const id = ++seq; t(name).set(id, { id, ...row }); return id; },
  async find(name, id) { return t(name).get(id) ?? null; },
  async update(name, id, patch) { Object.assign(t(name).get(id), patch); },
};
