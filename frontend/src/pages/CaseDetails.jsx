import { Link, useParams } from 'react-router-dom';
import useOutgoings from '../hooks/useOutgoings.js';

const currency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

export default function CaseDetails() {
  const { caseId } = useParams();
  const { data: outgoings, loading, error } = useOutgoings(caseId);

  return (
    <>
      <Link to="/">Back to cases</Link>
      <h1>Case details</h1>
      <p>Case ID: {caseId}</p>
      <section aria-labelledby="outgoings-heading" aria-busy={loading}>
        <h2 id="outgoings-heading">Estimated weekly outgoings</h2>
        <p>Regional household averages from ONS 2019, not actual household spending.</p>
        {loading && <p role="status">Loading outgoings…</p>}
        {error && <p role="alert">{error}</p>}
        {outgoings && (
          <>
            <table>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Weekly estimate (GBP)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(outgoings)
                  .filter(([key]) => key.startsWith('outgoings_') && key !== 'outgoings_additional_details')
                  .map(([key, amount]) => (
                    <tr key={key}>
                      <th scope="row">
                        {key.replace(/^outgoings_/, '').replaceAll('_', ' ')}
                      </th>
                      <td>{amount === null ? 'Not available' : currency.format(amount)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {outgoings.outgoings_additional_details && (
              <details>
                <summary>Assumptions and data limitations</summary>
                <p style={{ whiteSpace: 'pre-wrap' }}>{outgoings.outgoings_additional_details}</p>
              </details>
            )}
          </>
        )}
      </section>
    </>
  );
}
