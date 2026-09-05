# 007 공식 ETF 동기화 런북

## 목적과 안전 경계

`scripts/sync_official_etfs.py`는 KODEX·SOL·RISE 공식 공개 페이지에서 ETF 분배 이력을 수집하고, 승인된 경우 공개 참조 테이블에 반영한다. 사용자 입력의 기준 데이터인 `public.dividend_entries`는 읽거나 쓰지 않는다.

기본 실행은 반드시 dry-run이며 DB 드라이버를 import하거나 DB에 연결하지 않는다. 실제 반영은 명시적인 `--write`가 있을 때만 수행한다. 자동 launchd 설치·배포는 이 런북의 범위가 아니다.

상품명은 공식 페이지 또는 저장소 검토로 확인된 값만 사용한다.

- KODEX 102970: `KODEX 증권` (Naver/KRX-fed page 확인)
- KODEX 498400: `KODEX 200타겟위클리커버드콜`
- KODEX 498410: `KODEX 금융고배당TOP10타겟위클리커버드콜`
- SOL 0167B0: `SOL 200타겟위클리커버드콜`
- SOL 490490: `SOL 미국배당미국채혼합50`
- RISE 0162Z0: `RISE 삼성전자SK하이닉스채권혼합50`

## 사전 점검

1. 저장소 루트에서 Python 테스트와 스크립트 문법을 확인한다.

       python3 -m unittest scripts/test_official_etf_adapters.py scripts/test_sync_official_etfs.py -v
       python3 -m py_compile scripts/official_etf_adapters.py scripts/sync_official_etfs.py

2. 운영 DB 자격증명을 dry-run에 설정하지 않는다. dry-run은 네트워크 공개 원본만 읽는다.
3. 공식 원본 URL이 현재 허용된 `TARGETS`와 일치하는지 코드 리뷰한다. URL이나 상품명을 추측해서 추가하지 않는다.
4. write 전에는 DB 백업이 성공했는지, 유지보수 창과 롤백 담당자가 정해졌는지 확인한다.

## 수동 dry-run

네트워크에서 공개 원본을 읽고 JSON 로그를 출력한다. 이 명령은 DB 연결과 SQL 실행을 하지 않는다.

       python3 scripts/sync_official_etfs.py --lock-path /tmp/dividash-official-etf-sync.lock

종료 코드가 0이고 마지막 `sync_complete`의 `status`가 `success`인지 확인한다. `failure`, `timeout`, 오래된 데이터, 미래 `fetched_at`, 미래 `ex_date`가 하나라도 있으면 종료 코드는 1이며 write하지 않는다. `retry` 로그의 재시도 횟수와 source별 `records`를 기록한다.

## 백업과 preflight

write 전에 Supabase/Postgres 제공자의 PITR 또는 논리 백업을 확인한다. 아래 예시는 운영자가 승인된 연결 문자열로 별도 보관 위치에 실행하는 수동 절차다(자격증명은 명령행에 남기지 않는다).

       pg_dump --format=custom --file=/secure/backup/dividash-etf-before-$(date +%Y%m%d-%H%M%S).dump --table=public.etf_product_cache --table=public.etf_distribution_history "$DATABASE_URL"

백업 파일의 존재·크기·복구 가능성을 확인하고, dry-run 결과와 함께 보관한다. `public.dividend_entries`가 dump 대상에 포함되지 않았는지도 확인한다.

## 수동 write

1. 같은 커밋에서 dry-run을 먼저 성공시킨다.
2. 백업과 preflight를 완료한다.
3. 승인된 서버 환경에서만 다음을 실행한다.

       python3 scripts/sync_official_etfs.py --write --lock-path /tmp/dividash-official-etf-sync.lock

스크립트는 모든 source 검증이 성공한 경우에만 하나의 DB 트랜잭션으로 두 공개 테이블을 upsert한다. 한 source라도 실패하거나 stale이면 SQL을 실행하지 않는다. 프로세스가 중간에 실패하면 트랜잭션은 rollback된다. lock이 이미 있으면 두 번째 실행을 하지 않는다.

write 후 `sync_complete`의 `writes` 수와 DB에서 해당 두 테이블의 변경을 read-only 조회로 대조한다. `dividend_entries`의 row count와 최근 수정 시각도 별도 read-only 확인하여 변경이 없음을 검증한다.

## 롤백

1. 즉시 추가 write를 중지하고 로그·커밋·백업 파일을 보존한다.
2. 한 트랜잭션 안에서 영향받은 두 테이블만 백업 시점으로 복원한다. 제공자의 PITR을 쓸 경우에도 `dividend_entries`를 복원 대상으로 포함하지 않는다.
3. 복원 후 `etf_product_cache`와 `etf_distribution_history`의 대상 ticker·날짜를 백업과 대조한다.
4. `dividend_entries` row count/내용이 변경되지 않았음을 확인한다.
5. 원인 수정과 새 dry-run 검증 없이는 재실행하지 않는다.

이 도구는 자동 스케줄을 설치하지 않으며, live DB write credential을 저장하거나 출력하지 않는다.
