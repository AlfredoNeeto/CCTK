import * as pedidos from './pedidos.js';
import { NaoEncontrado, Invalido, Conflito } from './erros.js';

const json = (res, status, corpo) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(corpo));
};

// Formato de erro de toda a API: { erro: "<mensagem>" }.
function responderErro(res, e) {
  if (e instanceof NaoEncontrado) return json(res, 404, { erro: e.message });
  if (e instanceof Invalido) return json(res, 400, { erro: e.message });
  if (e instanceof Conflito) return json(res, 409, { erro: e.message });
  console.error(e);
  return json(res, 500, { erro: 'erro interno' });
}

const lerCorpo = (req) => new Promise((ok, falha) => {
  let s = '';
  req.on('data', (d) => { s += d; });
  req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch { falha(new Invalido('JSON inválido')); } });
});

export async function rotear(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const m = url.pathname.match(/^\/pedidos\/(\d+)$/);
    if (req.method === 'GET' && url.pathname === '/saude') return json(res, 200, { ok: true });
    if (req.method === 'GET' && url.pathname === '/pedidos') return json(res, 200, pedidos.listar());
    if (req.method === 'POST' && url.pathname === '/pedidos') return json(res, 201, pedidos.criar(await lerCorpo(req)));
    if (req.method === 'GET' && m) {
      const p = pedidos.buscar(Number(m[1]));
      if (p === null) throw new NaoEncontrado(`pedido ${m[1]} não existe`);
      return json(res, 200, p);
    }
    const c = url.pathname.match(/^\/pedidos\/(\d+)\/cancelar$/);
    if (req.method === 'POST' && c) return json(res, 200, pedidos.cancelar(Number(c[1])));
    throw new NaoEncontrado('rota não existe');
  } catch (e) {
    return responderErro(res, e);
  }
}
