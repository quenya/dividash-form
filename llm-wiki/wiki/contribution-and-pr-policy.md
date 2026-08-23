---
title: Contribution and Pull Request Policy
type: operations
status: current
updated: 2026-08-23
source_refs: [S004, S007]
tags: [github, pull-request, contribution, release]
---

# Contribution and Pull Request Policy

저장소가 제공하는 PR template이나 CONTRIBUTING 규칙은 현재 없다. 따라서 GitHub 설정과 최근 성공 PR 형식을 바탕으로 아래의 보수적 agent workflow를 적용한다.

## Repository facts

- PR base는 default branch `main`이다.
- merge commit, squash merge, rebase merge가 모두 허용된다.
- auto-merge와 update-branch 기능은 비활성화되어 있다.
- PR template, CODEOWNERS, 필수 CI workflow는 repository에 없다.
- branch protection 세부 설정은 2026-08-08 snapshot에서 완전히 확인하지 못했으므로 publish 때 원격 결과를 직접 확인한다.

## Agent publish workflow

1. `origin/main`을 fetch하고 local base가 최신인지 확인한다.
2. default branch에서 시작할 때 `agent/<description>` branch를 만든다.
3. 혼합 worktree에서는 요청 범위의 path만 explicit staging한다. `.omo/`는 transient QA evidence로 취급해 Git에서 제외하고, 재사용할 결론만 sanitized raw snapshot과 Wiki page에 편입한다.
4. 하나의 되돌릴 수 있는 목적은 하나의 focused commit으로 만든다.
5. 최근 저장소 형식에 맞춘 conventional-style title을 사용한다.
6. 관련 build, test, Wiki link/source/security lint를 실행한다.
7. `git push -u origin <branch>`로 tracking branch를 만든다.
8. 별도 요청이 없으면 draft PR을 생성한다.
9. PR 본문은 `Summary`, `Why`, `Impact`, `Verification`, `Follow-ups`를 포함한다.
10. PR URL, base/head, commit SHA와 검증 결과를 최종 확인한다.

## Merge policy

Repository가 세 merge 방식을 모두 허용하므로 merge 방식은 변경 성격과 사용자 선택에 따른다. Agent는 명시적 요청 없이 PR을 자동 merge하거나 draft를 ready 상태로 바꾸지 않는다.

## Related

- [Deployment and security](./deployment-and-security.md)
- [Known gaps](./known-gaps.md)
- [Wiki log](./log.md)

## Sources

- [S004 GitHub PR policy snapshot](../raw/sources.md)
- [S007 OMO UI and QA evidence](../raw/2026-08-23-omo-ui-qa-evidence.md)
