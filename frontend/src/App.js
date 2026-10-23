import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Box, Container, createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import LandingPage from './pages/LandingPage.jsx';
import CaseDetails from './pages/CaseDetails.jsx';

const theme = createTheme({
  palette: { background: { default: '#f5f7fb' }, primary: { main: '#2455a6' } },
  typography: { fontFamily: 'system-ui, sans-serif' },
  shape: { borderRadius: 12 },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Header />
          <Container component="main" maxWidth="lg" sx={{ py: 4, flex: 1 }}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/cases/:caseId" element={<CaseDetails />} />
              <Route path="*" element={<h1>Page not found</h1>} />
            </Routes>
          </Container>
          <Footer />
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
}
