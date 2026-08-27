---
title: Known Gaps and Open Risks
type: risk
status: current
updated: 2026-08-16
source_refs: [S002, S003, S007, S008]
tags: [risk, drift, follow-up]
---

# Known Gaps and Open Risks

이 페이지는 확인된 차이를 숨기지 않고 유지한다. 해결 시 항목을 삭제하지 말고 상태와 해결 근거를 갱신한 뒤 log에 기록한다.

## Resolved

### DiviDash legacy Supabase policies

- Status: resolved 2026-08-27
- Live schema dump에서 `user_goals`의 broad read/upsert 정책과 `ticker_matches`의 anon write 정책을 확인했다.
- `supabase/migrations/202608270001_dividash_rls_hardening.sql`을 원격 DB에 적용하고 anon REST 재검증을 완료했다. 개인 테이블은 anon 조회 0건이며 공개 검색 메타데이터만 읽기 가능하다.
- Repository의 `database/ticker_matching.sql`과 `database/security_hardening.sql`도 anon write를 재생성하지 않도록 정렬했다.

## Open

### Secret rotation and history

- Status: action required
- 현재 `.mcp.json`에서는 Supabase management token이 제거되었지만 과거 Git history 노출은 남아 있다.
- Required evidence to close: token 폐기·재발급 확인, 필요 시 history 정리 정책 결정.

### Text input naming drift

- Status: documented behavior mismatch
- UI와 파일명은 LLM 분석을 표방하지만 실제 `llmService.js`는 로컬 정규식 parser만 실행한다.
- Decision needed: product label을 text parsing으로 바꾸거나 server-side LLM integration을 구현한다.

### OCR production path

- Status: not production-capable as implemented
- Google project ID가 없어도 mock을 반환하고, ID가 있어도 API key helper가 오류를 발생시켜 mock fallback으로 이동한다.
- Required evidence to close: secret-safe server-side OCR endpoint와 실제 image end-to-end test.

### Migration consolidation

- Status: schema drift risk
- 초기 SQL의 `stock` column과 현재 application의 `ticker`/`company_name` 사용이 분산된 migration에 걸쳐 있다.
- Required evidence to close: live schema dump와 재현 가능한 ordered migration 또는 consolidated baseline.

### Preview environment parity

- Status: intentional or incomplete, decision required
- 2026-08-06 기준 Supabase browser variables는 Vercel Production에만 존재했다.
- Preview에서 인증 기능을 시험해야 한다면 별도 Preview env를 등록해야 한다.

### Password recovery and account settings

- Status: prototype only, not current main
- `.omo/evidence/password-auth/`와 `agent/password-reset` branch에 responsive design과 prototype 구현이 있지만 current `main`에는 sign-in/sign-up/sign-out만 있다.
- Required evidence to close: current main에 맞춘 구현, production redirect allowlist 확인, 실제 recovery email/link/browser flow, expired/reused link, session continuity, 375/768/desktop 접근성 QA.

### Dashboard chart label collisions

- Status: fresh full-surface visual verification required
- Focused Issue 16과 Issue 17 review에서 대상 chart 밖의 일부 dashboard label collision 가능성이 non-blocking note로 남았다.
- Required evidence to close: current production-equivalent data와 authenticated desktop/mobile full-dashboard capture에서 CJK label, data label, tooltip, legend overlap을 모두 확인.

## Monitoring questions

- live RLS와 repository hardening migration이 계속 일치하는가
- Frankfurter 장애 시 기본 환율 1300이 사용자에게 충분히 명확한가
- notification이 미래 payment row만 사용하므로 실제 지급 예측으로 오해될 여지가 없는가

## Related

- [Input pipelines](./input-pipelines.md)
- [Data model](./data-model.md)
- [Deployment and security](./deployment-and-security.md)
- [Architecture](./architecture.md)
- [Contribution and PR policy](./contribution-and-pr-policy.md)
- [UI behavior and QA](./ui-quality-and-behavior.md)
- [Authentication UX](./authentication-ux.md)

## Sources

- [S002 repository baseline](../raw/sources.md)
- [S003 Vercel production snapshot](../raw/sources.md)
- [S007 OMO UI and QA evidence](../raw/2026-08-23-omo-ui-qa-evidence.md)
- [S008 OMO password and account UX prototype](../raw/2026-08-23-omo-password-auth-evidence.md)
- [`src/api/llmService.js`](../../src/api/llmService.js)
- [`src/api/ocrService.js`](../../src/api/ocrService.js)
- [`sheet/supabase_setup.sql`](../../sheet/supabase_setup.sql)
