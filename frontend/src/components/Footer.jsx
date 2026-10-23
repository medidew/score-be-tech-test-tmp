import { Box, Container, Typography } from '@mui/material';

export default function Footer() {
  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: 3 }}>
      <Container maxWidth="lg">
        <Typography variant="body2" color="text.secondary">Score · Household case viewer</Typography>
      </Container>
    </Box>
  );
}
