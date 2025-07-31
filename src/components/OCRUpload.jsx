import React, { useState } from 'react';
import { extractDividendFromImage } from '../api/ocrService';
import insertDividend from '../api/insertDividend';

function OCRUpload() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [message, setMessage] = useState('');

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setMessage('');

    try {
      const result = await extractDividendFromImage(image);
      setExtractedData(result);
      setMessage('이미지 분석이 완료되었습니다. 정보를 확인해주세요.');
    } catch (error) {
      setMessage('이미지 분석 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData) return;

    try {
      await insertDividend({
        ...extractedData,
        input_method: 'ocr',
        confidence_score: extractedData.confidence || 0.8
      });
      setMessage('배당금 정보가 성공적으로 저장되었습니다!');
      // Reset form
      setImage(null);
      setImagePreview(null);
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
      <h2>화면 캡처 입력 (OCR)</h2>

      <div style={{ marginBottom: 20 }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ marginBottom: 10 }}
        />
        <button
          onClick={analyzeImage}
          disabled={!image || isAnalyzing}
          style={{ marginLeft: 10 }}
        >
          {isAnalyzing ? '분석 중...' : '이미지 분석'}
        </button>
      </div>

      {imagePreview && (
        <div style={{ marginBottom: 20 }}>
          <h3>업로드된 이미지:</h3>
          <img
            src={imagePreview}
            alt="Uploaded"
            style={{ maxWidth: 400, maxHeight: 300, border: '1px solid #ddd' }}
          />
        </div>
      )}

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
                placeholder="예: 퇴직연금, 개인형IRP, 일반계좌"
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
                cursor: 'pointer'
              }}
            >
              저장
            </button>
          </div>
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
    </div>
  );
}

export default OCRUpload;
