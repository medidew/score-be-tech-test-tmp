import { expect, it } from 'vitest';
import outgoingsDetails from './outgoingsDetails.js';

it('groups repeated field notes and retains colons and continuation lines', () => {
  expect(outgoingsDetails([
    'outgoings_water: Estimated: includes other services.',
    'Continued explanation.',
    'outgoings_food: Excludes alcohol.',
    'outgoings_water: Low-sample estimate.',
  ].join('\r\n'))).toEqual({
    outgoings_water: 'Estimated: includes other services.\nContinued explanation.\nLow-sample estimate.',
    outgoings_food: 'Excludes alcohol.',
  });
});

it('accepts absent details', () => {
  expect(outgoingsDetails()).toEqual({});
  expect(outgoingsDetails('')).toEqual({});
});
