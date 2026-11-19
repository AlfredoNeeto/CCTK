import test from 'node:test';
import assert from 'node:assert';
import { gerarSlug } from './src/slug.js';

test('oculto: remove acentos e cedilha', () => {
  assert.strictEqual(gerarSlug('Promoção de Verão'), 'promocao-de-verao');
  assert.strictEqual(gerarSlug('Açaí & Café'), 'acai-cafe');
});

test('oculto: pontuação e espaços repetidos viram um hífen, sem hífen nas pontas', () => {
  assert.strictEqual(gerarSlug('  Olá,   Mundo!! '), 'ola-mundo');
  assert.strictEqual(gerarSlug('Camiseta -- Azul'), 'camiseta-azul');
});

test('oculto: mantém os números', () => {
  assert.strictEqual(gerarSlug('Tênis Corrida 42'), 'tenis-corrida-42');
});
