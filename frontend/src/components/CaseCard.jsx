import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export function clientName(client) {
  return [client.details?.first_name, client.details?.last_name].filter(Boolean).join(' ') || 'Unnamed applicant';
}

export function employmentLabel(value) {
  return value ? value.toLowerCase().replaceAll('_', ' ') : 'Not provided';
}

export default function CaseCard({ caseData }) {
  const clients = caseData.clients ?? [];
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea component={Link} to={`/cases/${encodeURIComponent(caseData.case_id)}`}
        aria-label={`View case ${caseData.case_id}`} sx={{ height: '100%', display: 'flex', alignItems: 'stretch' }}>
        <CardContent sx={{ p: 3, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere', minWidth: 0 }}>
              Case ID: {caseData.case_id}
            </Typography>
            <Chip size="small" sx={{ flexShrink: 0 }} label={`${clients.length} applicant${clients.length === 1 ? '' : 's'}`} />
          </Stack>
          <Typography component="h2" variant="h6" gutterBottom>
            {clients.map(clientName).join(' & ') || 'No applicants'}
          </Typography>
          <Stack spacing={2} sx={{ mt: 3 }}>
            {clients.map((client, index) => (
              <Box key={`${client.client_id}-${index}`}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{clientName(client)}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {employmentLabel(client.details?.employment_status)}
                  {' · '}{client.details?.address?.postcode?.toUpperCase() || 'Postcode not provided'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Dependents: {client.details?.dependents ?? 'Not provided'}
                </Typography>
              </Box>
            ))}
          </Stack>
          <Typography color="primary" variant="body2" sx={{ fontWeight: 600, mt: 'auto', pt: 3, textAlign: 'right' }}>View case →</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
