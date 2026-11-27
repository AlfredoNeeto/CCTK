// Hidden tests: the two approved screens in the React app, by text, id and navigation, as the prototype shows them.
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import App from '../src/App.jsx';

afterEach(cleanup);
const abrir = (rota) => render(<MemoryRouter initialEntries={[rota]}><App /></MemoryRouter>);
const id = (x) => document.getElementById(x);

test('login: título, CPF, senha e o botão Entrar', () => {
  abrir('/login');
  expect(screen.getByRole('heading', { name: 'Financeiro Claro' })).toBeTruthy();
  expect(id('cpf')?.tagName).toBe('INPUT');
  expect(id('senha')?.getAttribute('type')).toBe('password');
  expect(id('entrar')?.textContent).toBe('Entrar');
});

test('login: Entrar leva às contas', async () => {
  abrir('/login');
  fireEvent.click(id('entrar'));
  expect(await screen.findByRole('heading', { name: 'Contas a pagar', level: 1 })).toBeTruthy();
});

test('contas: uma linha por conta, com fornecedor, vencimento, valor e status', () => {
  abrir('/contas');
  const linhas = id('contas').querySelectorAll('tbody tr');
  expect(linhas.length).toBe(4);
  const primeira = within(linhas[0]);
  for (const t of ['Papelaria Central', '05/03/2026', 'R$ 1.250,00', 'Vence hoje']) expect(primeira.getByText(t)).toBeTruthy();
  expect(within(linhas[2]).getByText('Atrasada')).toBeTruthy();
  expect(within(linhas[3]).getByText('R$ 189,90')).toBeTruthy();
});

test('contas: total no rodapé da tabela', () => {
  abrir('/contas');
  const rodape = id('contas').querySelector('tfoot');
  expect(rodape?.textContent).toContain('4 contas');
  expect(rodape?.textContent).toContain('R$ 2.247,80');
});

test('contas: trilha, filtro de período e o botão Nova conta', () => {
  abrir('/contas');
  expect(screen.getByText('Financeiro › Contas')).toBeTruthy();
  expect(id('periodo')?.tagName).toBe('SELECT');
  expect(id('filtrar')?.textContent).toBe('Filtrar');
  expect(id('nova-conta')?.textContent).toBe('Nova conta');
});

test('contas: Nova conta abre o formulário e Cancelar fecha', () => {
  abrir('/contas');
  expect(id('fornecedor')).toBeNull();
  fireEvent.click(id('nova-conta'));
  expect(id('fornecedor')?.tagName).toBe('INPUT');
  fireEvent.click(id('cancelar'));
  expect(id('fornecedor')).toBeNull();
});

test('contas: Sair volta ao login', async () => {
  abrir('/contas');
  fireEvent.click(id('sair'));
  expect(await screen.findByRole('heading', { name: 'Financeiro Claro' })).toBeTruthy();
});
