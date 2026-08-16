---
title: Data Model and RLS
type: data-model
status: current
updated: 2026-08-16
source_refs: [S002]
tags: [supabase, postgres, rls, migrations]
---

# Data Model and RLS

이 페이지는 repository migration이 의도하는 모델을 설명한다. 운영 DB의 실제 schema는 read-only inspection 없이 이 문서만으로 확정하지 않는다.

## Core tables

| Table | Responsibility | Ownership |
|---|---|---|
| `dividend_entries` | 계좌, 종목, 금액, 지급일, 통화, 입력 방식과 confidence 저장 | `user_id = auth.uid()` |
| `tickers` | ticker별 sector, industry, exchange, 한글명 metadata | authenticated 사용자 공유 |
| `ticker_matches` | 원본 입력값과 실제 종목 후보, 시장, 근거, 신뢰 수준, 검토 상태 저장 | authenticated 사용자 공유 |
| `user_goals` | 사용자별 `monthly_dividend_goal` 등 key/value 목표 | composite key `(user_id, key)` |
| `simulation_settings` | 월 적립, yield, growth, reinvest 설정 | composite key `(user_id, id)` |

## Dividend entry shape

현재 insert path는 다음 필드를 사용한다.

- identity: generated `id`, authenticated `user_id`
- account: `account_name`, `account_type`, `account_number`
- instrument: `ticker`, `company_name`
- payment: `dividend_amount`, `payment_date`, `currency`
- provenance: `input_method`, `confidence_score`

## Instrument matching

`public.ticker_matches.source_input`은 배당 원본의 입력값을 대문자 정규화해 저장하는 식별자다. `confirmed` 상태만 `matched_ticker`와 `tickers` metadata를 통해 포트폴리오 분류와 배당 집계의 canonical ticker로 해석한다. `manual_review`와 `unmatched`는 원본 입력값과 금액을 유지한 채 `Unknown`으로 남긴다.

매칭 row에는 `matched_company_name`, `market`, `sector`, `industry`, `evidence`, `confidence`를 함께 기록한다. 매칭 저장은 기존 `dividend_entries` row를 수정하지 않는다.

`confirmed` row는 migration의 검증된 seed로만 생성되며, authenticated client의 RLS insert/update는 `manual_review`·`unmatched` 상태만 허용한다. 따라서 화면에서 입력한 후보 정보는 기록되지만 확정 전에는 분류·집계에 사용되지 않는다.

[`sheet/supabase_setup.sql`](../../sheet/supabase_setup.sql)의 초기 schema는 `stock` 중심이고, 현재 application은 `ticker`와 `company_name`을 사용한다. 이 차이는 migration을 순서 없는 단일 source of truth로 사용할 수 없다는 신호다.

## RLS model

[`database/security_hardening.sql`](../../database/security_hardening.sql)은 다음을 의도한다.

- `dividend_entries`, `user_goals`, `simulation_settings`에 non-null `user_id` 적용
- 기존 row를 지정한 owner UUID로 backfill
- select/insert/update/delete를 `auth.uid()`와 일치하는 row로 제한
- `tickers`는 authenticated 사용자에게 read/insert/update 허용

Migration 파일의 placeholder owner UUID는 실행 전에 실제 owner로 교체해야 하며, repository의 파일 내용만으로 live 적용 여부를 추론하지 않는다.

## Migration map

- [`sheet/supabase_setup.sql`](../../sheet/supabase_setup.sql): 초기 `dividend_entries`와 AI provenance columns
- [`sheet/ai_schema_update.sql`](../../sheet/ai_schema_update.sql): AI 관련 column과 index 추가
- [`database/schema_update.sql`](../../database/schema_update.sql): ticker, goal, simulator schema와 seed
- [`database/ticker_matching.sql`](../../database/ticker_matching.sql): 원본 입력 보존형 ticker 매칭과 RLS
- [`database/security_hardening.sql`](../../database/security_hardening.sql): user ownership, composite key, RLS 강화

## Related

- [Architecture](./architecture.md)
- [Input pipelines](./input-pipelines.md)
- [Deployment and security](./deployment-and-security.md)
- [Known gaps](./known-gaps.md)

## Sources

- [S002 repository baseline](../raw/sources.md)
- [`src/api/insertDividend.js`](../../src/api/insertDividend.js)
- [`database/security_hardening.sql`](../../database/security_hardening.sql)
- [`database/schema_update.sql`](../../database/schema_update.sql)
