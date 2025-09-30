import React, { useState } from 'react';
import DividendForm from './components/DividendForm';
import DividendChart from './components/DividendChart';
import OCRUpload from './components/OCRUpload';
import TextAnalysis from './components/TextAnalysis';
import DividendData from './components/DividendData';
import './styles/App.css';

function App() {
  const [page, setPage] = useState('form');

  return (
    <div className="App">
      <h1>배당 관리 어시스턴트</h1>
      <nav style={{ marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setPage('form')}>수동 입력</button>
        <button onClick={() => setPage('ocr')}>영수증 OCR 입력</button>
        <button onClick={() => setPage('text')}>텍스트 분석 입력</button>
        <button onClick={() => setPage('chart')}>대시보드</button>
        <button onClick={() => setPage('data')}>배당 데이터</button>
      </nav>
      {page === 'form' && <DividendForm />}
      {page === 'ocr' && <OCRUpload />}
      {page === 'text' && <TextAnalysis />}
      {page === 'chart' && <DividendChart />}
      {page === 'data' && <DividendData />}
    </div>
  );
}

export default App;
