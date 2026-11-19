import test from 'node:test';
import assert from 'node:assert';
import { gerarSlug } from '../src/slug.js';

test('gera o slug', () => {
  assert.strictEqual(gerarSlug('Camiseta Azul'), 'camiseta-azul');
});
