// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

it('opens case outgoings from the shared case list', async () => {
  window.history.replaceState({}, '', '/');
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (url === '/api/cases') {
      return {
        ok: true,
        json: async () => [{
          case_id: 'case-123',
          clients: [{ details: { first_name: 'Test', last_name: 'Applicant' } }],
        }],
      };
    }
    if (url === '/api/cases/case-123/outgoings') {
      return {
        ok: true,
        json: async () => ({
          outgoings_food: 42.5,
          outgoings_child_care: null,
          outgoings_additional_details: 'Regional estimate only.',
        }),
      };
    }
    throw new Error(`Unexpected request: ${url}`);
  }));

  render(<App />);
  fireEvent.click(await screen.findByRole('link', { name: 'case-123' }));

  expect(await screen.findByText('£42.50')).toBeTruthy();
  expect(screen.getByText('Not available')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Case details' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Score' })).toBeTruthy();
});
