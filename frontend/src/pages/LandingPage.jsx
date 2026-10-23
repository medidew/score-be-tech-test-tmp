import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import CaseCard from '../components/CaseCard.jsx';
import useCase from '../hooks/useCase.js';

export default function LandingPage() {
  const { data: cases, loading, error } = useCase();
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>Cases</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>Select a case to view applicants and estimated outgoings.</Typography>
      </Box>
      {loading && <Box role="status"><CircularProgress size={24} aria-label="Loading cases" /></Box>}
      {error && <Alert severity="error">{error}</Alert>}
      {cases?.length === 0 && <Alert severity="info">No cases available.</Alert>}
      {cases && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gridAutoRows: '1fr', gap: 3 }}>
          {cases.map((caseData) => <CaseCard key={caseData.case_id} caseData={caseData} />)}
        </Box>
      )}
    </Stack>
  );
}
