// LLM API를 사용하여 텍스트에서 배당금 정보를 추출하는 서비스

export async function extractDividendFromText(text) {
  // LLM API 호출 제외하고 로컬 정규식 파싱만 사용
  return fallbackTextParsing(text);
}

// 데이터 검증 및 후처리 함수
function validateAndProcessData(data) {
  const result = {
    account_name: data.account_name || '',
    company_name: data.company_name || data.stock || '',
    dividend_amount: parseFloat(data.dividend_amount) || null,
    payment_date: data.payment_date || new Date().toISOString().slice(0, 10),
    currency: data.currency || 'KRW',
    confidence: data.confidence || 0.8
  };

  // 날짜 형식 검증
  if (result.payment_date && !isValidDate(result.payment_date)) {
    result.payment_date = new Date().toISOString().slice(0, 10);
  }

  // 통화 검증
  if (!['KRW', 'USD'].includes(result.currency)) {
    result.currency = 'KRW';
  }

  return result;
}

// 날짜 유효성 검사
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

// 폴백 텍스트 파싱 (LLM API 실패 시) - 한국 증권사 문자에 최적화
function fallbackTextParsing(text) {
  const result = {
    brokerage_name: '',
    account_name: '',
    account_type: '',
    account_number: '',
    company_name: '',
    dividend_amount: null,
    payment_date: new Date().toISOString().slice(0, 10),
    currency: 'KRW',
    confidence: 0.7
  };

  // 증권사명 추출 - 대괄호 패턴과 일반 패턴 모두 지원
  const brokeragePatterns = [
    /\[([^\]]*증권[^\]]*)\]/,  // [미래에셋증권] 형태
    /\[([^\]]*투자[^\]]*)\]/,  // [신한투자증권] 형태
    /미래에셋증권|미래에셋/,
    /신한투자증권|신한투자/,
    /키움증권|키움/,
    /삼성증권|삼성투자/,
    /NH투자증권|NH증권/,
    /한국투자증권|한투증권|한투/,
    /대신증권/,
    /하나금융투자|하나증권/,
    /KB증권/,
    /토스증권/,
    /카카오페이증권/,
    /유안타증권/,
    /교보증권/,
    /IBK투자증권/,
    /현대차증권/
  ];

  for (const pattern of brokeragePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.brokerage_name = match[1] || match[0];
      // 대괄호 제거
      result.brokerage_name = result.brokerage_name.replace(/[\[\]]/g, '');
      break;
    }
  }

  // 종목명 추출 - 한국 ETF와 종목명에 최적화 (더 많은 패턴 추가)
  const stockPatterns = [
    // 종목코드 패턴: A4... 형태의 종목코드 다음에 오는 종목명 (최우선 패턴)
    /([A-Z]\d+)\s+([가-힣A-Za-z0-9\s&()]+(?:ETF|투자신탁|지수투자신탁)(?:\([가-힣]+\))?)/,
    // ETF 풀네임 패턴 (새로 추가)
    /(한국투자\s*ACE\s*[가-힣A-Za-z0-9&\s()]+(?:ETF|투자신탁|지수투자신탁))/,
    /(미래에셋\s*TIGER\s*[가-힣A-Za-z0-9&\s()]+(?:ETF|투자신탁))/,
    /(TIGER\s*[가-힣A-Za-z0-9&\s()]+(?:ETF|투자신탁|지수투자신탁))/,
    /(미래에셋\s*[가-힣A-Za-z0-9&\s()]+(?:ETF|투자신탁))/,
    // 기존 ETF 패턴
    /(SOL\s*[가-힣A-Za-z0-9\s]+)/,
    /(TIGER\s*[가-힣A-Za-z0-9&\s]+)/,
    /(KODEX\s*[가-힣A-Za-z0-9\s]+)/,
    /(ACE\s*[가-힣A-Za-z0-9\s]+)/,
    /(ARIRANG\s*[가-힣A-Za-z0-9\s]+)/,
    // 일반 종목명
    /(삼성전자|LG화학|SK하이닉스|현대차|기아|포스코|NAVER|카카오|네이버)/,
    // 해외 종목
    /([A-Z]{2,5})\s*배당/,  // 영문 종목코드
    // 일반적인 패턴
    /\n([가-힣A-Za-z0-9\s&]+)\n.*?배당금/,
    /계좌\s*[0-9\-*]+\s*\n([가-힣A-Za-z0-9\s&]+)/
  ];

  for (const pattern of stockPatterns) {
    const match = text.match(pattern);
    if (match) {
      // 종목코드 패턴인 경우 match[2] (종목명)을 사용, 아니면 match[1] 사용
      if (pattern.source.includes('([A-Z]\\d+)\\s+([')) {
        result.company_name = match[2].trim();  // 종목코드 다음의 종목명
      } else {
        result.company_name = match[1].trim();  // 일반적인 경우
      }

      // ETF 이름 정리 및 축약
      if (result.company_name.includes('한국투자 ACE')) {
        // 한국투자 ACE ETF명 축약
        result.company_name = result.company_name
          .replace(/증권상장지수투자신탁.*$/, '')  // 뒤의 긴 설명 제거
          .replace(/\(주식\).*$/, '')  // "(주식)" 이후 제거
          .replace(/ETF.*$/, '')  // "ETF" 이후 제거
          .replace(/지수투자신탁.*$/, '')  // "지수투자신탁" 이후 제거
          .replace(/\s+/g, ' ')  // 중복 공백 제거
          .trim();
      } else if (result.company_name.includes('미래에셋 TIGER') || result.company_name.includes('TIGER')) {
        // 긴 ETF명을 축약된 형태로 변환
        result.company_name = result.company_name
          .replace(/미래에셋\s*/, '')  // "미래에셋" 제거
          .replace(/증권상장지수투자신탁.*$/, '')  // 뒤의 긴 설명 제거
          .replace(/\(주식\).*$/, '')  // "(주식)" 이후 제거
          .replace(/ETF.*$/, '')  // "ETF" 이후 제거
          .replace(/투자신탁.*$/, '')  // "투자신탁" 이후 제거
          .replace(/\s+/g, ' ')  // 중복 공백 제거
          .trim();

        // 최종적으로 "TIGER 미국배당다우존스" 형태로 정리
        if (result.company_name.includes('다우존스')) {
          result.company_name = 'TIGER 미국배당다우존스';
        }
      }

      // 다른 ETF들도 정리
      if (result.company_name.includes('SOL') || result.company_name.includes('KODEX') ||
          result.company_name.includes('ACE')) {
        result.company_name = result.company_name.replace(/\s+/g, ' ').trim();
      }

      break;
    }
  }

  // 금액 추출 - 더 다양한 패턴 지원
  const amountPatterns = [
    // 기본 원화 패턴
    /(\d{1,3}(?:,\d{3})*)\s*원/,  // 12,650원 패턴
    /(\d+,?\d*)\s*원\s*.*?배당금/,
    /배당금.*?(\d{1,3}(?:,\d{3})*)\s*원/,

    // 새로운 패턴들
    /배정금액\s*[:：]\s*(\d{1,3}(?:,\d{3})*)\s*원/,  // 배정금액 : 11,798원
    /입금.*?(\d{1,3}(?:,\d{3})*)\s*원/,
    /(\d{1,3}(?:,\d{3})*)\s*원\s*\(세전\)/,  // 11,798원(세전)

    // 달러 패턴
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*USD/,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*달러/
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.dividend_amount = parseFloat(match[1].replace(/,/g, ''));
      if (pattern.source.includes('\\$') || pattern.source.includes('USD') || pattern.source.includes('달러')) {
        result.currency = 'USD';
      }
      break;
    }
  }

  // 날짜 추출 - 기존 패턴 유지 (현재 예시에는 명시적 날짜가 없음)
  const datePatterns = [
    /(\d{4})\.(\d{1,2})\.(\d{1,2})/,  // 2025.07.16 형태
    /(\d{4})-(\d{1,2})-(\d{1,2})/,   // 2025-07-16 형태
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      let year, month, day;

      if (pattern.source.includes('년')) {
        year = match[1];
        month = match[2].padStart(2, '0');
        day = match[3].padStart(2, '0');
      } else if (pattern.source.includes('\\.')) {
        year = match[1];
        month = match[2].padStart(2, '0');
        day = match[3].padStart(2, '0');
      } else if (pattern.source.includes('\\d{4}')) {
        year = match[1];
        month = match[2].padStart(2, '0');
        day = match[3].padStart(2, '0');
      } else {
        year = match[3];
        month = match[1].padStart(2, '0');
        day = match[2].padStart(2, '0');
      }

      result.payment_date = `${year}-${month}-${day}`;
      break;
    }
  }

  // 계좌번호 추출 (마스킹된 계좌번호) - A4... 형태는 종목코드이므로 제외
  const accountNumberPatterns = [
    /(\d{3}-\d{2}-\*{4}\d{2})/,  // 133-46-****62 형태 (새로 추가)
    /(\d{3}-\d{2}-\*{4}\d{3})/,  // 312-53-****480 형태
    /(\d{3}-\d{2}\*{2}-\*{2}\d{2}-\d)/,  // 010-67**-**68-1 형태 (계좌번호)
    /(\d{10,15})/                // 긴 계좌번호
  ];

  for (const pattern of accountNumberPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.account_number = match[1];
      break;
    }
  }

  // 계좌 유형 추출 - 퇴직연금, 개인연금, 일반계좌로 분류
  if (result.currency === 'USD') {
    // USD 배당금은 모두 일반계좌
    result.account_type = '일반계좌';
  } else {
    // 1. 먼저 계좌번호 패턴으로 유형 확인 (특별 규칙)
    let accountTypeByNumber = null;
    if (result.account_number) {
      if (result.account_number.match(/010-67\*\*-\*\*68-0/)) {
        accountTypeByNumber = '일반계좌';
      } else if (result.account_number.match(/010-67\*\*-\*\*68-[12]/)) {
        accountTypeByNumber = '개인연금';
      } else if (result.account_number.match(/133-46-\*\*\*\*62/)) {
        // 133-46-****62는 연금(구) 계좌로 개인연금으로 분류
        accountTypeByNumber = '개인연금';
      }
    }

    // 2. 텍스트에서 유형 추출
    const accountTypePatterns = [
      { pattern: /퇴직연금|개인형\s*IRP|IRP/, type: '퇴직연금' },
      { pattern: /연금\(신\)|연금\(구\)|KB연금|연금계좌/, type: '개인연금' },
      { pattern: /일반계좌|종합.*주식|직투|위탁/, type: '일반계좌' }
    ];

    let accountTypeByText = null;
    for (const { pattern, type } of accountTypePatterns) {
      const match = text.match(pattern);
      if (match) {
        accountTypeByText = type;
        break;
      }
    }

    // 3. 우선순위: 계좌번호 패턴 > 텍스트 패턴 > 기본값
    if (accountTypeByNumber) {
      result.account_type = accountTypeByNumber;
    } else if (accountTypeByText) {
      result.account_type = accountTypeByText;
    } else {
      result.account_type = '일반계좌';
    }
  }

  // 신뢰도 계산 - 추출된 정보의 완성도에 따라
  let confidence = 0;
  const fields = ['brokerage_name', 'company_name', 'dividend_amount'];  // 필수 필드들
  fields.forEach(field => {
    if (result[field] && result[field] !== '') {
      confidence += 0.25;
    }
  });

  // 선택적 필드들 (계좌 정보)
  const optionalFields = ['account_type', 'account_number', 'account_name'];
  optionalFields.forEach(field => {
    if (result[field] && result[field] !== '') {
      confidence += 0.083;  // 각각 8.3% 추가 (3개 필드)
    }
  });

  // 날짜가 실제로 추출된 경우 보너스 점수
  if (result.payment_date !== new Date().toISOString().slice(0, 10)) {
    confidence += 0.01;
  }

  result.confidence = Math.min(confidence, 1.0);  // 1.0을 초과하지 않도록

  return result;
}
