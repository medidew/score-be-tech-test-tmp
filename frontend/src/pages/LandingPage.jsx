import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import CaseCard, { clientName } from '../components/CaseCard.jsx';
import useCase from '../hooks/useCase.js';

const nameOrder = new Intl.Collator('en-GB', { sensitivity: 'base' });

export default function LandingPage() {
  const { data: cases, loading, error } = useCase();
  const [search, setSearch] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const query = search.trim().replace(/\s+/g, ' ').toLowerCase();
  const matchingCases = cases?.filter((caseData) => !query || (caseData.clients ?? []).some((client) =>
    [client.details?.first_name, client.details?.last_name]
      .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().toLowerCase().includes(query),
  ));
  const sortedCases = matchingCases?.sort((a, b) => {
    const comparison = nameOrder.compare(
      clientName(a.clients?.[0] ?? {}),
      clientName(b.clients?.[0] ?? {}),
    );
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>Cases</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>Select a case to view applicants and estimated outgoings.</Typography>
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Search by client name"
          placeholder="Enter a first name, surname or full name"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          fullWidth
        />
        <TextField
          select
          label="Sort by client name"
          value={sortDirection}
          onChange={(event) => setSortDirection(event.target.value)}
          slotProps={{ select: { native: true } }}
          helperText="Joint cases use the first applicant."
          sx={{ minWidth: { sm: 240 } }}
        >
          <option value="asc">Ascending (A–Z)</option>
          <option value="desc">Descending (Z–A)</option>
        </TextField>
        {search && <Button onClick={() => setSearch('')} sx={{ flexShrink: 0 }}>Clear search</Button>}
      </Stack>
      {loading && <Box role="status"><CircularProgress size={24} aria-label="Loading cases" /></Box>}
      {error && <Alert severity="error">{error}</Alert>}
      {cases?.length === 0 && <Alert severity="info">No cases available.</Alert>}
      {cases?.length > 0 && (
        <Typography role="status" variant="body2" color="text.secondary">
          Showing {matchingCases.length} of {cases.length} cases
        </Typography>
      )}
      {cases?.length > 0 && matchingCases.length === 0 && (
        <Alert severity="info">No cases match your search.</Alert>
      )}
      {cases && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gridAutoRows: '1fr', gap: 3 }}>
          {sortedCases.map((caseData) => <CaseCard key={caseData.case_id} caseData={caseData} />)}
        </Box>
      )}
    </Stack>
  );
}
