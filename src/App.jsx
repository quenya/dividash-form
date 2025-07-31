import React, { useState } from 'react';
import DividendForm from './components/DividendForm';
import DividendChart from './components/DividendChart';
import OCRUpload from './components/OCRUpload';
import TextAnalysis from './components/TextAnalysis';
import './styles/App.css';

function App() {
  const [page, setPage] = useState('form');
  return (
    <div className="App">
      <h1>DiviDash - 배당금 관리 대시보드</h1>
      <nav style={{ marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setPage('form')}>수동 입력</button>
        <button onClick={() => setPage('ocr')}>화면 캡처 입력</button>
        <button onClick={() => setPage('text')}>텍스트 분석 입력</button>
        <button onClick={() => setPage('chart')}>배당 차트</button>
      </nav>
      {page === 'form' && <DividendForm />}
      {page === 'ocr' && <OCRUpload />}
      {page === 'text' && <TextAnalysis />}
      {page === 'chart' && <DividendChart />}
    </div>
  );
}

export default App;
