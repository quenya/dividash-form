# Raw Sources

`raw/`는 LLM이 종합하기 전의 근거를 보존하는 계층이다. 이 프로젝트에서는 전체 소스 트리를 복제하지 않고, immutable Git commit과 외부 permalink를 원본으로 등록한다. 변경 가능한 운영 상태는 비밀이 제거된 날짜별 snapshot으로 저장한다.

## 규칙

- `sources.md`는 append-only source registry다.
- 날짜가 붙은 snapshot은 생성 후 수정하지 않는다. 정정이 필요하면 새 파일과 새 source ID를 추가한다.
- URL은 가능한 경우 commit 또는 revision이 고정된 permalink를 사용한다.
- secret, 비밀번호, 실제 계좌번호, 사용자 이메일은 저장하지 않는다.
- raw source의 해석과 종합은 `../wiki/`에 기록한다.

현재 source 목록은 [sources.md](./sources.md)에서 확인한다.
