-- Supabase SQL Editor에서 실행할 스크립트
-- 기존 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'dividend_entries'
ORDER BY ordinal_position;

-- 테이블이 없다면 생성
CREATE TABLE IF NOT EXISTS dividend_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name TEXT NOT NULL,
  stock TEXT NOT NULL,
  dividend_amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  currency TEXT DEFAULT 'KRW',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI 기능용 컬럼들 추가
ALTER TABLE dividend_entries
ADD COLUMN IF NOT EXISTS input_method TEXT DEFAULT 'manual';

ALTER TABLE dividend_entries
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC;

ALTER TABLE dividend_entries
ADD COLUMN IF NOT EXISTS account_type TEXT;

ALTER TABLE dividend_entries
ADD COLUMN IF NOT EXISTS account_number TEXT;

-- 제약 조건 추가
ALTER TABLE dividend_entries
ADD CONSTRAINT check_input_method
CHECK (input_method IN ('manual', 'ocr', 'llm', 'csv'));

ALTER TABLE dividend_entries
ADD CONSTRAINT check_confidence_score
CHECK (confidence_score >= 0 AND confidence_score <= 1);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_dividend_entries_input_method ON dividend_entries(input_method);
CREATE INDEX IF NOT EXISTS idx_dividend_entries_account_type ON dividend_entries(account_type);
CREATE INDEX IF NOT EXISTS idx_dividend_entries_payment_date ON dividend_entries(payment_date);

-- 기존 데이터 업데이트
UPDATE dividend_entries
SET input_method = 'manual'
WHERE input_method IS NULL;
