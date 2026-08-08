# Vercel Production Snapshot - 2026-08-06

이 파일은 `hohoppas-projects/dividash-form`을 read-only로 조회한 point-in-time 기록이다. 환경변수 값은 기록하지 않는다.

## Observed state

- Production alias: `https://diviform.vercel.app`
- Alias target: production deployment, status `Ready`
- Live alias response: HTTP 200
- `REACT_APP_SUPABASE_URL`: configured for Production, type `Sensitive`
- `REACT_APP_SUPABASE_ANON_KEY`: configured for Production, type `Sensitive`
- 두 변수는 Preview와 Development에는 등록되어 있지 않았다.
- `SUPABASE_ACCESS_TOKEN`은 Vercel environment에 등록되어 있지 않았다.
- 조회 시점에 `Building` 또는 `Queued` deployment는 보이지 않았다.

## Commands used

- `npx vercel inspect diviform.vercel.app`
- `npx vercel env ls`
- `npx vercel ls dividash-form --yes`
- production HTML과 JavaScript bundle에 대한 read-only HTTP 확인

## Limits

Sensitive environment variable의 값은 생성 후 다시 읽을 수 없으므로 이 snapshot은 이름, target, type만 증명한다. 현재 상태를 판단할 때는 Vercel을 다시 조회하고 production alias와 preview URL을 구분해야 한다.
