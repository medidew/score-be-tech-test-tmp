// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useOutgoings from './useOutgoings.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useOutgoings', () => {
  it('fetches the case and preserves missing values, zero amounts and notes', async () => {
    const data = {
      outgoings_food: 0,
      outgoings_child_care: null,
      outgoings_additional_details: 'Source limitations',
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useOutgoings('case/123'));

    expect(result.current.loading).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/cases/case%2F123/outgoings', {
      signal: expect.any(AbortSignal),
    });
    await waitFor(() => expect(result.current).toEqual({ data, loading: false, error: null }));
  });

  it.each([404, 422, 503])('reports backend error details for HTTP %s', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({ detail: `Backend error ${status}` }),
    }));
    const { result } = renderHook(() => useOutgoings('case-123'));

    await waitFor(() => expect(result.current.error).toBe(`Backend error ${status}`));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('handles a non-JSON error response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => { throw new SyntaxError('Invalid JSON'); },
    }));
    const { result } = renderHook(() => useOutgoings('case-123'));

    await waitFor(() => expect(result.current.error).toBe('Unable to load outgoings (HTTP 502).'));
  });

  it('reports network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { result } = renderHook(() => useOutgoings('case-123'));

    await waitFor(() => expect(result.current.error).toBe('Unable to connect to the API. Please try again.'));
    expect(result.current.loading).toBe(false);
  });

  it('does not request an absent Case ID', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useOutgoings(undefined));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toEqual({ data: null, loading: false, error: 'A Case ID is required.' });
  });

  it('cancels obsolete requests and ignores late responses', async () => {
    let resolveFirst;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ outgoings_food: 25 }) });
    vi.stubGlobal('fetch', fetchMock);
    const { result, rerender, unmount } = renderHook(({ id }) => useOutgoings(id), {
      initialProps: { id: 'first' },
    });
    const firstSignal = fetchMock.mock.calls[0][1].signal;

    rerender({ id: 'second' });
    expect(firstSignal.aborted).toBe(true);
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.data).toEqual({ outgoings_food: 25 }));
    await act(async () => {
      resolveFirst({ ok: true, json: async () => ({ outgoings_food: 100 }) });
    });
    expect(result.current.data).toEqual({ outgoings_food: 25 });

    const secondSignal = fetchMock.mock.calls[1][1].signal;
    unmount();
    expect(secondSignal.aborted).toBe(true);
  });
});
