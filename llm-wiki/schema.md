# DiviDash LLM Wiki Schema

이 문서는 DiviDash LLM Wiki의 정규 운영 정책이다. 루트 `AGENTS.md`와 `CLAUDE.md`가 이 정책을 필수 규칙으로 참조한다.

## 목적과 소유권

- 사용자는 원본을 선정하고 질문, 우선순위, 최종 판단을 제공한다.
- LLM은 `wiki/`의 페이지, 교차 링크, 요약, 모순, 인덱스와 로그를 유지한다.
- `raw/`의 snapshot 파일은 생성 후 수정하지 않는다. 잘못된 원본은 삭제하거나 덮어쓰지 않고 새 source ID로 정정 또는 supersede한다.
- Wiki는 Git에 커밋되는 프로젝트 산출물이다. 채팅 기록만을 영구 지식으로 취급하지 않는다.

## 신뢰 순서

서로 다른 설명이 충돌하면 다음 순서로 검증한다.

1. 현재 사용자의 명시적 지시
2. 현재 실행 코드, 테스트, SQL migration, 직접 확인한 런타임
3. `raw/`에 등록된 immutable source
4. `wiki/`의 기존 종합 문서
5. README나 과거 에이전트 설명처럼 갱신이 지연될 수 있는 보조 문서

충돌을 발견하면 조용히 한쪽을 선택하지 않는다. 관련 Wiki 페이지의 `Known gaps` 또는 `Risks`에 기록하고, 검증 가능한 경우 같은 작업에서 최신 상태로 고친다.

## 작업 시작 정책

아키텍처, 데이터 모델, 인증·보안, 배포, AI 입력, 사용자 흐름에 영향을 주는 비단순 작업은 다음 순서로 시작한다.

1. [wiki/index.md](./wiki/index.md)를 읽는다.
2. 질문과 관련된 Wiki 페이지를 읽는다.
3. 페이지의 `source_refs`와 실제 코드 경로를 확인한다.
4. Wiki만 근거로 코드를 추측하지 않고 변경 대상 파일을 다시 읽는다.

단순 번역, 한 줄 문구 수정, 일회성 상태 조회에는 이 사전 읽기를 생략할 수 있다. 단, 아래의 보안 규칙은 항상 적용한다.

## Ingest

새 문서, 회의 기록, 외부 글, 운영 점검, 중요한 Git 기준선을 지식에 편입할 때 적용한다.

1. [raw/sources.md](./raw/sources.md)에서 다음 `S###` source ID를 할당한다.
2. 가능한 경우 외부 permalink나 Git commit SHA를 등록한다. 변할 수 있는 운영 상태는 날짜가 붙은 sanitized snapshot 파일로 보존한다.
3. 토큰, 비밀번호, 개인식별정보, 실제 계좌번호는 raw와 Wiki 어디에도 기록하지 않는다.
4. 영향을 받는 기존 Wiki 페이지를 갱신하고 필요한 새 페이지를 만든다.
5. 새 페이지나 이름 변경이 있으면 `wiki/index.md`를 갱신한다.
6. `wiki/log.md`에 `## [YYYY-MM-DD] ingest | 제목` 형식으로 append한다.

원본 하나가 여러 개념에 영향을 주면 한 페이지에만 요약하지 않고 관련 페이지 전체에 반영한다.

## Query

1. `wiki/index.md`에서 관련 페이지를 찾는다.
2. Wiki의 종합을 출발점으로 사용하되 현재성이 중요한 주장은 raw source나 실제 시스템에서 재검증한다.
3. 답변에는 가능한 한 source ID 또는 저장소 경로를 연결한다.
4. 질문에서 나온 비교, 결정, 재사용 가능한 분석이 향후 작업에 가치가 있으면 관련 Wiki 페이지에 편입하고 query 로그를 append한다.
5. 단순 질의나 이미 문서화된 사실을 반복한 경우에는 불필요한 로그를 남기지 않는다.

## 변경 후 자동 유지 정책

다음 중 하나가 바뀌면 코드 변경과 같은 작업에서 Wiki도 갱신해야 한다.

- 주요 화면, 사용자 흐름, 컴포넌트 책임 또는 데이터 흐름
- Supabase table, column, constraint, RLS policy 또는 migration 순서
- 인증, secret, 환경변수, Vercel target 또는 외부 API 경계
- OCR, 텍스트 파싱, 입력 검증, confidence 계산 방식
- 운영상 결정, 알려진 위험, 해결된 incident
- 개발·테스트·배포 명령이나 지원 환경

오탈자, 포맷팅, 내부 이름 변경처럼 지속형 지식이 달라지지 않는 변경은 Wiki 갱신을 생략할 수 있다. 생략 여부는 작업 종료 전에 명시적으로 판단한다.

## Lint

초기 도입 후와 구조적 변경 후에는 다음을 확인한다.

- `wiki/index.md`에 모든 Wiki 페이지가 한 번 이상 등록되어 있는가
- 모든 상대 링크의 대상이 존재하는가
- index와 log를 제외한 페이지가 최소 하나의 다른 Wiki 페이지에서 링크되는가
- 각 지식 페이지에 `source_refs`, `Sources`, `Related`가 있는가
- source ID가 `raw/sources.md`에 존재하는가
- 코드 경로, 환경, 날짜에 관한 주장이 현재 상태와 모순되지 않는가
- superseded된 주장, 해결된 위험, 비밀 또는 민감정보가 남아 있지 않은가

결과는 `wiki/log.md`에 `## [YYYY-MM-DD] lint | 제목` 형식으로 append한다. 실패한 항목은 숨기지 않고 수정하거나 미해결 위험으로 남긴다.

## 페이지 규격

`wiki/index.md`와 `wiki/log.md`를 제외한 페이지는 아래 frontmatter를 사용한다.

```yaml
---
title: Page title
type: overview | architecture | data-model | workflow | operations | risk
status: current | needs-review | superseded
updated: YYYY-MM-DD
source_refs: [S001, S002]
tags: [tag-a, tag-b]
---
```

- 파일명은 소문자 kebab-case를 사용한다.
- 페이지는 하나의 명확한 주제를 다루고 상대경로 Markdown 링크로 연결한다.
- 중요한 사실에는 코드 경로나 source ID를 가까이 둔다.
- 추론은 사실처럼 쓰지 않고 `Inference`, `Known gaps`, `Risks` 중 하나로 표시한다.
- 새 페이지 생성, 삭제, rename 때는 index와 inbound link를 같은 변경에서 갱신한다.
- `log.md` 기존 항목은 수정하지 않고 새 항목만 아래에 append한다.

## 보안 불변조건

- secret의 실제 값은 raw, Wiki, log, 예시, diff 설명에 복사하지 않는다.
- `REACT_APP_*` 값은 브라우저 bundle에 포함될 수 있으므로 비밀 저장소로 취급하지 않는다.
- Supabase management access token과 service-role key는 client 코드나 Git에 두지 않는다.
- 보안 incident는 secret 값이 아니라 영향 범위, 상태, 후속 조치만 기록한다.
- 운영 DB 상태를 migration 파일만 보고 확정하지 않는다. 필요한 경우 read-only inspection으로 검증한다.

## 완료 체크리스트

실질적 작업을 끝내기 전에 다음을 확인한다.

1. 지속형 지식이 바뀌었는가
2. 바뀌었다면 관련 페이지, index, log를 갱신했는가
3. 새 원본이 있다면 source ID와 immutable locator를 등록했는가
4. 링크와 source reference lint가 통과했는가
5. Wiki에 비밀이나 확인되지 않은 단정이 들어가지 않았는가
