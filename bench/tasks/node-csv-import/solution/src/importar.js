import { cpfValido } from './cpf.js';

const COLUNAS = ['nome', 'cpf', 'email', 'limite'];

// Splits into records of fields, keeping the physical line where each record starts.
function registros(texto) {
  const out = [];
  let campos = [], campo = '', aspas = false, citado = false, linha = 1, inicio = 1;
  const fechaCampo = () => { campos.push(citado ? campo : campo.trim()); campo = ''; citado = false; };
  const fechaRegistro = () => {
    fechaCampo();
    if (!(campos.length === 1 && campos[0] === '')) out.push({ linha: inicio, campos });
    campos = [];
  };
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else { if (ch === '\n') linha++; if (ch !== '\r' || texto[i + 1] !== '\n') campo += ch; }
    } else if (ch === '"' && campo.trim() === '') { aspas = true; citado = true; campo = ''; }
    else if (ch === ';') fechaCampo();
    else if (ch === '\n') { fechaRegistro(); linha++; inicio = linha; }
    else if (ch !== '\r') campo += ch;
  }
  if (campo !== '' || campos.length) fechaRegistro();
  return out;
}

const LIMITE = /^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/;

export function importarClientes(texto) {
  const [cab, ...linhas] = registros(texto.replace(/^﻿/, ''));
  const idx = Object.fromEntries(COLUNAS.map((c) => [c, cab.campos.findIndex((h) => h.trim().toLowerCase() === c)]));
  const falta = COLUNAS.filter((c) => idx[c] < 0);
  if (falta.length) throw new Error(`Colunas obrigatórias ausentes: ${falta.join(', ')}`);

  const clientes = [], erros = [], vistos = new Set();
  for (const { linha, campos } of linhas) {
    const v = (c) => campos[idx[c]] ?? '';
    const e = [];
    const err = (campo, mensagem) => e.push({ linha, campo, mensagem });
    const nome = v('nome');
    if (!nome.trim()) err('nome', 'nome vazio');
    const cpf = v('cpf').replace(/[.\-\s]/g, '');
    if (!cpfValido(cpf)) err('cpf', 'CPF inválido');
    else if (vistos.has(cpf)) err('cpf', 'CPF duplicado');
    const email = v('email');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) err('email', 'e-mail inválido');
    const lim = v('limite');
    if (!LIMITE.test(lim)) err('limite', 'limite inválido');
    if (e.length) { erros.push(...e); continue; }
    vistos.add(cpf);
    clientes.push({ nome, cpf, email, limite: Number(lim.replace(/\./g, '').replace(',', '.')) });
  }
  return { clientes, erros };
}
