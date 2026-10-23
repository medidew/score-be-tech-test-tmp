import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function summarise(c) {
  const clients = c.clients ?? [];
  const postcodes = [...new Set(clients.map((cl) => cl.details?.address?.postcode).filter(Boolean))];
  return {
    names: clients.map((cl) => `${cl.details.first_name} ${cl.details.last_name}`).join(", "),
    count: clients.length,
    postcodes: postcodes.join(", "),
    dependents: Math.max(0, ...clients.map((cl) => cl.details?.dependents ?? 0)),
    statuses: [...new Set(clients.map((cl) => cl.details?.employment_status))].join(", "),
  };
}

export default function App() {
  const [cases, setCases] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/cases`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then(setCases)
      .catch((err) => setError(err.message));
  }, []);

  const cell = { border: "1px solid #ccc", padding: "6px 10px", textAlign: "left" };

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 960, margin: "2rem auto" }}>
      <h1>Cases</h1>
      {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}
      {!cases && !error && <p>Loading...</p>}
      {cases && (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={cell}>Case ID</th>
              <th style={cell}>Clients</th>
              <th style={cell}>Names</th>
              <th style={cell}>Postcode(s)</th>
              <th style={cell}>Dependents</th>
              <th style={cell}>Employment</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const s = summarise(c);
              return (
                <tr key={c.case_id}>
                  <td style={cell}>{c.case_id}</td>
                  <td style={cell}>{s.count}</td>
                  <td style={cell}>{s.names}</td>
                  <td style={cell}>{s.postcodes}</td>
                  <td style={cell}>{s.dependents}</td>
                  <td style={cell}>{s.statuses}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
