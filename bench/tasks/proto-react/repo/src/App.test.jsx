import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import App from './App.jsx';

test('o app renderiza', () => {
  render(<MemoryRouter><App /></MemoryRouter>);
  expect(document.body.textContent.length).toBeGreaterThan(0);
});
