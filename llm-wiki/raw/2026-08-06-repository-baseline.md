# DiviDash Repository Baseline - 2026-08-06

이 snapshot은 초기 LLM Wiki 생성 직전 commit `91926cc1d8cb036dc6c5dbeb4265d9d4964c7c9e`의 구조를 설명한다. 완전한 원본은 해당 Git commit이며 이 문서는 탐색용 manifest다.

## Application

- Runtime: React 18, Create React App
- Entry and page selection: [`src/App.jsx`](../../src/App.jsx)
- Navigation and responsive shell: [`src/components/Layout.jsx`](../../src/components/Layout.jsx)
- Authentication: [`src/context/AuthContext.jsx`](../../src/context/AuthContext.jsx), [`src/components/AuthGate.jsx`](../../src/components/AuthGate.jsx)
- Database client: [`src/api/supabaseClient.js`](../../src/api/supabaseClient.js)

## Data and input

- Central insert path: [`src/api/insertDividend.js`](../../src/api/insertDividend.js)
- Manual input: [`src/components/DividendForm.jsx`](../../src/components/DividendForm.jsx)
- OCR input: [`src/components/OCRUpload.jsx`](../../src/components/OCRUpload.jsx), [`src/api/ocrService.js`](../../src/api/ocrService.js)
- Text input: [`src/components/TextAnalysis.jsx`](../../src/components/TextAnalysis.jsx), [`src/api/llmService.js`](../../src/api/llmService.js)
- Shared reads and exchange rate: [`src/hooks/useDividendData.js`](../../src/hooks/useDividendData.js)

## Database

- Base dividend schema: [`sheet/supabase_setup.sql`](../../sheet/supabase_setup.sql)
- Ticker, goal, simulator schema: [`database/schema_update.sql`](../../database/schema_update.sql)
- User ownership and RLS hardening: [`database/security_hardening.sql`](../../database/security_hardening.sql)

## Verification evidence

- `git ls-files`로 tracked source inventory를 확인했다.
- `src/`, `database/`, `sheet/`, `package.json`, root agent 문서를 직접 읽어 초기 Wiki를 작성했다.
- 이 snapshot에는 `.env`, token 값, 사용자 데이터가 포함되지 않는다.
