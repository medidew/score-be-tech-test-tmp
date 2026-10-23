import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import CaseCard from '../components/CaseCard.jsx';
import useCase from '../hooks/useCase.js';

export default function LandingPage() {
  const { data: cases, loading, error } = useCase();
  const [search, setSearch] = useState('');
  const query = search.trim().replace(/\s+/g, ' ').toLowerCase();
  const matchingCases = cases?.filter((caseData) => !query || (caseData.clients ?? []).some((client) =>
    [client.details?.first_name, client.details?.last_name]
      .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().toLowerCase().includes(query),
  ));
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
          {matchingCases.map((caseData) => <CaseCard key={caseData.case_id} caseData={caseData} />)}
        </Box>
      )}
    </Stack>
  );
}
