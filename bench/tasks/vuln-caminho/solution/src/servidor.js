import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const FOTOS = path.join(RAIZ, 'fotos');
const ANEXOS = path.join(RAIZ, 'uploads', 'anexos');

// The file inside `pasta`, or null when the name escapes it (.., an absolute path, a backslash on Windows).
function dentro(pasta, nome) {
  let decodificado;
  try { decodificado = decodeURIComponent(nome); } catch { return null; }
  const arquivo = path.resolve(pasta, decodificado);
  return arquivo.startsWith(pasta + path.sep) ? arquivo : null;
}

function enviar(res, arquivo) {
  if (!arquivo || !fs.existsSync(arquivo) || !fs.statSync(arquivo).isFile()) { res.writeHead(404); return res.end('não encontrado'); }
  res.writeHead(200, { 'content-type': 'application/octet-stream' });
  return res.end(fs.readFileSync(arquivo));
}

export function responder(req, res) {
  const foto = req.url.match(/^\/fotos\/(.+)$/);
  if (req.method === 'GET' && foto) {
    const arquivo = path.join(FOTOS, decodeURIComponent(foto[1]));
    if (!fs.existsSync(arquivo)) { res.writeHead(404); return res.end('não encontrado'); }
    res.writeHead(200, { 'content-type': 'application/octet-stream' });
    return res.end(fs.readFileSync(arquivo));
  }
  const anexo = req.url.match(/^\/anexos\/(.+)$/);
  if (req.method === 'GET' && anexo) return enviar(res, dentro(ANEXOS, anexo[1]));
  res.writeHead(404);
  res.end('rota não existe');
}

export const servidor = http.createServer(responder);
if (process.argv[1] === import.meta.filename) {
  const porta = Number(process.env.PORT) || 3400;
  servidor.listen(porta, '127.0.0.1', () => console.log(`portal em http://127.0.0.1:${porta}`));
}
