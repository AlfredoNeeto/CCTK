// Hidden tests: the two approved screens in the React app, by text, id and navigation, as the prototype shows them.
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import App from '../src/App.jsx';

afterEach(() => { cleanup(); window.location.hash = ''; });
const abrir = (rota) => render(<MemoryRouter initialEntries={[rota]}><App /></MemoryRouter>);
const id = (x) => document.getElementById(x);
// Text as a reader sees it: toLocaleString puts a non-breaking space after "R$".
const texto = (el) => (el?.textContent || '').replace(/\s+/g, ' ');
// A field is visible when it is rendered and its modal (if any) is open: by state (class "aberto", or not rendered
// until opened) or, as in the prototype, by :target (the address points at the modal's id). jsdom has no CSS.
// A click on a link to "#x" moves the address to #x, as a browser does (jsdom may skip it on a synthetic click).
function clicar(el) {
  fireEvent.click(el);
  const href = el?.getAttribute('href');
  if (el?.tagName === 'A' && href?.startsWith('#')) window.location.hash = href === '#' ? '' : href;
}
function visivel(el) {
  if (!el) return false;
  // Hidden by state: hidden attribute, inline display:none, or a closed <dialog> on the way up.
  for (let n = el; n; n = n.parentElement) {
    if (n.hidden || n.style?.display === 'none') return false;
    if (n.tagName === 'DIALOG' && !n.open) return false;
  }
  const modal = el.closest('.modal');
  if (!modal) return true;
  // The catalog's .modal is display:none until opened, as the CSS has it: by class "aberto", an inline display, or
  // :target (the address points at its id). A <dialog open> that keeps class "modal" is still hidden by that CSS.
  return modal.classList.contains('aberto') || (modal.style.display !== '' && modal.style.display !== 'none') ||
    (modal.id !== '' && window.location.hash === `#${modal.id}`);
}

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
  expect(texto(rodape)).toContain('4 contas');
  expect(texto(rodape)).toContain('R$ 2.247,80');
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
  expect(visivel(id('fornecedor'))).toBe(false);
  clicar(id('nova-conta'));
  expect(visivel(id('fornecedor'))).toBe(true);
  clicar(id('cancelar'));
  expect(visivel(id('fornecedor'))).toBe(false);
});

test('contas: Sair volta ao login', async () => {
  abrir('/contas');
  fireEvent.click(id('sair'));
  expect(await screen.findByRole('heading', { name: 'Financeiro Claro' })).toBeTruthy();
});
