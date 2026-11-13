---
title: Application Architecture
type: architecture
status: current
updated: 2026-11-13
source_refs: [S002, S017, S018]
tags: [react, supabase, auth, data-flow]
---

# Application Architecture

## Runtime composition

`src/index.jsx`가 React application을 시작하고 [`App.jsx`](../../src/App.jsx)가 `ThemeProvider → AuthProvider → AuthGate → AppContent` 순서로 runtime tree를 구성한다. 별도의 router package 없이 `page` state가 화면을 선택한다.

Current authentication surface는 email/password sign-in과 sign-up, sign-out만 제공한다. Password recovery와 account settings는 unmerged prototype 지식으로만 존재하며 current runtime capability로 간주하지 않는다. 자세한 경계는 [Authentication UX](./authentication-ux.md)를 따른다.

## Data boundary

[`supabaseClient.js`](../../src/api/supabaseClient.js)가 `REACT_APP_SUPABASE_URL`과 `REACT_APP_SUPABASE_ANON_KEY`로 browser client를 한 번 생성한다. Component와 hook은 이 client를 공유한다.

```text
AuthGate / AuthContext
        |
        v
React screens --> Supabase client --> Auth + PostgreSQL/RLS
        |
        +--> Frankfurter USD/KRW API
        +--> Google Vision path (currently falls back; see Known gaps)
```

## Read paths

- [`useDividendData.js`](../../src/hooks/useDividendData.js): `dividend_entries`, `tickers`, `ticker_matches`를 조회하고 USD/KRW 환율을 결합한다.
- [`DividendData.jsx`](../../src/components/DividendData.jsx): 월 단위 `payment_date` 범위로 ledger를 조회한다. 초기 월은 사용자의 local current month이며, 다음달/지난달 navigation을 제공한다. 월별 query는 exact count를 포함하고 기본 page size는 해당 월 전체이며, 500행 단위 offset fetch와 `id` tie-breaker로 API 기본 row limit과 동률 정렬에 대응한다. 10/25/50을 선택하면 월 내부 server-side pagination을 적용한다.
- Dashboard, calendar, portfolio, notifications는 배당 데이터를 목적별로 재구성한다. Portfolio의 종목별 기여도 표는 `confirmed` 매칭의 검증된 실제 종목명을 우선 표시하고, 미확인 항목은 원본 입력값과 확인 대기 상태를 표시한다.
- Goal과 simulator는 각각 `user_goals`, `simulation_settings`를 현재 user ID로 조회한다.

## Write paths

- 배당 입력은 manual, OCR, text 화면에서 [`insertDividend.js`](../../src/api/insertDividend.js)로 수렴한다.
- `insertDividend`는 `supabase.auth.getUser()`로 현재 user를 다시 확인하고 row의 `user_id`를 설정한다.
- Goal과 simulator 설정은 각 component가 user-scoped upsert를 수행한다.
- `tickers`는 migration이 관리하는 검증된 read-only catalog로 읽는다.
- Portfolio의 미분류 입력값은 원본을 보존한 채 `ticker_matches`에서 근거·신뢰 수준·검토 상태를 기록한다. 검증된 migration의 `confirmed` 상태만 canonical ticker로 분류·집계하고, 입력 폼의 종목 목록에도 반영한다. 화면에서 새로 입력한 후보는 `manual_review` 또는 `unmatched`로만 저장된다.
- 입력 매칭 map은 원본·실제 종목명·티커 alias를 공백·대소문자 기준으로 정규화하며, 같은 key가 여러 row 또는 여러 canonical ticker에 나타나면 임의 row를 선택하지 않고 검색·alias 해석·집계 모두에서 보류한다.

## External dependencies

- Supabase: authentication, PostgreSQL, RLS
- Frankfurter: USD/KRW 환율; 실패 시 UI가 기본 환율 1300을 사용
- Google Vision: OCR 요청 경로가 있으나 현재 client-side credential 흐름은 완성되지 않음
- Vercel: production hosting과 build-time CRA environment injection

## Related

- [Overview](./overview.md)
- [Data model](./data-model.md)
- [Input pipelines](./input-pipelines.md)
- [Deployment and security](./deployment-and-security.md)
- [UI behavior and QA](./ui-quality-and-behavior.md)
- [Authentication UX](./authentication-ux.md)

## Sources

- [S002 repository baseline](../raw/sources.md)
- [S017 monthly dividend-data navigation request and evidence](../raw/2026-11-13-dividend-data-month-navigation.md)
- [S018 monthly data navigation review remediation](../raw/2026-11-13-dividend-data-month-navigation-review.md)
- [`src/App.jsx`](../../src/App.jsx)
- [`src/context/AuthContext.jsx`](../../src/context/AuthContext.jsx)
- [`src/hooks/useDividendData.js`](../../src/hooks/useDividendData.js)
- [`src/components/DividendData.jsx`](../../src/components/DividendData.jsx)
- [`src/components/DividendData.test.jsx`](../../src/components/DividendData.test.jsx)
- [`src/api/insertDividend.js`](../../src/api/insertDividend.js)
