# Frontend

React application using Vite, JavaScript, React Router, and Material UI.

`src/App.js` defines the routes and shared header and footer:

- `/` — responsive case cards with applicant names, employment, postcodes, and dependents.
- `/cases/:caseId` — full applicant details and estimated weekly outgoings.
- Unmatched paths — page not found.

Cards link to a case details page with client IDs, dates of birth, employment,
dependents, and addresses from the backend. Case data and outgoings load
independently, so an outgoings failure does not hide the applicant information.
Production hosting must serve `index.html` for frontend routes so direct links
to case details work.

## Development

```sh
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

Run the backend in a separate terminal from the repository root:

```sh
python -m uvicorn main:app --reload
```

Vite proxies `/api/*` to `http://127.0.0.1:8000/*` during development.
Both hooks use this proxy by default. To use a different backend, set
`VITE_API_URL` (for example `http://localhost:8000`) and restart Vite; the backend
must allow the frontend origin through CORS when using an absolute URL.
`useCase()` fetches the case list and `useCase(caseId)` fetches a full case.
`useOutgoings(caseId)` returns `{ data, loading, error }` and cancels requests
when the case changes or the component unmounts. Amounts remain in GBP/week;
missing estimates are displayed as unavailable, not zero.

The backend reads cases from the supplied fixture. To view the original sample, open
`/cases/56763bf7-d046-4a54-a4a1-0728c724a092` on the Vite server.

## Production build

```sh
npm run build
npm run preview
```

For production, configure your hosting reverse proxy to forward `/api/*` to
the backend with the `/api` prefix removed. The Vite development proxy is not
included in the production build or preview server.

## Tests

```sh
npm test
```

Hook tests mock the API to check successful responses, HTTP and network errors,
missing Case IDs, and request cancellation. They do not call the live backend.
