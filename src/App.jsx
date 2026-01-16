import React, { useState } from 'react';
import DividendForm from './components/DividendForm';
import DividendChart from './components/DividendChart';
import OCRUpload from './components/OCRUpload';
import TextAnalysis from './components/TextAnalysis';
import DividendData from './components/DividendData';
import DividendCalendar from './components/DividendCalendar';
import PortfolioAnalysis from './components/PortfolioAnalysis';
import DividendSimulator from './components/DividendSimulator';
import Layout from './components/Layout';
import { ThemeProvider } from './context/ThemeContext';
import './styles/App.css';

function App() {
  const [page, setPage] = useState('chart');

  const InputSection = () => (
    <div className="card">
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button
          onClick={() => setPage('form')}
          style={{
            backgroundColor: page === 'form' ? 'var(--accent-color)' : 'transparent',
            color: page === 'form' ? '#fff' : 'var(--text-secondary)',
            opacity: page === 'form' ? 1 : 0.7,
            border: 'none',
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: '20px'
          }}
        >
          수동 입력
        </button>
        <button
          onClick={() => setPage('ocr')}
          style={{
            backgroundColor: page === 'ocr' ? 'var(--accent-color)' : 'transparent',
            color: page === 'ocr' ? '#fff' : 'var(--text-secondary)',
            opacity: page === 'ocr' ? 1 : 0.7,
            border: 'none',
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: '20px'
          }}
        >
          화면 캡처
        </button>
        <button
          onClick={() => setPage('text')}
          style={{
            backgroundColor: page === 'text' ? 'var(--accent-color)' : 'transparent',
            color: page === 'text' ? '#fff' : 'var(--text-secondary)',
            opacity: page === 'text' ? 1 : 0.7,
            border: 'none',
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: '20px'
          }}
        >
          텍스트 분석
        </button>
      </div>

      {page === 'form' && <DividendForm />}
      {page === 'ocr' && <OCRUpload />}
      {page === 'text' && <TextAnalysis />}
    </div>
  );

  return (
    <ThemeProvider>
      <Layout currentPage={page} setPage={setPage}>
        {page === 'chart' && <DividendChart />}

        {page === 'data' && (
          <div className="card">
            <DividendData />
          </div>
        )}

        {['form', 'ocr', 'text'].includes(page) && <InputSection />}

        {page === 'calendar' && (
          <DividendCalendar />
        )}

        {page === 'portfolio' && (
          <PortfolioAnalysis />
        )}

        {page === 'simulator' && (
          <DividendSimulator />
        )}
      </Layout>
    </ThemeProvider>
  );
}

export default App;
