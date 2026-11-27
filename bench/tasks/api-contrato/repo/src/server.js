import http from 'node:http';
import { rotear } from './rotas.js';

const porta = Number(process.env.PORT) || 3210;
http.createServer(rotear).listen(porta, '127.0.0.1', () => console.log(`API de pedidos em http://127.0.0.1:${porta}`));
