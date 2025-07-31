// OCR API를 사용하여 이미지에서 배당금 정보를 추출하는 서비스

export async function extractDividendFromImage(imageFile) {
  try {
    // 이미지를 Base64로 변환
    const base64Image = await convertToBase64(imageFile);

    // OCR API 호출 (Google Cloud Vision API 예시)
    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OCR_API_KEY}`
      },
      body: JSON.stringify({
        image: base64Image,
        features: [
          {
            type: 'TEXT_DETECTION',
            maxResults: 1
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('OCR API 호출 실패');
    }

    const data = await response.json();
    const extractedText = data.responses?.[0]?.textAnnotations?.[0]?.description || '';

    // 추출된 텍스트에서 배당금 정보 파싱
    const dividendInfo = parseTextForDividendInfo(extractedText);

    return {
      ...dividendInfo,
      confidence: calculateConfidence(dividendInfo),
      raw_text: extractedText
    };

  } catch (error) {
    console.error('OCR 처리 오류:', error);
    throw new Error('이미지에서 텍스트를 추출할 수 없습니다.');
  }
}

// 파일을 Base64로 변환하는 헬퍼 함수
function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // data:image/jpeg;base64, 부분 제거
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// 텍스트에서 배당금 정보를 파싱하는 함수
function parseTextForDividendInfo(text) {
  const result = {
    account_name: '',
    stock: '',
    dividend_amount: null,
    payment_date: '',
    currency: 'KRW'
  };

  // 계좌명 추출 (증권사명 패턴)
  const accountPatterns = [
    /(\w+투자증권|\w+증권)/,
    /키움|신한|NH|삼성|미래에셋|한국투자|대신|하나|KB/
  ];

  for (const pattern of accountPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.account_name = match[0];
      break;
    }
  }

  // 종목명 추출
  const stockPatterns = [
    /([A-Z]{2,5})\s*배당/,  // 영문 종목코드
    /([\w가-힣]+)\s*배당/,  // 한글 종목명
    /종목[:\s]*([A-Za-z가-힣0-9]+)/
  ];

  for (const pattern of stockPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.stock = match[1];
      break;
    }
  }

  // 금액 추출
  const amountPatterns = [
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*원/,  // 한국 원화
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,  // 달러
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*USD/  // USD
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.dividend_amount = parseFloat(match[1].replace(/,/g, ''));
      if (pattern.source.includes('\\$') || pattern.source.includes('USD')) {
        result.currency = 'USD';
      }
      break;
    }
  }

  // 날짜 추출
  const datePatterns = [
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{4})\.(\d{2})\.(\d{2})/,
    /(\d{2})\/(\d{2})\/(\d{4})/
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern.source.includes('\\d{4}')) {
        result.payment_date = `${match[1]}-${match[2]}-${match[3]}`;
      } else {
        result.payment_date = `${match[3]}-${match[1]}-${match[2]}`;
      }
      break;
    }
  }

  // 날짜가 없으면 오늘 날짜 사용
  if (!result.payment_date) {
    result.payment_date = new Date().toISOString().slice(0, 10);
  }

  return result;
}

// 신뢰도 계산 함수
function calculateConfidence(dividendInfo) {
  let confidence = 0;
  let totalFields = 0;

  const fields = ['account_name', 'stock', 'dividend_amount', 'payment_date'];

  fields.forEach(field => {
    totalFields++;
    if (dividendInfo[field] && dividendInfo[field] !== '') {
      confidence++;
    }
  });

  return confidence / totalFields;
}
