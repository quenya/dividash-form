# DiviDash LLM Wiki

이 디렉터리는 DiviDash에 관한 지식을 매번 다시 추론하지 않고 누적하기 위한 지속형 지식 계층이다. 구현은 Karpathy의 LLM Wiki 패턴을 이 소프트웨어 저장소에 맞게 구체화한다.

## 시작 지점

- 에이전트 운영 규칙: [schema.md](./schema.md)
- Wiki 전체 목록: [wiki/index.md](./wiki/index.md)
- 변경 타임라인: [wiki/log.md](./wiki/log.md)
- 원본 레지스트리: [raw/sources.md](./raw/sources.md)

## 세 계층

1. `raw/`: revision이 고정된 외부 permalink, Git commit, 비밀이 제거된 운영 스냅샷을 등록하는 원본 계층. snapshot은 원칙적으로 immutable이며 민감정보 incident에는 긴급 제거 절차가 우선한다.
2. `wiki/`: LLM이 원본과 현재 코드를 종합하여 유지하는 상호 연결된 Markdown 지식 계층
3. `schema.md`와 루트 `AGENTS.md`/`CLAUDE.md`: ingest, query, lint, 보안 규칙을 강제하는 정책 계층

현재 규모에서는 `index.md`와 일반 텍스트 검색을 사용한다. 페이지가 수백 개로 증가하기 전에는 별도의 벡터 검색이나 qmd 인덱스를 도입하지 않는다.

## 신뢰 경계

Wiki는 빠른 탐색을 위한 종합본이지 실행 가능한 소스의 대체물이 아니다. 충돌 시 사용자 지시, 현재 코드와 마이그레이션, 직접 확인한 런타임, immutable raw source, Wiki 순서로 판단하며 발견한 차이는 같은 작업에서 Wiki에 반영한다.
