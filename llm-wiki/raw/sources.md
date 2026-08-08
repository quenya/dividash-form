# Source Registry

이 파일은 append-only다. 기존 source ID를 재사용하거나 locator를 덮어쓰지 않는다.

## S001 - Karpathy LLM Wiki Pattern

- Type: external immutable permalink
- Locator: [llm-wiki.md revision ac46de1](https://gist.githubusercontent.com/karpathy/442a6bf555914893e9891c11519de94f/raw/ac46de1ad27f92b28ac95459c782c07f6b8c964a/llm-wiki.md)
- Captured: 2026-08-06
- Scope: persistent Wiki 철학, raw/wiki/schema 계층, ingest/query/lint, index와 log
- Status: active

## S002 - DiviDash Repository Baseline

- Type: immutable Git commit
- Locator: commit `91926cc1d8cb036dc6c5dbeb4265d9d4964c7c9e`
- Snapshot: [2026-08-06-repository-baseline.md](./2026-08-06-repository-baseline.md)
- Captured: 2026-08-06
- Scope: 초기 Wiki 생성 직전의 application, database, configuration 구조
- Status: active baseline

## S003 - Vercel Production Snapshot

- Type: sanitized runtime snapshot
- Snapshot: [2026-08-06-vercel-production-snapshot.md](./2026-08-06-vercel-production-snapshot.md)
- Captured: 2026-08-06
- Scope: 연결 프로젝트, production alias, 환경변수 target, 배포 상태
- Status: point-in-time; current claims require revalidation

## S004 - GitHub PR Policy Snapshot

- Type: sanitized repository policy snapshot
- Snapshot: [2026-08-08-github-pr-policy-snapshot.md](./2026-08-08-github-pr-policy-snapshot.md)
- Captured: 2026-08-08
- Scope: default branch, merge settings, repository policy files, observed PR convention
- Status: point-in-time; GitHub settings require revalidation before publish
