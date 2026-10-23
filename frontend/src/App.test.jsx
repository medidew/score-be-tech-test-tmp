// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App.js';

const caseData = {
  case_id: 'case-123',
  clients: [{
    client_id: 'client-1',
    details: {
      first_name: 'Test', last_name: 'Applicant', dob: '1990/08/11',
      employment_status: 'EMPLOYED', dependents: 0,
      address: { address1: '1 Test Street', posttown: 'London', postcode: 'E1 7EE' },
    },
  }],
};

function mockApi({ outgoingsError = false, empty = false } = {}) {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (url === '/api/cases') return { ok: true, json: async () => empty ? [] : [caseData] };
    if (url === '/api/cases/case-123') return { ok: true, json: async () => caseData };
    if (url === '/api/cases/case-123/outgoings') {
      if (outgoingsError) return { ok: false, status: 503, json: async () => ({ detail: 'Postcode lookup service unavailable' }) };
      return {
        ok: true,
        json: async () => ({
          outgoings_food: 42.5, outgoings_clothing: 0, outgoings_child_care: null,
          outgoings_additional_details: 'outgoings_food: Excludes alcoholic drinks.\noutgoings_food: Low-sample estimate.\noutgoings_child_care: No standalone childcare category.',
        }),
      };
    }
    throw new Error(`Unexpected request: ${url}`);
  }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

it('opens complete case details and outgoings from a case card', async () => {
  window.history.replaceState({}, '', '/');
  mockApi();
  render(<App />);
  const card = await screen.findByRole('link', { name: 'View case case-123' });
  expect(card.textContent).toContain('Test Applicant');
  expect(card.textContent).toContain('E1 7EE');
  expect(card.textContent).toContain('Dependents: 0');
  fireEvent.click(card);

  expect(await screen.findByText('£42.50')).toBeTruthy();
  expect(screen.getByText('£0.00')).toBeTruthy();
  expect(screen.getByText('Not available')).toBeTruthy();
  expect(await screen.findByText('1 Test Street, London, E1 7EE')).toBeTruthy();
  expect(screen.getByText('1990/08/11')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Test Applicant' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Score' })).toBeTruthy();
  fireEvent.mouseOver(screen.getByText('food').parentElement);
  const tooltip = await screen.findByRole('tooltip');
  expect(tooltip.textContent).toContain('Excludes alcoholic drinks.');
  expect(tooltip.textContent).toContain('Low-sample estimate.');
  expect(tooltip.textContent).not.toContain('No standalone childcare category.');
  expect(screen.queryByText('Assumptions and data limitations')).toBeNull();
});

it('loads a direct case URL and keeps applicant details visible when outgoings fail', async () => {
  window.history.replaceState({}, '', '/cases/case-123');
  mockApi({ outgoingsError: true });
  render(<App />);
  expect(await screen.findByText('1 Test Street, London, E1 7EE')).toBeTruthy();
  expect(await screen.findByText('Postcode lookup service unavailable')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Test Applicant' })).toBeTruthy();
});

it('shows an empty state when no cases exist', async () => {
  window.history.replaceState({}, '', '/');
  mockApi({ empty: true });
  render(<App />);
  expect(await screen.findByText('No cases available.')).toBeTruthy();
});

it('sorts outgoing amounts in both directions with zero included and missing estimates last', async () => {
  window.history.replaceState({}, '', '/cases/case-123');
  mockApi();
  render(<App />);
  await screen.findByText('£42.50');
  const table = screen.getByRole('table', { name: 'Estimated weekly outgoings' });
  const amounts = () => within(table).getAllByRole('row').slice(1)
    .map((row) => within(row).getByRole('cell').textContent);

  expect(amounts()).toEqual(['£0.00', '£42.50', 'Not available']);
  expect(within(table).getByRole('columnheader', { name: /Weekly estimate/ }).getAttribute('aria-sort')).toBe('ascending');
  fireEvent.click(screen.getByRole('button', { name: 'Sort weekly estimates highest first' }));
  expect(amounts()).toEqual(['£42.50', '£0.00', 'Not available']);
  expect(within(table).getByRole('columnheader', { name: /Weekly estimate/ }).getAttribute('aria-sort')).toBe('descending');
  fireEvent.click(screen.getByRole('button', { name: 'Sort weekly estimates lowest first' }));
  expect(amounts()).toEqual(['£0.00', '£42.50', 'Not available']);
});
