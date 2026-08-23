# DiviDash Wiki Index

질문이나 변경 작업을 시작할 때 이 파일에서 관련 페이지를 찾는다. 새 페이지 생성, rename, 삭제 때 반드시 갱신한다.

## Product and architecture

- [overview.md](./overview.md) - 제품 목적, 주요 사용자 화면, 현재 기술 경계를 요약한다. Sources: S002.
- [architecture.md](./architecture.md) - React shell, 인증, Supabase, 외부 API와 데이터 흐름을 설명한다. Sources: S002.
- [data-model.md](./data-model.md) - 주요 table, ownership, RLS와 migration 관계를 정리한다. Sources: S002.
- [input-pipelines.md](./input-pipelines.md) - manual, OCR, text 입력의 추출·검토·저장 흐름을 비교한다. Sources: S002.
- [ui-quality-and-behavior.md](./ui-quality-and-behavior.md) - 차트, local-date reset, mobile shell의 동작 불변조건과 재사용 QA workflow를 기록한다. Sources: S002, S007.
- [authentication-ux.md](./authentication-ux.md) - current auth 범위와 unmerged password recovery/account settings prototype의 채택 기준을 구분한다. Sources: S002, S008.

## Operations and risk

- [contribution-and-pr-policy.md](./contribution-and-pr-policy.md) - GitHub 설정과 최근 PR 형식에 기반한 branch, commit, validation, draft PR 및 transient QA evidence 정책을 기록한다. Sources: S004, S007.
- [deployment-and-security.md](./deployment-and-security.md) - Vercel target, 환경변수, 인증과 secret 경계를 기록한다. Sources: S002, S003.
- [known-gaps.md](./known-gaps.md) - 현재 코드·문서·운영 사이의 확인된 차이와 후속 검증 항목을 관리한다. Sources: S002, S003, S007, S008.
- [log.md](./log.md) - ingest, query, lint의 append-only 타임라인이다.

## Navigation rule

한 페이지의 주장만으로 중요한 결정을 내리지 않는다. 페이지의 `Sources`와 `Related`를 따라 실제 코드 또는 raw source까지 확인한다.
