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
