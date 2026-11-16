import React, { useState } from 'react';
import DividendForm from './components/DividendForm';
import DividendChart from './components/DividendChart';
import OCRUpload from './components/OCRUpload';
import TextAnalysis from './components/TextAnalysis';
import DividendData from './components/DividendData';
import DividendCalendar from './components/DividendCalendar';
import PortfolioAnalysis from './components/PortfolioAnalysis';
import DividendSimulator from './components/DividendSimulator';
import RecentEtfCandidates from './components/RecentEtfCandidates';
import Layout from './components/Layout';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import AuthGate from './components/AuthGate';
import SegmentedControl from './components/SegmentedControl';
import './styles/App.css';

const INPUT_TABS = [
  { value: 'form', label: '수동 입력' },
  { value: 'ocr', label: '화면 캡처' },
  { value: 'text', label: '텍스트 분석' },
];

function AppContent() {
  const [page, setPage] = useState('chart');

  // Rendered as an element (not an inner component) so the tab control stays mounted while switching input pages.
  const inputSection = (
    <div className="card">
      <div style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
        <SegmentedControl
          label="입력 방식"
          options={INPUT_TABS}
          value={page}
          onChange={setPage}
        />
      </div>

      {page === 'form' && <DividendForm />}
      {page === 'ocr' && <OCRUpload />}
      {page === 'text' && <TextAnalysis />}
    </div>
  );

  return (
    <Layout currentPage={page} setPage={setPage}>
      {page === 'chart' && <DividendChart />}

      {page === 'data' && (
        <div className="card">
          <DividendData />
        </div>
      )}

      {['form', 'ocr', 'text'].includes(page) && inputSection}

      {page === 'calendar' && (
        <DividendCalendar />
      )}

      {page === 'portfolio' && (
        <PortfolioAnalysis />
      )}

      {page === 'etf' && (
        <RecentEtfCandidates />
      )}

      {page === 'simulator' && (
        <DividendSimulator />
      )}
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate>
          <AppContent />
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
