# DiviDash 2.0 - 배당금 관리 대시보드

DiviDash는 배당금 데이터를 입력, 시각화하고 관리하여 경제적 자유 달성을 돕는 React 기반 웹 애플리케이션입니다.

## 🚀 2.0 주요 업데이트 사항

### 1. UI/UX 전면 개편
- **반응형 레이아웃**: 데스크톱(사이드바) 및 모바일(하단 탭) 최적화
- **다크/라이트 모드**: 눈이 편안한 다크 모드 지원
- **현대적 디자인**: 카드형 위젯, 깔끔한 타이포그래피, 직관적인 내비게이션

### 2. 대시보드 강화
- **KPI 카드**: 이번 달 배당금, 연 누적액, 전년 대비 성장률(YoY) 등 핵심 지표 상단 배치
- **목표 관리 (Goal Tracker)**: 월 배당 목표 금액 설정 및 달성률 실시간 시각화
- **통합 차트**: 월별, 연도별, 계좌별, 종목별 트리맵 등 다양한 시각화 제공

### 3. 새로운 기능
- **📅 배당 캘린더**: 월별 캘린더에서 배당 지급일을 한눈에 확인
- **📊 포트폴리오 분석**: 섹터별(기술, 금융, 리츠 등) 비중 도넛 차트 및 종목별 기여도 분석
- **🔔 알림 센터**: 7일 이내 지급 예정인 배당금 알림 제공
- **🤖 스마트 입력**: 기존의 Manual, OCR(화면 캡처), LLM(텍스트) 입력 방식 통합

## 기술 스택

### Frontend
- **React 18**
- **Chart.js** & **React-ChartJS-2**: 데이터 시각화
- **React Calendar**: 캘린더 기능
- **Lucide React**: 아이콘
- **CSS Variables**: 테마 관리 (다크 모드)

### Backend & Database
- **Supabase**: 데이터 저장소 및 인증
- **PostgreSQL**: 관계형 데이터베이스

## 프로젝트 구조

```
dividash-form/
├── src/
│   ├── App.jsx                  # 라우팅 및 메인 상태 관리
│   ├── components/              # UI 컴포넌트
│   │   ├── Layout.jsx           # 반응형 레이아웃 (사이드바/탭바)
│   │   ├── DividendChart.jsx    # 메인 대시보드
│   │   ├── DividendCalendar.jsx # 배당 캘린더
│   │   ├── PortfolioAnalysis.jsx# 포트폴리오 분석
│   │   ├── GoalTracker.jsx      # 목표 관리 위젯
│   │   ├── NotificationCenter.jsx # 알림 센터
│   │   ├── DividendForm.jsx     # 입력 폼
│   │   ├── OCRUpload.jsx        # OCR 입력
│   │   └── TextAnalysis.jsx     # LLM 입력
│   ├── hooks/                   # 커스텀 훅 (useDividendData 등)
│   ├── context/                 # 전역 상태 (ThemeContext)
│   ├── api/                     # Supabase 및 외부 API 연동
│   └── styles/                  # CSS 스타일
├── database/                    # SQL 스크립트
└── public/
```

## 시작하기

### 1. 설치
```bash
npm install
```

### 2. 환경 변수 설정 (.env)
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
# OCR/LLM API 키 (선택 사항)
```

### 3. 실행
```bash
npm start
```

### 4. 데이터베이스 설정 (Supabase)
`database/schema_update.sql` 파일을 실행하여 `tickers` 테이블을 생성하고 초기 데이터를 설정하세요.

```sql
-- tickers 테이블 생성 예시
CREATE TABLE tickers (
    ticker TEXT PRIMARY KEY,
    sector TEXT,
    industry TEXT
    ...
);
```

## 라이선스
개인 학습 및 사용을 위한 프로젝트입니다.
