#!/usr/bin/env python3
"""Safe, single-instance sync of official ETF reference data.

The default mode is read-only. Database writes require ``--write`` explicitly.
"""
from __future__ import annotations

import argparse
import contextlib
import datetime as dt
import fcntl
import json
import os
import pathlib
import sys
import time
from typing import Any, Callable, Iterator

from official_etf_adapters import MAX_TIMEOUT_SECONDS, SOURCES, collect

MAX_RETRIES = 3
DEFAULT_BACKOFF_SECONDS = 1.0
DEFAULT_MAX_AGE_DAYS = 370
DEFAULT_LOCK_PATH = "/tmp/dividash-official-etf-sync.lock"

# Names are only included where confirmed by the official issuer/repository review.
TARGETS = {
    "KODEX": {
        "102970": {"id": "2ETF15", "url": "https://www.samsungfund.com/etf/product/view.do?id=2ETF15", "product_name": "KODEX 증권"},
        "498400": {"id": "2ETFP4", "url": "https://www.samsungfund.com/etf/product/view.do?id=2ETFP4", "product_name": "KODEX 200타겟위클리커버드콜"},
        "498410": {"id": "2ETFP1", "url": "https://www.samsungfund.com/etf/product/view.do?id=2ETFP1", "product_name": "KODEX 금융고배당TOP10타겟위클리커버드콜"},
    },
    "SOL": {
        "0167B0": {"fund": "211107", "url": "https://www.soletf.com/ko/fund/etf/211107?tabIndex=1", "product_name": "SOL 200타겟위클리커버드콜"},
        "490490": {"fund": "211068", "url": "https://www.soletf.com/ko/fund/etf/211068?tabIndex=2", "product_name": "SOL 미국배당미국채혼합50"},
    },
    "RISE": {
        "0162Z0": {"url": "https://www.riseetf.co.kr/prod/finderDetail/44K1", "product_name": "RISE 삼성전자SK하이닉스채권혼합50"},
    },
}

PRODUCT_UPSERT_SQL = """insert into public.etf_product_cache
(ticker, issuer, product_name, official_url, fetched_at, expires_at, source_status, raw_payload, parser_version, updated_at)
values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
on conflict (ticker) do update set issuer=excluded.issuer, product_name=excluded.product_name,
official_url=excluded.official_url, fetched_at=excluded.fetched_at, expires_at=excluded.expires_at,
source_status=excluded.source_status, raw_payload=excluded.raw_payload, parser_version=excluded.parser_version, updated_at=excluded.updated_at"""
DISTRIBUTION_UPSERT_SQL = """insert into public.etf_distribution_history
(ticker, ex_date, payment_date, distribution_per_share, reference_price, distribution_rate, currency,
 source_issuer, source_url, source_updated_at, fetched_at, parser_version, raw_payload)
values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
on conflict (ticker,ex_date,source_issuer) do update set payment_date=excluded.payment_date,
distribution_per_share=excluded.distribution_per_share, reference_price=excluded.reference_price,
distribution_rate=excluded.distribution_rate, currency=excluded.currency, source_url=excluded.source_url,
fetched_at=excluded.fetched_at, parser_version=excluded.parser_version, raw_payload=excluded.raw_payload"""


class StaleDataError(ValueError):
    pass


class LockBusyError(RuntimeError):
    pass


def log(event: str, **fields: Any) -> None:
    print(json.dumps({"event": event, **fields}, ensure_ascii=False, sort_keys=True), flush=True)


@contextlib.contextmanager
def instance_lock(path: pathlib.Path) -> Iterator[None]:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = path.open("a+")
    try:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise LockBusyError(f"sync already running: {path}") from exc
        yield
    finally:
        fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        handle.close()


def collect_with_retry(collector: Callable[[], dict], attempts: int = MAX_RETRIES,
                       backoff_seconds: float = DEFAULT_BACKOFF_SECONDS) -> dict:
    """Retry both explicit failure results and exceptions from a collector."""
    last: dict | None = None
    for attempt in range(1, attempts + 1):
        try:
            result = collector()
        except Exception as exc:  # collector boundary must not bypass retry policy
            last = {"status": "failure", "error": f"collector exception: {exc}"}
        else:
            last = result
            if result.get("status") not in {"failure", "timeout"}:
                return result
        if attempt < attempts:
            delay = backoff_seconds * (2 ** (attempt - 1))
            log("retry", attempt=attempt, delay_seconds=delay, error=last.get("error"))
            time.sleep(delay)
    return last or {"status": "failure", "error": "no collector result"}


def _as_datetime(value: Any) -> dt.datetime:
    parsed = dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=dt.timezone.utc)


def validate_record(record: dict, now: dt.datetime | None = None,
                    max_age_days: int = DEFAULT_MAX_AGE_DAYS) -> None:
    now = now or dt.datetime.now(dt.timezone.utc)
    fetched = _as_datetime(record["fetched_at"])
    if fetched > now + dt.timedelta(minutes=5):
        raise StaleDataError("fetched_at is in the future")
    if fetched < now - dt.timedelta(days=max_age_days):
        raise StaleDataError("record is older than freshness limit")
    ex_date = dt.date.fromisoformat(record["ex_date"])
    if ex_date > now.date():
        raise StaleDataError("ex_date is in the future")


def connect_db():
    import psycopg2  # lazy import preserves a DB-free dry run
    required = ["SUPABASE_DB_HOST", "SUPABASE_DB_NAME", "SUPABASE_DB_PASSWORD"]
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        raise RuntimeError("missing database environment: " + ", ".join(missing))
    return psycopg2.connect(host=os.environ["SUPABASE_DB_HOST"], port=os.getenv("SUPABASE_DB_PORT", "5432"),
                            dbname=os.environ["SUPABASE_DB_NAME"], user=os.getenv("SUPABASE_DB_USER", "postgres"),
                            password=os.environ["SUPABASE_DB_PASSWORD"], sslmode="require",
                            connect_timeout=MAX_TIMEOUT_SECONDS)


def run(*, write: bool = False, targets: dict | None = None,
        collector: Callable[..., dict] | None = None, timeout: int = MAX_TIMEOUT_SECONDS,
        attempts: int = MAX_RETRIES, backoff_seconds: float = DEFAULT_BACKOFF_SECONDS,
        max_age_days: int = DEFAULT_MAX_AGE_DAYS, lock_path: str | pathlib.Path = DEFAULT_LOCK_PATH) -> dict:
    targets = TARGETS if targets is None else targets
    collector = collector or collect
    results, failures, records = [], 0, []
    now = dt.datetime.now(dt.timezone.utc)
    with instance_lock(pathlib.Path(lock_path)):
        log("sync_started", mode="write" if write else "dry-run", target_count=sum(len(v) for v in targets.values()))
        for issuer, products in targets.items():
            for ticker, meta in products.items():
                source_url = SOURCES[issuer].format(product_id=meta["id"]) if issuer == "KODEX" else SOURCES[issuer].format(fund_code=meta["fund"]) if issuer == "SOL" else SOURCES[issuer].format(product_page=meta.get("page", "44K1"))
                result = collect_with_retry(lambda i=issuer, t=ticker, u=source_url: collector(i, t, u, timeout=timeout), attempts, backoff_seconds)
                results.append(result)
                if result.get("status") in {"failure", "timeout"}:
                    failures += 1
                for record in result.get("records", []):
                    try:
                        validate_record(record, now, max_age_days)
                    except (KeyError, ValueError, StaleDataError) as exc:
                        failures += 1
                        log("record_rejected", issuer=issuer, ticker=ticker, error=str(exc))
                    else:
                        records.append((issuer, ticker, meta, record))
                log("source_complete", issuer=issuer, ticker=ticker, status=result.get("status"), records=len(result.get("records", [])))
        if write and failures == 0:
            conn = connect_db()
            try:
                with conn:
                    with conn.cursor() as cur:
                        for issuer, ticker, meta, record in records:
                            fetched = _as_datetime(record["fetched_at"])
                            if "product_name" in meta:
                                cur.execute(PRODUCT_UPSERT_SQL, (ticker, issuer, meta["product_name"], meta["url"], fetched, fetched + dt.timedelta(days=7), "matched", json.dumps(meta, ensure_ascii=False), record["parser_version"], fetched))
                            cur.execute(DISTRIBUTION_UPSERT_SQL, (ticker, record["ex_date"], record.get("payment_date"), record.get("distribution_per_share"), record.get("reference_price"), record.get("distribution_rate"), record.get("currency", "KRW"), issuer, record["source_url"], None, fetched, record["parser_version"], json.dumps(record.get("raw_payload", {}), ensure_ascii=False)))
            finally:
                conn.close()
        summary = {"status": "failure" if failures else "success", "mode": "write" if write else "dry-run", "sources": len(results), "records": len(records), "writes": len(records) if write and not failures else 0, "failures": failures}
        log("sync_complete", **summary)
        return summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="persist to the two public ETF tables")
    parser.add_argument("--timeout", type=int, default=MAX_TIMEOUT_SECONDS)
    parser.add_argument("--attempts", type=int, default=MAX_RETRIES)
    parser.add_argument("--lock-path", default=DEFAULT_LOCK_PATH)
    args = parser.parse_args(argv)
    try:
        result = run(write=args.write, timeout=args.timeout, attempts=args.attempts, lock_path=args.lock_path)
    except Exception as exc:
        log("sync_failed", error=str(exc))
        return 1
    return 0 if result["status"] == "success" else 1


if __name__ == "__main__":
    sys.exit(main())
