import { useEffect, useState } from 'react';
import { API_URL } from '../api.js';

// A null ID loads the list; a Case ID loads the complete case.
export default function useCase(caseId = null) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setResult({ caseId, data: null, loading: true, error: null });

    async function load() {
      try {
        const path = caseId === null ? '/cases' : `/cases/${encodeURIComponent(caseId)}`;
        const response = await fetch(`${API_URL}${path}`, { signal: controller.signal });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(
            (typeof body?.detail === 'string' && body.detail) ||
            `Unable to load case data (HTTP ${response.status}).`,
          );
        }
        const data = await response.json();
        if (active) setResult({ caseId, data, loading: false, error: null });
      } catch (error) {
        if (active) setResult({ caseId, data: null, loading: false, error: error.message });
      }
    }
    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [caseId]);

  return result?.caseId === caseId
    ? result
    : { data: null, loading: true, error: null };
}
