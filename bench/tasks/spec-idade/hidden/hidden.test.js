import test from 'node:test';
import assert from 'node:assert';
import { idade } from './src/idade.js';

test('oculto: antes do aniversário no ano, ainda não completou', () => {
  assert.strictEqual(idade('2000-11-20', '2026-11-19'), 25);
  assert.strictEqual(idade('2000-03-01', '2026-02-28'), 25);
  assert.strictEqual(idade('1990-12-31', '2026-01-01'), 35);
});

test('oculto: no dia do aniversário e depois, completou', () => {
  assert.strictEqual(idade('2000-11-19', '2026-11-19'), 26);
  assert.strictEqual(idade('2000-02-15', '2026-03-01'), 26);
});

test('oculto: nascido hoje tem 0 anos', () => {
  assert.strictEqual(idade('2026-11-19', '2026-11-19'), 0);
});

test('oculto: nascimento no futuro lança erro', () => {
  assert.throws(() => idade('2027-01-01', '2026-11-19'));
});
