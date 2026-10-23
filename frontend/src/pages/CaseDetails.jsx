import { Link, useParams } from 'react-router-dom';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button,
  CircularProgress, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import ClientDetails from '../components/ClientDetails.jsx';
import useCase from '../hooks/useCase.js';
import useOutgoings from '../hooks/useOutgoings.js';

const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export default function CaseDetails() {
  const { caseId } = useParams();
  const caseResult = useCase(caseId);
  const { data: outgoings, loading, error } = useOutgoings(caseId);

  return (
    <Stack spacing={3}>
      <Box>
        <Button component={Link} to="/" sx={{ mb: 2 }}>← Back to cases</Button>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>Case details</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, overflowWrap: 'anywhere' }}>Case ID: {caseId}</Typography>
      </Box>
      <Box component="section" aria-labelledby="applicants-heading" aria-busy={caseResult.loading}>
        <Typography component="h2" variant="h5" id="applicants-heading" sx={{ mb: 2 }}>Applicants</Typography>
        {caseResult.loading && <Box role="status"><CircularProgress size={24} aria-label="Loading case details" /></Box>}
        {caseResult.error && <Alert severity="error">{caseResult.error}</Alert>}
        {caseResult.data?.clients?.length === 0 && <Alert severity="info">No applicants provided for this case.</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
          {caseResult.data?.clients?.map((client, index) => (
            <ClientDetails key={`${client.client_id}-${index}`} client={client} />
          ))}
        </Box>
      </Box>
      <Box component="section" aria-labelledby="outgoings-heading" aria-busy={loading}>
        <Typography component="h2" variant="h5" id="outgoings-heading" sx={{ mb: 2 }}>Estimated weekly outgoings</Typography>
        <Alert severity="info" sx={{ mb: 2 }}>Regional household averages from ONS 2019, not actual household spending.</Alert>
        {loading && <Box role="status"><CircularProgress size={24} aria-label="Loading outgoings" /></Box>}
        {error && <Alert severity="error">{error}</Alert>}
        {outgoings && (
          <Stack spacing={2}>
            <TableContainer component={Paper} variant="outlined">
              <Table aria-label="Estimated weekly outgoings">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Weekly estimate (GBP)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(outgoings)
                    .filter(([key]) => key.startsWith('outgoings_') && key !== 'outgoings_additional_details')
                    .map(([key, amount]) => (
                      <TableRow key={key}>
                        <TableCell component="th" scope="row" sx={{ textTransform: 'capitalize' }}>
                          {key.replace(/^outgoings_/, '').replaceAll('_', ' ')}
                        </TableCell>
                        <TableCell align="right">{amount === null ? 'Not available' : currency.format(amount)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            {outgoings.outgoings_additional_details && (
              <Accordion variant="outlined" disableGutters elevation={0}>
                <AccordionSummary expandIcon={<span aria-hidden="true">⌄</span>} aria-controls="outgoings-notes" id="outgoings-notes-heading">
                  <Typography>Assumptions and data limitations</Typography>
                </AccordionSummary>
                <AccordionDetails id="outgoings-notes">
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{outgoings.outgoings_additional_details}</Typography>
                </AccordionDetails>
              </Accordion>
            )}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
