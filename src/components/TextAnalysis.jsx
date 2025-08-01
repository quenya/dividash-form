import React, { useState } from 'react';
import { extractDividendFromText } from '../api/llmService';
import insertDividend from '../api/insertDividend';

function TextAnalysis() {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [message, setMessage] = useState('');

  const analyzeText = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    setMessage('');

    try {
      const result = await extractDividendFromText(inputText);
      setExtractedData(result);
      setMessage('텍스트 분석이 완료되었습니다. 정보를 확인해주세요.');
    } catch (error) {
      setMessage('텍스트 분석 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData) return;

    try {
      await insertDividend({
        ...extractedData,
        input_method: 'llm',
        confidence_score: extractedData.confidence || 0.9
      });
      setMessage('배당금 정보가 성공적으로 저장되었습니다!');
      // Reset form
      setInputText('');
      setExtractedData(null);
    } catch (error) {
      setMessage('저장 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const updateExtractedData = (field, value) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>텍스트 분석 입력 (LLM)</h2>

      <div style={{ marginBottom: 20 }}>
        <label>배당금 알림 텍스트를 붙여넣어 주세요:</label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="예: [신한투자증권] 삼성전자 배당금 1,200원이 입금되었습니다. 2024-03-15"
          style={{
            width: '100%',
            height: 120,
            padding: 10,
            marginTop: 10,
            marginBottom: 10,
            border: '1px solid #ddd',
            borderRadius: 4
          }}
        />
        <button
          onClick={analyzeText}
          disabled={!inputText.trim() || isAnalyzing}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          {isAnalyzing ? '분석 중...' : '텍스트 분석'}
        </button>
      </div>

      {extractedData && (
        <div style={{ marginBottom: 20 }}>
          <h3>추출된 정보:</h3>
          <div style={{ display: 'grid', gap: 10, maxWidth: 400 }}>
            <div>
              <label>증권사명:</label>
              <input
                type="text"
                value={extractedData.account_name || ''}
                onChange={(e) => updateExtractedData('account_name', e.target.value)}
                style={{ width: '100%', padding: 5 }}
              />
            </div>
            <div>
              <label>계좌 유형:</label>
              <input
                type="text"
                value={extractedData.account_type || ''}
                onChange={(e) => updateExtractedData('account_type', e.target.value)}
                style={{ width: '100%', padding: 5 }}
                placeholder="퇴직연금, 개인연금, 일반계좌"
              />
            </div>
            <div>
              <label>계좌번호:</label>
              <input
                type="text"
                value={extractedData.account_number || ''}
                onChange={(e) => updateExtractedData('account_number', e.target.value)}
                style={{ width: '100%', padding: 5 }}
                placeholder="예: 312-53-****480, A458730"
              />
            </div>
            <div>
              <label>종목명:</label>
              <input
                type="text"
                value={extractedData.stock || ''}
                onChange={(e) => updateExtractedData('stock', e.target.value)}
                style={{ width: '100%', padding: 5 }}
              />
            </div>
            <div>
              <label>배당금액:</label>
              <input
                type="number"
                value={extractedData.dividend_amount || ''}
                onChange={(e) => updateExtractedData('dividend_amount', parseFloat(e.target.value))}
                style={{ width: '100%', padding: 5 }}
              />
            </div>
            <div>
              <label>지급일:</label>
              <input
                type="date"
                value={extractedData.payment_date || ''}
                onChange={(e) => updateExtractedData('payment_date', e.target.value)}
                style={{ width: '100%', padding: 5 }}
              />
            </div>
            <div>
              <label>통화:</label>
              <select
                value={extractedData.currency || 'KRW'}
                onChange={(e) => updateExtractedData('currency', e.target.value)}
                style={{ width: '100%', padding: 5 }}
              >
                <option value="KRW">KRW</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              저장
            </button>
          </div>

          {extractedData.confidence && (
            <div style={{ marginTop: 10, fontSize: '0.9em', color: '#666' }}>
              신뢰도: {Math.round(extractedData.confidence * 100)}%
              {extractedData.account_type && (
                <> • 계좌유형: {extractedData.account_type}</>
              )}
              {extractedData.account_number && (
                <> • 계좌번호: {extractedData.account_number}</>
              )}
            </div>
          )}
        </div>
      )}

      {message && (
        <div style={{
          padding: 10,
          marginTop: 10,
          backgroundColor: message.includes('오류') ? '#f8d7da' : '#d4edda',
          color: message.includes('오류') ? '#721c24' : '#155724',
          border: `1px solid ${message.includes('오류') ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: 4
        }}>
          {message}
        </div>
      )}

      <div style={{ marginTop: 30, padding: 15, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
        <h4>지원하는 텍스트 형식 예시:</h4>
        <ul style={{ fontSize: '0.9em', color: '#666' }}>
          <li>[미래에셋증권] 퇴직연금 권리 입금 안내<br/>
              개인형IRP 계좌 312-53-****480<br/>
              SOL 미국배당미국채혼합50<br/>
              12,650원 2025.07.16 배당금입금 처리되었습니다.</li>
          <li>[미래에셋증권] 권리 입금 안내<br/>
              010-67**-**68-1<br/>
              A458730 미래에셋 TIGER 미국배당다우존스증권상장지수투자신탁(주식) ETF분배금입금<br/>
              배정금액 : 11,798원(세전)</li>
          <li>[신한투자증권] 삼성전자 배당금 1,200원이 입금되었습니다.</li>
        </ul>
      </div>
    </div>
  );
}

export default TextAnalysis;
