-- 기존 dividend_entries 테이블에 AI 기능용 컬럼 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. AI 기능용 컬럼들 추가
ALTER TABLE dividend_entries
ADD COLUMN IF NOT EXISTS input_method TEXT DEFAULT 'manual';

ALTER TABLE dividend_entries
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC;

ALTER TABLE dividend_entries
ADD COLUMN IF NOT EXISTS account_type TEXT;

ALTER TABLE dividend_entries
ADD COLUMN IF NOT EXISTS account_number TEXT;

-- 2. 제약 조건 추가 (기존 제약 조건이 있다면 무시됨)
DO $$
BEGIN
    BEGIN
        ALTER TABLE dividend_entries
        ADD CONSTRAINT check_input_method
        CHECK (input_method IN ('manual', 'ocr', 'llm', 'csv'));
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;

    BEGIN
        ALTER TABLE dividend_entries
        ADD CONSTRAINT check_confidence_score
        CHECK (confidence_score >= 0 AND confidence_score <= 1);
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;
END $$;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_dividend_entries_input_method ON dividend_entries(input_method);
CREATE INDEX IF NOT EXISTS idx_dividend_entries_account_type ON dividend_entries(account_type);
CREATE INDEX IF NOT EXISTS idx_dividend_entries_payment_date ON dividend_entries(payment_date);

-- 4. 기존 데이터 업데이트 (모든 기존 데이터를 'manual' 입력으로 표시)
UPDATE dividend_entries
SET input_method = 'manual'
WHERE input_method IS NULL;

-- 5. 컬럼 추가 확인용 쿼리
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'dividend_entries'
AND column_name IN ('input_method', 'confidence_score', 'account_type', 'account_number')
ORDER BY column_name;
