import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import LandingPage from './pages/LandingPage.jsx';
import CaseDetails from './pages/CaseDetails.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/cases/:caseId" element={<CaseDetails />} />
          <Route path="*" element={<h1>Page not found</h1>} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
