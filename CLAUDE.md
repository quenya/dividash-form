# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 개발 명령어

### 핵심 개발 명령어
- `npm start` - 개발 서버 시작 (React 앱)
- `npm run build` - 프로덕션용 빌드
- `npm test` - 테스트 실행

### 데이터 관리
- `cd sheet && node import_dividends.js` - CSV 파일에서 배당금 데이터 가져오기
- `cd sheet && node test_connection.js` - Supabase 데이터베이스 연결 테스트

## 아키텍처 개요

### 애플리케이션 구조
AI 기반 입력 기능을 갖춘 React 기반의 배당금 관리 대시보드(DiviDash)입니다. 탭 기반 네비게이션 시스템으로 4개의 주요 화면을 제공합니다:

1. **수동 입력** (`DividendForm`) - 전통적인 폼 기반 배당금 입력
2. **화면 캡처 입력** (`OCRUpload`) - OCR을 활용한 이미지 기반 배당금 추출
3. **텍스트 분석 입력** (`TextAnalysis`) - LLM을 활용한 자연어 텍스트 파싱
4. **차트** (`DividendChart`) - 배당금 이력 데이터 시각화

### 기술 스택
- **프론트엔드**: React 18 with Create React App
- **데이터베이스**: Supabase (PostgreSQL)
- **차트**: Chart.js with React-ChartJS-2
- **AI 서비스**: OCR API (Google Cloud Vision) + LLM API (OpenAI GPT)
- **데이터 처리**: csv-parse for bulk imports

### 데이터베이스 스키마
주요 테이블인 `dividend_entries`의 핵심 컬럼들:
- 핵심 데이터: `account_name`, `stock`, `dividend_amount`, `payment_date`, `currency`
- AI 기능: `input_method` ('manual'|'ocr'|'llm'|'csv'), `confidence_score` (0-1)
- 계좌 정보: `account_type`, `account_number` (한국 증권사 연동용)

### 필수 환경 변수
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key  
REACT_APP_OCR_API_KEY=your_ocr_api_key
REACT_APP_LLM_API_KEY=your_llm_api_key
```

## 주요 컴포넌트

### 데이터 흐름
1. **수동 입력**: `DividendForm` → `insertDividend` → Supabase
2. **OCR 입력**: `OCRUpload` → `ocrService` → `insertDividend` → Supabase  
3. **LLM 입력**: `TextAnalysis` → `llmService` → `insertDividend` → Supabase

### AI 서비스 아키텍처
- **OCR 서비스** (`src/api/ocrService.js`): 한국 증권사 형식에 최적화된 정규식 패턴을 사용하여 배당금 알림 스크린샷에서 텍스트 추출
- **LLM 서비스** (`src/api/llmService.js`): 한국 배당금 문자 파싱을 위한 전문 프롬프트를 적용한 OpenAI GPT 활용, 폴백 정규식 파싱 포함

### 한국 증권사 연동
AI 서비스는 한국 증권사에 특화되어 최적화되었습니다:
- 주요 증권사 지원: 미래에셋증권, 신한투자증권, 키움증권 등
- 한국 통화 형식 처리 (12,650원)
- 계좌 유형 파싱: 퇴직연금, 개인형IRP, 일반계좌
- 마스킹된 계좌번호 추출 (312-53-****480 형식)
- 한국 ETF명 인식 (TIGER, SOL, KODEX 시리즈)

### 차트 컴포넌트
- **DividendChart**: 연도별 월간 배당금 시각화
- **DividendPredictionChart**: 과거 데이터 기반 미래 배당금 예측
- 둘 다 Chart.js를 사용하여 원화(₩)와 달러($) 형식 지원

## 파일 구조

```
src/
├── App.jsx                 # 탭 네비게이션이 있는 메인 앱
├── components/
│   ├── DividendForm.jsx    # 자동완성 기능이 있는 수동 입력 폼
│   ├── DividendChart.jsx   # 월별 배당금 막대 차트
│   ├── DividendPredictionChart.jsx # 예측 라인 차트
│   ├── OCRUpload.jsx       # 이미지 업로드 + OCR 처리
│   └── TextAnalysis.jsx    # 텍스트 입력 + LLM 처리
├── api/
│   ├── insertDividend.js   # Supabase 데이터 삽입
│   ├── ocrService.js       # OCR 텍스트 추출 + 파싱
│   └── llmService.js       # LLM 분석 + 폴백 파싱
└── styles/
    └── App.css             # 애플리케이션 스타일

sheet/                      # 데이터베이스 & 데이터 관리
├── supabase_setup.sql      # 데이터베이스 스키마 설정
├── add_ai_columns.sql      # AI 기능 컬럼 추가
├── import_dividends.js     # CSV 일괄 가져오기 스크립트
└── *.csv                   # 과거 배당금 데이터 (2022-2025)
```

## 개발 가이드라인

### 코드 패턴
- 컴포넌트는 훅을 사용하는 함수형 컴포넌트 사용
- Supabase 클라이언트는 필요한 각 컴포넌트에서 초기화
- 폼 검증은 HTML5 required 속성 사용
- try/catch와 사용자 친화적 알림으로 에러 처리
- 인라인 스타일을 사용한 반응형 CSS

### AI 서비스 연동
- OCR과 LLM 서비스는 API 실패 시 폴백 메커니즘 보유
- 신뢰도 점수(0-1)로 AI 추출 신뢰성 추적
- 두 서비스 모두 한국어 텍스트 파싱을 위한 광범위한 정규식 패턴 포함
- 데이터베이스 삽입 전 입력 검증으로 데이터 일관성 보장

### 데이터 관리
- 과거 데이터 일괄 가져오기는 `sheet/import_dividends.js` 사용
- CSV 파일 형식: account_name, stock, dividend_amount, payment_date, currency
- 데이터베이스 마이그레이션은 `sheet/` 폴더의 SQL 파일들

### 데이터베이스 연결 테스트
개발 전 항상 Supabase 연결 테스트:
```bash
cd sheet
node test_connection.js
```