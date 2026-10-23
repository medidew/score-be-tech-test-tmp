import { Link } from 'react-router-dom';
import { AppBar, Container, Toolbar, Typography } from '@mui/material';

export default function Header() {
  return (
    <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <nav aria-label="Main navigation">
            <Typography component={Link} to="/" variant="h6" sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 800 }}>Score</Typography>
          </nav>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
