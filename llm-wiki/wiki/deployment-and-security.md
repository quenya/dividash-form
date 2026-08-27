---
title: Deployment and Security Boundaries
type: operations
status: current
updated: 2026-08-27
source_refs: [S002, S003]
tags: [vercel, environment, auth, secrets]
---

# Deployment and Security Boundaries

## Vercel

- Linked project: `hohoppas-projects/dividash-form`
- Production alias: `https://diviform.vercel.app`
- 2026-08-06 snapshot에서 alias는 production `Ready`, HTTP 200이었다.
- `REACT_APP_SUPABASE_URL`과 `REACT_APP_SUPABASE_ANON_KEY`는 Production에만 등록되어 있었다.
- Preview deployment에는 두 변수가 없으므로 production과 같은 동작을 가정하면 안 된다.
- Vercel environment 변경은 이후 deployment에 반영되며 기존 deployment bundle을 바꾸지 않는다.

운영 상태는 변하므로 배포 문제를 조사할 때 production alias를 먼저 inspect하고 preview URL과 구분한다.

## Browser configuration

Create React App의 `REACT_APP_*` 값은 build 결과에 포함된다. Supabase URL과 anon key는 browser client 초기화에 필요하지만 비밀 저장소로 취급할 수 없다. 데이터 보호는 인증과 RLS가 담당해야 한다.

## Authentication and authorization

- `AuthProvider`가 session과 sign-in/sign-up/sign-out을 제공한다.
- `AuthGate`가 application surface를 로그인 뒤에 둔다.
- insert service가 current user ID를 row에 기록한다.
- Supabase RLS가 사용자별 row 접근을 최종 제한한다.

Client-side gate만으로 권한을 보장하지 않으며 live RLS가 migration 의도와 일치하는지 별도로 검증해야 한다.

2026-08-27에 live Supabase schema를 dump하고 anon REST 접근을 검증했다. `dividend_entries`, `user_goals`, `simulation_settings`는 owner-scoped 정책만 남겼고, `ticker_matches`의 anon insert/update를 제거했다. `instrument_search_index`는 공개 종목 검색 기능 때문에 read-only public 정책을 유지한다. 재현 가능한 migration은 [`supabase/migrations/202608270001_dividash_rls_hardening.sql`](../../supabase/migrations/202608270001_dividash_rls_hardening.sql)이다.

## Secret handling

- `.env`와 `.env.*`는 Git ignore 대상이며 `.env.example`만 추적한다.
- Supabase management access token은 현재 `.mcp.json` HEAD에서 제거되었다.
- 과거 Git history에 포함된 token은 노출된 것으로 간주하여 폐기·재발급해야 한다.
- Vercel application env는 로컬 MCP process에 전달되지 않는다. CLI/MCP 인증은 별도의 로컬 profile 또는 process environment가 필요하다.
- Wiki와 raw snapshot에는 secret 값을 기록하지 않는다.

## Related

- [Architecture](./architecture.md)
- [Data model](./data-model.md)
- [Known gaps](./known-gaps.md)

## Sources

- [S002 repository baseline](../raw/sources.md)
- [S003 Vercel production snapshot](../raw/sources.md)
- [`src/api/supabaseClient.js`](../../src/api/supabaseClient.js)
- [`src/context/AuthContext.jsx`](../../src/context/AuthContext.jsx)
- [`.gitignore`](../../.gitignore)
