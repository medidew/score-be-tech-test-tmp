// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage.jsx';
import useCase from '../hooks/useCase.js';

vi.mock('../hooks/useCase.js', () => ({ default: vi.fn() }));

const client = (first_name, last_name) => ({ details: { first_name, last_name } });
const cases = [
  { case_id: 'one', clients: [client('Joe', 'Bloggs'), client('Jane', 'Smith')] },
  { case_id: 'two', clients: [client('Jane', 'Brown')] },
  { case_id: 'three', clients: [client('Callum', 'Jones')] },
  { case_id: 'four', clients: [{}] },
];

beforeEach(() => {
  useCase.mockReturnValue({ data: cases, loading: false, error: null });
});
afterEach(cleanup);

it.each([
  ['  jAnE  ', ['two', 'one']],
  ['jane   SMITH', ['one']],
  ['ogg', ['one']],
  ['  ', ['three', 'two', 'one', 'four']],
])('shows every matching case for query %s', (query, expectedIds) => {
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search by client name' }), { target: { value: query } });

  const cards = screen.getAllByRole('link');
  expect(cards.map((card) => card.getAttribute('href'))).toEqual(expectedIds.map((id) => `/cases/${id}`));
  expect(screen.getByRole('status').textContent).toBe(`Showing ${expectedIds.length} of 4 cases`);
});

it('shows no matches and restores every case when the search is cleared', () => {
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search by client name' }), { target: { value: 'unknown client' } });
  expect(screen.getByText('No cases match your search.')).toBeTruthy();
  expect(screen.queryAllByRole('link')).toHaveLength(0);

  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(screen.getAllByRole('link')).toHaveLength(4);
  expect(screen.queryByText('No cases match your search.')).toBeNull();
});

it('switches between ascending and descending name order while keeping search results filtered', () => {
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  const cardPaths = () => screen.getAllByRole('link').map((card) => card.getAttribute('href'));
  expect(cardPaths()).toEqual(['/cases/three', '/cases/two', '/cases/one', '/cases/four']);

  const sort = screen.getByRole('combobox', { name: 'Sort by client name' });
  fireEvent.change(sort, { target: { value: 'desc' } });
  expect(cardPaths()).toEqual(['/cases/four', '/cases/one', '/cases/two', '/cases/three']);

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search by client name' }), { target: { value: 'Jane' } });
  expect(cardPaths()).toEqual(['/cases/one', '/cases/two']);
  fireEvent.change(sort, { target: { value: 'asc' } });
  expect(cardPaths()).toEqual(['/cases/two', '/cases/one']);
  expect(cases.map((caseData) => caseData.case_id)).toEqual(['one', 'two', 'three', 'four']);
});
