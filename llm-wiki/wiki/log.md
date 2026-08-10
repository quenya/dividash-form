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
