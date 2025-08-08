import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import { extractDividendFromText } from '../api/llmService';
import insertDividend from '../api/insertDividend';

function TextAnalysis() {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [message, setMessage] = useState('');
  const [accountNames, setAccountNames] = useState([]);
  const [accountNumbers, setAccountNumbers] = useState([]);
  const [accountMapping, setAccountMapping] = useState(new Map());

  const fetchAccountNames = async () => {
    try {
      const { data, error } = await supabase
        .from('dividend_entries')
        .select('account_name')
        .not('account_name', 'is', null)
        .neq('account_name', '');
      
      if (error) throw error;
      
      const uniqueAccountNames = [...new Set(data.map(item => item.account_name))];
      setAccountNames(uniqueAccountNames);
      
      // 계좌번호와 계좌명 매핑 생성
      const mapping = new Map();
      const numbers = new Set();
      
      uniqueAccountNames.forEach(accountName => {
        // 계좌번호 패턴 추출 (예: "133-46-000462 연금(구)" -> "133-46-000462")
        const accountNumberMatch = accountName.match(/^[\d-*]+/);
        if (accountNumberMatch) {
          const accountNumber = accountNumberMatch[0];
          numbers.add(accountNumber);
          mapping.set(accountNumber, accountName);
          mapping.set(accountName, accountNumber);
        }
      });
      
      setAccountNumbers([...numbers]);
      setAccountMapping(mapping);
    } catch (error) {
      console.error('계좌명 목록을 가져오는 중 오류:', error);
    }
  };

  useEffect(() => {
    fetchAccountNames();
  }, []);

  const analyzeText = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    setMessage('');

    try {
      const result = await extractDividendFromText(inputText);
      setExtractedDataWithDefaults(result);
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

  // 계좌번호 선택 시 계좌명 자동 설정
  const handleAccountNumberChange = (accountNumber) => {
    const accountName = accountMapping.get(accountNumber);
    setExtractedData(prev => ({
      ...prev,
      account_number: accountNumber,
      account_name: accountName || prev.account_name
    }));
  };

  // 계좌명 선택 시 계좌번호 자동 설정
  const handleAccountNameChange = (accountName) => {
    const accountNumber = accountMapping.get(accountName);
    setExtractedData(prev => ({
      ...prev,
      account_name: accountName,
      account_number: accountNumber || prev.account_number
    }));
  };

  // extractedData가 설정될 때 기본값 적용
  const setExtractedDataWithDefaults = (data) => {
    setExtractedData({
      ...data,
      account_type: data.account_type || '개인연금'
    });
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
                value={extractedData.brokerage_name || ''}
                onChange={(e) => updateExtractedData('brokerage_name', e.target.value)}
                style={{ width: '100%', padding: 5 }}
                placeholder="예: 미래에셋증권, 신한투자증권"
              />
            </div>
            <div>
              <label>계좌 유형:</label>
              <select
                value={extractedData.account_type || '개인연금'}
                onChange={(e) => updateExtractedData('account_type', e.target.value)}
                style={{ width: '100%', padding: 5 }}
              >
                <option value="개인연금">개인연금</option>
                <option value="퇴직연금">퇴직연금</option>
                <option value="일반계좌">일반계좌</option>
              </select>
            </div>
            <div>
              <label>계좌명:</label>
              <div style={{ display: 'flex', gap: 5 }}>
                <select
                  value={extractedData.account_name || ''}
                  onChange={(e) => handleAccountNameChange(e.target.value)}
                  style={{ flex: 1, padding: 5 }}
                >
                  <option value="">선택하거나 직접 입력</option>
                  {accountNames.map((accountName, index) => (
                    <option key={index} value={accountName}>
                      {accountName}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={extractedData.account_name || ''}
                  onChange={(e) => handleAccountNameChange(e.target.value)}
                  style={{ flex: 1, padding: 5 }}
                  placeholder="예: 133-46-000462 연금(구)"
                />
              </div>
            </div>
            <div>
              <label>종목명:</label>
              <input
                type="text"
                value={extractedData.company_name || ''}
                onChange={(e) => updateExtractedData('company_name', e.target.value)}
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
        <div style={{ fontSize: '0.9em', color: '#666' }}>
          <p><strong>예시 입력:</strong></p>
          <div style={{ backgroundColor: '#fff', padding: 10, borderRadius: 4, fontFamily: 'monospace' }}>
            [미래에셋증권] 권리 입금 안내<br/>
            이종현 고객님<br/>
            133-46-****62<br/>
            A367380 한국투자 ACE 미국나스닥100증권상장지수투자신탁(주식) ETF분배금입금 되었습니다.<br/>
            배정금액 : 7,700원(세전)
          </div>
          <p><strong>추출 결과:</strong></p>
          <ul>
            <li>증권사명: 미래에셋증권</li>
            <li>계좌 유형: 개인연금</li>
            <li>계좌명: 133-46-000462 연금(구) (연동)</li>
            <li>종목명: 한국투자 ACE 미국나스닥100</li>
            <li>배당금액: 7700</li>
            <li>통화: KRW</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TextAnalysis;
