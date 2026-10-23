import { Box, Card, CardContent, Typography } from '@mui/material';
import { clientName, employmentLabel } from './CaseCard.jsx';

export default function ClientDetails({ client }) {
  const details = client.details ?? {};
  const fields = [
    ['Client ID', client.client_id],
    ['Date of birth', details.dob],
    ['Employment', employmentLabel(details.employment_status)],
    ['Dependents', details.dependents],
    ['Address', Object.values(details.address ?? {}).filter(Boolean).join(', ')],
  ];
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 3 }}>
        <Typography component="h3" variant="h6" gutterBottom>{clientName(client)}</Typography>
        <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '130px 1fr' }, gap: 1 }}>
          {fields.map(([label, value]) => (
            <Box key={label} sx={{ display: 'contents' }}>
              <Typography component="dt" variant="body2" color="text.secondary">{label}</Typography>
              <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: 'anywhere' }}>{value === null || value === undefined || value === '' ? 'Not provided' : value}</Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
