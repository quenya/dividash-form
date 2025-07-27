import React, { useState } from 'react';
import DividendForm from './components/DividendForm';
import DividendChart from './components/DividendChart';
import './styles/App.css';

function App() {
  const [page, setPage] = useState('form');
  return (
    <div className="App">
      <h1>배당대시</h1>
      <nav style={{ marginBottom: 24, display: 'flex', gap: 16 }}>
        <button onClick={() => setPage('form')}>배당 입력</button>
        <button onClick={() => setPage('chart')}>배당 차트</button>
      </nav>
      {page === 'form' && <DividendForm />}
      {page === 'chart' && <DividendChart />}
    </div>
  );
}

export default App;
