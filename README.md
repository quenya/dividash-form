# DiviDash - 배당금 관리 대시보드

배당금 데이터를 입력, 시각화하고 관리할 수 있는 React 기반 웹 애플리케이션입니다.

## 주요 기능

### 📝 배당금 입력
#### 수동 입력
- 계좌명, 종목명, 배당금액, 지급일, 통화 입력 폼
- KRW/USD 통화 지원
- 실시간 입력 검증 및 성공/실패 알림

#### 🤖 AI 기반 자동 입력
- **화면 캡처 입력 (OCR)**: 배당금 입금 화면 캡처를 업로드하면 문자 인식을 통해 계좌, 종목, 금액 자동 식별
- **텍스트 분석 입력 (LLM)**: 배당금 입금 내역 문자를 붙여넣기하면 LLM 질의를 통해 계좌, 종목, 금액 자동 식별
- 자동 식별된 정보는 수정 가능하며, 확인 후 저장
- Supabase를 통한 데이터 저장

### 📊 데이터 시각화
- **월별 배당금 차트**: 연도별 월간 배당금 수익 비교
- **배당 예측 차트**: 과거 데이터 기반 미래 배당금 예측
- Chart.js 기반 인터랙티브 차트
- 통화별 금액 표시 (₩, $)

### 📂 데이터 관리
- CSV 파일에서 배당금 데이터 일괄 가져오기
- 연도별 배당 데이터 관리 (2022-2025)
- 자동화된 데이터 입력 스크립트

## 기술 스택

### Frontend
- **React 18** - 컴포넌트 기반 UI 라이브러리
- **Chart.js & React-ChartJS-2** - 데이터 시각화
- **CSS 모듈** - 스타일링

### Backend & Database
- **Supabase** - Backend-as-a-Service
- **Supabase JS Client** - 실시간 데이터베이스 연동

### AI & 자동화
- **OCR API** - 화면 캡처 이미지에서 텍스트 추출
- **LLM API** - 자연어 텍스트에서 배당금 정보 추출
- **이미지 처리** - 파일 업로드 및 전처리

### 개발 도구
- **Create React App** - React 개발 환경
- **CSV-Parse** - CSV 데이터 처리
- **Chart.js Plugin DataLabels** - 차트 라벨링

## 프로젝트 구조

```
dividash-form/
├── src/
│   ├── App.jsx                    # 메인 애플리케이션
│   ├── index.jsx                  # 애플리케이션 진입점
│   ├── components/
│   │   ├── DividendForm.jsx       # 배당금 입력 폼
│   │   ├── DividendChart.jsx      # 월별 배당금 차트
│   │   ├── DividendPredictionChart.jsx # 배당 예측 차트
│   │   ├── OCRUpload.jsx          # 화면 캡처 OCR 입력
│   │   └── TextAnalysis.jsx       # 텍스트 분석 LLM 입력
│   ├── api/
│   │   ├── insertDividend.js      # Supabase 데이터 삽입 API
│   │   ├── ocrService.js          # OCR API 서비스
│   │   └── llmService.js          # LLM API 서비스
│   └── styles/
│       └── App.css                # 애플리케이션 스타일
├── sheet/
│   ├── import_dividends.js        # CSV 데이터 가져오기 스크립트
│   ├── dividend_entries_rows.sql  # 데이터베이스 스키마
│   └── 배당정리 - *.csv          # 연도별 배당 데이터
└── public/
    └── index.html
```

## 시작하기

### 사전 요구사항
- Node.js 16.0 이상
- Supabase 계정 및 프로젝트
- OCR API 키 (예: Google Cloud Vision, AWS Textract)
- LLM API 키 (예: OpenAI GPT, Claude)

### 설치 및 실행

1. **의존성 설치**
```bash
npm install
```

2. **환경 변수 설정**
`.env` 파일을 생성하고 필요한 API 정보를 입력:
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_OCR_API_KEY=your_ocr_api_key
REACT_APP_LLM_API_KEY=your_llm_api_key
```

3. **개발 서버 실행**
```bash
npm start
```

4. **데이터베이스 설정**
`sheet/dividend_entries_rows.sql` 파일을 사용하여 Supabase에 테이블 생성

### CSV 데이터 가져오기

기존 CSV 파일에서 데이터를 일괄 가져오려면:

```bash
cd sheet
node import_dividends.js
```

## 사용 방법

### 1. 수동 입력
- "배당 입력" 탭에서 직접 정보를 입력하여 저장

### 2. 화면 캡처 입력 (OCR)
1. 증권사 앱의 배당금 입금 화면을 캡처
2. "화면 캡처 입력" 탭에서 이미지 업로드
3. OCR이 자동으로 계좌, 종목, 금액을 인식
4. 인식된 정보를 확인/수정 후 저장

### 3. 텍스트 분석 입력 (LLM)
1. 증권사에서 받은 배당금 입금 문자나 알림 텍스트를 복사
2. "텍스트 분석 입력" 탭에서 텍스트 붙여넣기
3. LLM이 자동으로 배당금 정보를 추출
4. 추출된 정보를 확인/수정 후 저장

## 주요 컴포넌트

### DividendForm
- 사용자 친화적인 배당금 입력 인터페이스
- 실시간 유효성 검사
- 다중 통화 지원

### OCRUpload
- 이미지 파일 업로드 및 미리보기
- OCR API를 통한 텍스트 추출
- 추출된 정보의 구조화 및 검증

### TextAnalysis
- 텍스트 입력 및 분석 인터페이스
- LLM을 통한 배당금 정보 추출
- 자연어 처리 결과의 구조화

### DividendChart
- 월별 배당금 수익 시각화
- 연도별 데이터 비교
- 인터랙티브 바 차트

### DividendPredictionChart
- 과거 데이터 기반 미래 배당금 예측
- 라인 차트를 통한 트렌드 표시

## AI 기능 상세

### OCR (문자 인식)
- 지원 이미지 형식: PNG, JPG, JPEG
- 인식 가능한 정보: 계좌명, 종목명, 배당금액, 입금일
- 인식 정확도 향상을 위한 이미지 전처리

### LLM (자연어 처리)
- 다양한 형태의 배당금 알림 텍스트 처리
- 구조화되지 않은 텍스트에서 정보 추출
- 컨텍스트 기반 정보 검증 및 보완

## 데이터베이스 스키마

```sql
dividend_entries (
  id: UUID (Primary Key)
  account_name: TEXT
  stock: TEXT
  dividend_amount: NUMERIC
  payment_date: DATE
  currency: TEXT
  input_method: TEXT        -- 'manual', 'ocr', 'llm', 'csv'
  confidence_score: NUMERIC -- AI 입력 시 신뢰도 점수
  created_at: TIMESTAMP
)
```

## 라이선스

이 프로젝트는 개인 사용을 위한 프로젝트입니다.
