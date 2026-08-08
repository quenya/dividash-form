# GitHub PR Policy Snapshot - 2026-08-08

이 파일은 `quenya/dividash-form`의 local checkout과 GitHub App metadata를 read-only로 조사한 point-in-time 기록이다.

## Repository-provided policy

- Default branch: `main`
- Visibility: public
- Merge methods enabled: merge commit, squash merge, rebase merge
- Auto-merge: disabled
- Update-branch button: disabled
- Local/default branch에 `CONTRIBUTING`, PR template, `CODEOWNERS`, GitHub Actions workflow가 없었다.
- Repository ruleset 조회에서 ruleset이 반환되지 않았다.
- Branch protection 세부 endpoint는 현재 `gh` 인증이 만료되어 독립 확인하지 못했다. 정책이 없다고 단정하지 않고 publish 전에 push 결과와 PR target을 검증한다.

## Observed PR convention

최근 merge된 PR #5는 다음 형식을 사용했다.

- Base: `main`
- Head: 주제를 나타내는 별도 branch
- 한 개의 focused commit
- Conventional-style PR title
- 본문에 `Summary`와 `Verification` 포함

과거 PR은 본문이 없거나 Copilot 형식인 경우도 있어 repository-wide template으로 보지는 않는다.

## Operational fallback

명시적 repository policy가 없을 때 agent publish 작업은 다음 보수적 기본값을 사용한다.

- `agent/<description>` branch
- 요청 범위만 explicit staging
- terse conventional commit
- build, test, Wiki lint 통과
- draft PR
- PR 본문에 변경 내용, 이유·영향, 검증, 남은 위험 기록

## Evidence

- local file inventory와 Git history
- GitHub App repository metadata
- GitHub PR #1-#5 metadata
- `gh` auth 상태 및 read-only API 시도
