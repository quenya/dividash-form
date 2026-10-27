# 007 공식 ETF 동기화 런북

## 목적과 안전 경계

`scripts/sync_recent_official_etfs.py` dynamically selects recent ETF targets and supports KODEX·SOL·RISE·TIGER official distribution exports. `public.dividend_entries` is read-only input to discovery and is never updated or written by this collector.

기본 실행은 반드시 dry-run이며 DB 드라이버를 import하거나 DB에 연결하지 않는다. 실제 반영은 명시적인 `--write`가 있을 때만 수행한다. 자동 launchd 설치·배포는 이 런북의 범위가 아니다.

상품명은 공식 페이지 또는 저장소 검토로 확인된 값만 사용한다.

- KODEX 102970: `KODEX 증권` (Naver/KRX-fed page 확인)
- KODEX 284430: `KODEX 200미국채혼합50` (S012)
- KODEX 498400: `KODEX 200타겟위클리커버드콜`
- KODEX 498410: `KODEX 금융고배당TOP10타겟위클리커버드콜`
- SOL 0167B0: `SOL 200타겟위클리커버드콜` (S014)
- SOL 490490: `SOL 미국배당미국채혼합50` (S013; its verified product URL and generated dividend API remain on `www.soletf.co.kr`)
- RISE 0094M0: `RISE 코리아밸류업위클리고정커버드콜` (S010)
- RISE 0162Z0: `RISE 삼성전자SK하이닉스채권혼합50`
- TIGER 472150: `TIGER 배당커버드콜액티브` (S009)

## 사전 점검

1. 저장소 루트에서 Python 테스트와 스크립트 문법을 확인한다.

       python3 -m unittest scripts/test_official_etf_adapters.py scripts/test_sync_official_etfs.py -v
       python3 -m py_compile scripts/official_etf_adapters.py scripts/sync_official_etfs.py

2. 운영 DB 자격증명을 dry-run에 설정하지 않는다. dry-run은 네트워크 공개 원본만 읽는다.
3. 공식 원본 URL이 현재 허용된 `TARGETS`와 일치하는지 코드 리뷰한다. URL이나 상품명을 추측해서 추가하지 않는다. RISE 상품 페이지는 `riseetf.co.kr/prod/finderDetail/{id}`에서 KBAM으로 연결될 수 있다. 페이지의 **분배금 지급현황 → 분배내역 → 엑셀 다운받기**로 확인한 실제 다운로드 URL은 `https://kbam.co.kr/api/products/etfs/{id}/dividend?download=xlsx` 형식이며, 이 XLSX를 파싱한다. 브라우저에서 성공한 다운로드가 GitHub Actions 런타임에서도 성공한다는 뜻은 아니므로 운영 실행 환경에서 별도로 검증한다.
4. write 전에는 DB 백업이 성공했는지, 유지보수 창과 롤백 담당자가 정해졌는지 확인한다.

## 수동 dry-run

네트워크에서 공개 원본을 읽고 JSON 로그를 출력한다. 이 명령은 DB 연결과 SQL 실행을 하지 않는다. `--dry-run`은 명시할 수 있으며 생략해도 기본값이다. `--write`와 동시에 사용할 수 없다.

       python3 scripts/sync_official_etfs.py --dry-run --lock-path /tmp/dividash-official-etf-sync.lock

안전한 정확한 범위는 `attempts` 1–5회, `timeout` 1–20초, `backoff` 0–60초다. 범위를 벗어난 값은 수집 전에 거부된다. 재시도 대기는 `min(60초, backoff × 2^(attempt-1))`으로 계산되며 최대 시도 횟수를 넘지 않는다.

각 source가 `success`가 아니거나 빈 결과이면 실패다. 각 행은 미래 `fetched_at`/`source_updated_at` 및 미래 `ex_date`를 거부한다. freshness는 어댑터가 새로 찍은 `fetched_at`만 믿지 않고 source의 최신 `ex_date` 또는 `source_updated_at`을 기준으로 기본 370일을 적용한다. 과거 이력 행은 보존하되 payload 전체가 370일 이상 새 기록을 제공하지 않으면 실패한다. 실패 시 종료 코드 1이고 write하지 않는다. 종료 코드가 0이고 마지막 `sync_complete`의 `status`가 `success`인지 확인한다.

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

## GitHub Actions 일일 동기화 (Issue #53)

새 동적 동기화는 `.github/workflows/official-etf-distribution-sync.yml`에서 관리한다. 매일 21:15 UTC, 즉 KST 06:15에 실행되며 DST 영향은 없다. GitHub가 예약 실행을 지연하거나 누락할 수 있으므로 시간 보장으로 간주하지 않는다. `workflow_dispatch`의 `write` 입력은 기본 false이며, 명시적으로 true를 선택한 수동 실행만 DB에 기록한다. 운영 schedule은 write 모드다. 동시 실행은 같은 concurrency group에서 직렬화되고, 작업 제한 시간은 15분이다.

운영 설정 전 필수 항목:

1. Supabase에 `database/202610170001_rise_0094m0_and_sync_run_logs.sql`의 동기화 schema가 이미 적용됐는지 확인한다. 이어 `supabase/migrations/202610270001_official_etf_sync_coverage.sql`을 검토·적용하고, `public.tickers`, `public.ticker_matches`, `public.etf_product_cache`의 대상 metadata를 read-only로 확인한다. 이 migration은 `dividend_entries`를 변경하지 않아야 한다.
2. GitHub 저장소의 `Production` environment에 `SUPABASE_DB_HOST`, `SUPABASE_DB_NAME`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`를 secret으로 등록한다. `SUPABASE_DB_PORT`는 선택값이다. 비밀번호는 DB 로그/아티팩트에 출력하지 않는다.
3. DB 로그인 사용자는 `etf_sync_worker` 역할을 상속하도록 별도로 구성한다. migration 자체가 로그인 계정이나 비밀번호를 생성하지 않는다. `SUPABASE_DB_USER`에 광범위한 관리자/service role을 넣지 않는다.
4. `workflow_dispatch`를 먼저 dry-run(`write=false`)으로 실행하고 로그에서 `target_resolution_gap_summary`와 `source_collection_summary`를 확인한다. 두 event는 허용 목록의 status/reason별 집계만 출력하고 알 수 없는 reason은 `unknown`으로 접으며, 종목·발행사 식별자와 원장·후보·분배 row 수는 공개 Actions 로그에 출력하지 않는다. `sync_complete`는 최종 status/mode/trigger만 출력한다. 운영 write는 migration·출처 검증 이후에만 승인한다.
5. GitHub Actions → Official ETF distribution sync에서 예약/수동 실행과 `sync_complete`/실패 로그를 확인한다. 성공적인 Actions run만으로 DB 반영을 증명하지 말고 아래 SQL readback을 수행한다.

```sql
select id, started_at, finished_at, trigger, commit_sha, status,
       candidate_count, success_count, failure_count, unsupported_count,
       records_fetched, records_written, error_summary
from public.etf_sync_runs
order by started_at desc limit 20;

select r.started_at, r.status, s.ticker, s.issuer, s.status as source_status,
       s.records_fetched, s.records_written, s.source_url, s.parser_version,
       s.latest_data_date, s.fetched_at, s.attempts, s.error_code
from public.etf_sync_runs r
join public.etf_sync_run_sources s on s.run_id = r.id
order by r.started_at desc, s.ticker;

select ticker, ex_date, payment_date, distribution_per_share, source_issuer,
       source_url, fetched_at, parser_version
from public.etf_distribution_history
where ticker = '0094M0'
order by ex_date desc;
```

캘린더 상태는 `public.etf_sync_status_public`의 가장 최근 종료 run을 기준으로 한다. 실패·stale·coverage gap 경고는 편의 표시이지 지급 일정의 완전성을 보증하지 않는다. `dividend_entries`는 후보 식별용으로만 읽으며 공식 예정 분배를 실제 계좌 입금과 합산하지 않는다.

현재까지의 구현만으로 운영 readiness를 선언하지 않는다. workflow는 Actions secret/environment와 적용 migration이 확인되고, 성공 실행 및 위 SQL readback이 확인된 뒤에만 운영 중으로 판단한다. 스케줄 실행 이력이 없으면 수동/미검증 상태로 보고한다.

## 롤백

1. 즉시 추가 write를 중지하고 로그·커밋·백업 파일을 보존한다.
2. 한 트랜잭션 안에서 영향받은 두 테이블만 백업 시점으로 복원한다. 제공자의 PITR을 쓸 경우에도 `dividend_entries`를 복원 대상으로 포함하지 않는다.
3. 복원 후 `etf_product_cache`와 `etf_distribution_history`의 대상 ticker·날짜를 백업과 대조한다.
4. `dividend_entries` row count/내용이 변경되지 않았음을 확인한다.
5. 원인 수정과 새 dry-run 검증 없이는 재실행하지 않는다.

이 도구는 자동 스케줄을 설치하지 않으며, live DB write credential을 저장하거나 출력하지 않는다.
