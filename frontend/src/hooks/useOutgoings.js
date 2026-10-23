import { useEffect, useState } from 'react';
import { API_URL } from '../api.js';

const errorMessages = {
  404: 'Case not found.',
  422: 'Outgoings are unavailable for this case.',
  503: 'The postcode lookup service is unavailable. Please try again later.',
};

export default function useOutgoings(caseId) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!caseId) return;

    const controller = new AbortController();
    let active = true;
    setResult({ caseId, data: null, loading: true, error: null });

    async function fetchOutgoings() {
      try {
        const response = await fetch(
          `${API_URL}/cases/${encodeURIComponent(caseId)}/outgoings`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(
            (typeof body?.detail === 'string' && body.detail) ||
              errorMessages[response.status] ||
              `Unable to load outgoings (HTTP ${response.status}).`,
          );
        }

        const data = await response.json();
        if (active) {
          setResult({ caseId, data, loading: false, error: null });
        }
      } catch (error) {
        if (active) {
          setResult({
            caseId,
            data: null,
            loading: false,
            error: error instanceof TypeError
              ? 'Unable to connect to the API. Please try again.'
              : error.message,
          });
        }
      }
    }

    fetchOutgoings();

    return () => {
      active = false;
      controller.abort();
    };
  }, [caseId]);

  if (!caseId) {
    return { data: null, loading: false, error: 'A Case ID is required.' };
  }

  // Never expose the previous case's results while the next effect starts.
  if (result?.caseId !== caseId) {
    return { data: null, loading: true, error: null };
  }

  return { data: result.data, loading: result.loading, error: result.error };
}
