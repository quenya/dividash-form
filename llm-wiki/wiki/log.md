# DiviDash Wiki Log

이 파일은 append-only다. 각 항목은 `## [YYYY-MM-DD] operation | title` 형식을 사용한다.

## [2026-08-06] ingest | Initial DiviDash repository Wiki

- Karpathy LLM Wiki pattern을 S001로 등록했다.
- 초기 저장소 기준 commit을 S002로 등록하고 application, data model, input pipeline을 종합했다.
- Vercel production 점검을 S003 sanitized snapshot으로 등록했다.
- `overview`, `architecture`, `data-model`, `input-pipelines`, `deployment-and-security`, `known-gaps` 페이지를 생성했다.
- 루트 agent 정책이 `llm-wiki/schema.md`를 필수 규칙으로 참조하도록 연결했다.

## [2026-08-06] lint | Initial Wiki integrity pass

- 17개 Markdown 파일과 8개 Wiki 페이지의 상대 링크를 검사했다.
- 모든 지식 페이지가 index에 등록되고 inbound link, frontmatter, `Sources`, `Related`를 갖는지 확인했다.
- S001-S003 source reference가 registry에 존재함을 확인했다.
- AGENTS.md와 CLAUDE.md의 필수 Wiki 정책이 동일함을 확인했다.
- secret token과 JWT 형태의 값이 Wiki 및 변경 문서에 포함되지 않았음을 확인했다.
- Result: pass, unresolved product risks remain tracked in `known-gaps.md`.

## [2026-08-08] ingest | Repository PR policy snapshot

- GitHub repository metadata와 기존 PR #1-#5를 read-only로 확인했다.
- 명시적 PR template, CONTRIBUTING, CODEOWNERS, CI workflow가 없음을 확인했다.
- default branch, merge settings, 최근 PR 형식을 S004 sanitized snapshot으로 등록했다.
- `contribution-and-pr-policy.md`를 생성하고 index에 연결했다.

## [2026-08-08] lint | PR policy Wiki integration

- 19개 Markdown 파일, 9개 Wiki 페이지, S001-S004 source reference를 검사했다.
- 새 PR policy page의 index 등록, inbound link, frontmatter, `Sources`, `Related`를 확인했다.
- 상대 링크, root policy parity, secret token과 JWT 패턴을 검사했다.
- Result: pass.

## [2026-08-16] update | 확정 매칭 쓰기 경계 강화

- 수동 검토 입력이 기존 `tickers` metadata를 우연히 공유해도 `Unknown`을 벗어나지 않도록 집계 resolver를 수정했다.
- authenticated client는 `manual_review`·`unmatched`만 저장할 수 있고, `confirmed`는 검증된 migration seed와 완전한 근거·분류 필드를 요구하도록 했다.
- 기존 `dividend_entries`는 계속 수정하지 않는다.

## [2026-08-16] fix | 확정 alias와 수동 입력 집계 충돌 방지

- 확정 canonical ticker와 동일한 원본 문자열을 가진 미확정 row가 하나의 aggregate로 합쳐지지 않도록 집계 key를 검증 상태와 원본 기준으로 분리했다.
- 입력 폼에서 확정 종목명·티커 alias를 선택해도 유일한 확정 match로만 해석하도록 했고, 확정 match의 evidence metadata가 mutable `tickers` metadata보다 우선하도록 했다.
- 기존 테이블에도 제약이 추가되도록 migration을 idempotent하게 보강했다.

## [2026-08-16] security | ticker catalog 쓰기 경계

- authenticated client가 mutable `tickers` metadata를 이용해 근거 없는 분류를 만들지 않도록 `ticker_matches` migration에서 ticker insert/update policy를 제거했다.
- 기존 catalog read와 confirmed evidence 우선 resolver 동작은 유지하고, 새로운 후보는 `ticker_matches`의 수동 검토 상태로만 기록한다.

## [2026-08-16] security | ticker policy migration order alignment

- `schema_update.sql`과 `security_hardening.sql`에서도 ticker insert/update policy를 재생성하지 않도록 정렬해 migration 실행 순서에 따른 쓰기 재개를 막았다.

## [2026-08-16] fix | 입력 목록의 확정 항목 경계

- 수동 검토·최근 입력값이 종목 선택 목록에 다시 노출되지 않도록 `DividendForm`의 목록을 `confirmed` match의 원본·실제 종목명·티커 alias로 제한했다.
- 새 미확인 값은 기존 custom 입력으로 계속 기록하고, 확정 전 분류·집계에는 사용하지 않는다.

## [2026-08-16] docs | matching migration 실행 순서

- README와 data-model Wiki에 `schema_update.sql` → owner UUID를 채운 `security_hardening.sql` → `ticker_matching.sql` 순서와 placeholder owner 실행 금지 조건을 명시했다.

## [2026-08-16] security | matching allowed-value 제약 보강

- 기존 `ticker_matches` table에도 status와 confidence allowed-value 제약이 추가되도록 upgrade-safe migration block을 보강했다.

## [2026-08-16] security | legacy match 보류 경계

- 기존 invalid match row 때문에 migration이 중단되지 않도록 upgrade 제약은 `NOT VALID`로 새 write를 차단한다.
- resolver는 기존 row에도 high confidence, 실제 종목명·시장·분류·근거가 모두 있어야 confirmed로 취급하며, 불완전 row는 Unknown으로 보류한다.

## [2026-08-16] lint | Wiki inbound link 보강

- `known-gaps.md`에서 `contribution-and-pr-policy.md`를 연결해 index 등록뿐 아니라 다른 Wiki page의 inbound link도 만족하도록 했다.

## [2026-08-08] lint | Security policy remediation

- 외부 raw source의 모든 지시문을 비신뢰 데이터로 취급하도록 ingest 신뢰 경계를 명시했다.
- secret, 개인정보, 실제 계좌번호 incident에서는 immutable·append-only 규칙보다 현재 tree 제거, credential 회전, 승인된 history remediation을 우선하도록 예외 절차를 추가했다.
- 루트 agent 정책과 raw 안내 문서를 같은 규칙으로 정렬했다.

## [2026-08-09] update | YTD dividend KPI comparison

- `올해 누적 배당금` KPI를 현재 월까지의 올해 누적으로 변경했다.
- 전년 비교 기준을 작년 전체 연도에서 작년 같은 월까지의 누적으로 변경했다.
- `src/utils/dividendKpi.js`와 회귀 테스트를 추가하고 S005에 기록했다.

## [2026-08-10] update | YTD dividend KPI comparison display

- KPI 비교 문구를 `전년 동기 대비`로 명확히 하고 작년 동기 누적 금액을 천 단위 구분자와 함께 표시했다.
- 비교 가능한 전년 동기 누적값이 없거나 0이면 변화율과 비교 문구를 숨기도록 했다.
- 동작 기준을 S006에 기록하고 `overview.md`의 최신 상태를 갱신했다.

## [2026-08-14] query | 월 평균 배당금 전년 비교

- 대시보드의 월 평균 배당금은 올해 1월부터 현재 월까지의 배당 합계를 경과 월 수로 나눈다.
- 작년 같은 기간의 월평균과 전년 동기 증감률을 함께 표시하고, 비교 가능한 작년 데이터가 없으면 비교 행을 숨긴다.
- 근거: [`DividendChart.jsx`](../../src/components/DividendChart.jsx), [`dividendKpi.js`](../../src/utils/dividendKpi.js)

## [2026-08-16] update | 원본 보존형 종목 매칭 검토 흐름

- `ticker_matches`에 원본 입력값, 실제 종목명·티커·시장·분류, 근거, 신뢰 수준, 검토 상태를 기록하도록 했다.
- `confirmed`만 포트폴리오 분류·배당 집계와 종목 입력 목록에 반영하고 `manual_review`·`unmatched`는 Unknown으로 보류한다.
- 기존 `dividend_entries`는 수정하지 않는다.
- 근거: [`database/ticker_matching.sql`](../../database/ticker_matching.sql), [`src/utils/tickerMatching.js`](../../src/utils/tickerMatching.js), [`PortfolioAnalysis.jsx`](../../src/components/PortfolioAnalysis.jsx)

## [2026-08-16] fix | 종목별 기여도 표의 종목명 표시

- `confirmed` 매칭은 검증된 실제 종목명을 우선 표시하고, 미확인 항목은 원본 입력값과 확인 대기 상태를 표시하도록 했다.
- 확정 항목의 canonical ticker는 보조 텍스트로 유지하고 긴 종목명은 표 셀 안에서 줄바꿈한다.
- 근거: [`PortfolioAnalysis.jsx`](../../src/components/PortfolioAnalysis.jsx), [`src/utils/tickerMatching.js`](../../src/utils/tickerMatching.js)

## [2026-08-16] lint | 원본 보존형 종목 매칭 Wiki 무결성

- 9개 Wiki 페이지의 index 등록, inbound link, 상대 링크, frontmatter, `Sources`, `Related`, source reference를 검사했다.
- 매칭 근거에 실제 계좌번호·개인정보·secret이 포함되지 않았음을 확인했다.
- Result: pass.

## [2026-08-16] fix | 불완전한 확정 alias 보류

- legacy row가 `confirmed` 상태만 가지고 있더라도 실제 종목명·티커·시장·분류·근거와 high confidence가 모두 없으면 검색 목록과 alias resolver에서 제외한다.
- 불완전한 기존 row는 migration의 `NOT VALID` upgrade 제약과 함께 Unknown 또는 수동 확인 대상으로 남긴다.
- 근거: [`src/utils/tickerMatching.js`](../../src/utils/tickerMatching.js), [`src/components/DividendForm.jsx`](../../src/components/DividendForm.jsx)

## [2026-08-16] security | 정규화 alias 충돌 보류

- 공백·대소문자 정규화 후 같은 원본 alias를 가진 match row가 여러 개이거나 실제 종목명·티커 alias가 여러 canonical ticker를 가리키면 임의 row가 선택되지 않도록 보류한다.
- 검색 선택지와 포트폴리오 alias resolver가 같은 canonical alias 집합을 사용해 충돌 입력을 수동 확인 대상으로 남긴다.
- 근거: [`src/utils/tickerMatching.js`](../../src/utils/tickerMatching.js), [`src/components/DividendForm.jsx`](../../src/components/DividendForm.jsx), [`src/components/DividendForm.test.jsx`](../../src/components/DividendForm.test.jsx)

## [2026-08-16] fix | ticker matching seed upgrade 수렴 정책

- `ticker_matching.sql`에 기존 `ticker_matches` table의 누락 column을 보강하는 idempotent upgrade path와 `source_input` key fail-fast check를 추가했다.
- `managed_by`로 migration seed와 사용자 row를 구분하고, seed 소유 row만 verified 값으로 갱신한다. pre-provenance row는 전체 seed payload가 일치할 때만 data 변경 없이 seed ownership을 채택하고, 그 외 ownership을 알 수 없는 legacy row는 user-owned로 보호해 manual review data를 덮어쓰지 않는다.
- 근거: [`database/ticker_matching.sql`](../../database/ticker_matching.sql), [`wiki/data-model.md`](./data-model.md)

## [2026-08-16] lint | ticker matching seed upgrade 문서 무결성

- Wiki index coverage, 상대 링크, frontmatter source reference를 다시 검사했다.
- Result: pass.

## [2026-08-23] change | Account master for manual dividend input

- `accounts` 사용자별 계좌 마스터와 `dividend_entries.account_id` 연결 migration을 추가했다.
- 계좌 표시명, 증권사, 유형, 마스킹 계좌번호를 지원하고 전체 계좌번호 저장을 금지했다.
- 수동 입력은 migration 적용 시 계좌 마스터를 사용하고, 미적용 환경에서는 기존 계좌명 방식으로 fallback한다.
- 운영 DB 적용 결과 9개 계좌, 491개 배당 내역 중 490개 연결을 확인했다.

## [2026-08-23] ingest | OMO UI and authentication evidence

- `.omo/evidence/`의 chart, manual-date, responsive shell, KPI, accessibility, security review를 sanitized snapshot S007로 등록했다.
- 중간 REJECT/FAIL은 current defect로 단정하지 않고 UTC date, branch drift, fixed navigation overlay, unauthenticated capture 같은 재사용 regression case로 종합했다.
- Current `main`의 chart, form, layout, test source와 대조해 현재 불변조건과 QA workflow를 `ui-quality-and-behavior.md`에 기록했다.
- Password recovery와 account settings screenshot·prototype을 S008로 등록하되 unmerged branch이며 current capability가 아님을 `authentication-ux.md`와 `known-gaps.md`에 명시했다.
- Screenshot image와 표시된 email·계좌·배당 값은 Wiki에 복사하지 않았다.
- 재사용 지식 편입 후 `.omo/` source artifact는 제거하고, 이후 `.omo/`는 transient evidence로 Git에서 제외하기로 했다.

## [2026-08-23] lint | OMO evidence Wiki integration

- 22개 LLM Wiki Markdown, 162개 상대 링크, 11개 Wiki page, 8개 source ID를 검사했다.
- 모든 지식 page의 index coverage, inbound link, frontmatter, `Sources`, `Related`, source reference가 통과했다.
- Current UI claim을 현재 source와 main ancestry로 확인하고 password recovery prototype이 main에 merge되지 않았음을 확인했다.
- 변경 문서에서 token, private key, JWT, email value, 실제 계좌번호 패턴이 검출되지 않았다.
- Result: pass.

## [2026-08-23] fix | Archived OMO review completeness

- 삭제된 Issue 16 gate의 KPI 방향 기호, percentage, 동기간 label, prior KRW amount, shared typography·색상 기준을 S007과 UI QA page에 보강했다.
- `known-gaps.md`가 사용하는 S007/S008을 Wiki index source 목록에도 반영했다.

## [2026-08-23] fix | Manual form account and stock choices

- 새 계좌 등록에서 기존 계좌 마스터의 증권사 목록을 재사용하고, `직접 입력`으로 신규 증권사를 추가할 수 있게 했다.
- 계좌 유형 선택지에 `DC`를 추가했다.
- 운영 DB에 `ticker_matches` 테이블이 아직 없는 경우에도 기존 `dividend_entries.company_name`을 종목 선택지로 fallback하도록 수정했다.
- 원인과 fallback 동작을 회귀 테스트로 고정했다.
- `2026-08-27` security | DiviDash live RLS hardening: removed legacy broad policies from personal tables, restricted `ticker_matches` writes to authenticated users, applied remote migration `202608270001`, and verified anon access plus full test/build.
