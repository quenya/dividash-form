-- 배당금 입력 테이블 스키마 업데이트 (AI 기능 지원)
-- 새로운 컬럼 추가를 위한 ALTER 명령어들

-- 1. input_method 컬럼 추가 (입력 방법 구분)
ALTER TABLE dividend_entries
ADD COLUMN IF NOT EXISTS input_method TEXT DEFAULT 'manual'
CHECK (input_method IN ('manual', 'ocr', 'llm', 'csv'));

-- 2. confidence_score 컬럼 추가 (AI 입력 시 신뢰도)
ALTER TABLE dividend_entries
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC
CHECK (confidence_score >= 0 AND confidence_score <= 1);

-- 3. account_type 컬럼 추가 (계좌 유형 구분)
ALTER TABLE dividend_entries
ADD COLUMN IF NOT EXISTS account_type TEXT;

-- 4. account_number 컬럼 추가 (계좌번호 마스킹 정보)
ALTER TABLE dividend_entries
ADD COLUMN IF NOT EXISTS account_number TEXT;

-- 5. 기존 데이터의 input_method를 'manual'로 업데이트
UPDATE dividend_entries
SET input_method = 'manual'
WHERE input_method IS NULL;

-- 6. 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_dividend_entries_input_method ON dividend_entries(input_method);
CREATE INDEX IF NOT EXISTS idx_dividend_entries_confidence ON dividend_entries(confidence_score);
CREATE INDEX IF NOT EXISTS idx_dividend_entries_account_type ON dividend_entries(account_type);

-- 7. 새로운 테이블 구조 확인용 (참조용)
/*
최종 테이블 구조:
dividend_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name TEXT NOT NULL,                    -- 증권사명
  account_type TEXT,                             -- 계좌 유형 (퇴직연금, 개인형IRP, 일반계좌 등)
  account_number TEXT,                           -- 마스킹된 계좌번호
  stock TEXT NOT NULL,                           -- 또는 기존 DB에서는 company_name
  dividend_amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  currency TEXT DEFAULT 'KRW',
  input_method TEXT DEFAULT 'manual' CHECK (input_method IN ('manual', 'ocr', 'llm', 'csv')),
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/
