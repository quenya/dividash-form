#!/usr/bin/env python3
"""Collect official ETF distributions for ETFs paid in the prior month."""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import uuid
from zoneinfo import ZoneInfo

from official_etf_adapters import PARSER_VERSION, collect
from official_etf_targets import resolve_targets
from sync_official_etfs import DEFAULT_MAX_AGE_DAYS, DISTRIBUTION_UPSERT_SQL, validate_record

KST = ZoneInfo("Asia/Seoul")


def month_ago(value):
    month = value.month - 1 or 12
    year = value.year - (value.month == 1)
    if month == 12:
        return value.replace(year=year, month=month, day=min(value.day, 31))
    last_day = (dt.date(year, month + 1, 1) - dt.timedelta(days=1)).day
    return value.replace(year=year, month=month, day=min(value.day, last_day))


def _json_log(event, **fields):
    print(json.dumps({"event": event, **fields}, ensure_ascii=False, sort_keys=True), flush=True)


def _safe_error(exc):
    return type(exc).__name__


def _log_resolution_gaps(gaps):
    counts = {}
    for gap in gaps:
        key = (str(gap.get("status") or "unknown"), str(gap.get("reason") or "unknown"))
        counts[key] = counts.get(key, 0) + 1
    for (status, reason), count in sorted(counts.items()):
        _json_log("target_resolution_gap_summary", status=status, reason=reason, count=count)


def _log_source_collection_summary(sources):
    allowed_statuses = {"success", "empty", "failure", "timeout", "unsupported", "manual_review"}
    allowed_error_codes = {
        "none", "unsupported_issuer", "invalid_timeout", "request_timeout",
        "network_dns_error", "network_tls_error", "network_connection_error",
        "network_error", "invalid_source_response",
    }
    counts = {}
    for source in sources:
        status = str(source.get("status") or "unknown")
        if status not in allowed_statuses:
            status = "unknown"
        reason = str(source.get("error_code") or "none")
        if reason not in allowed_error_codes and not re.fullmatch(r"http_[1-5][0-9]{2}", reason):
            reason = "unknown"
        key = (status, reason)
        counts[key] = counts.get(key, 0) + 1
    for (status, reason), count in sorted(counts.items()):
        _json_log("source_collection_summary", status=status, reason=reason, count=count)


def _read_dict_rows(cursor, query, params=()):
    cursor.execute(query, params)
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def discover(conn, as_of):
    start = month_ago(as_of)
    with conn.cursor() as cursor:
        entries = _read_dict_rows(cursor, """
            select ticker, company_name, payment_date::text as payment_date
            from public.get_recent_etf_payments_for_sync(%s, %s)
        """, (start, as_of))
        matches = _read_dict_rows(cursor, """
            select source_input, matched_ticker, status, confidence from public.ticker_matches
            where status = 'confirmed' and confidence = 'high'
        """)
        entry_names = {"".join(str(row.get("company_name") or "").casefold().split()) for row in entries}
        candidate_tickers = {str(row.get("ticker") or "").strip().upper() for row in entries if row.get("ticker")}
        for match in matches:
            normalized_source = "".join(str(match.get("source_input") or "").casefold().split())
            if normalized_source in entry_names and match.get("matched_ticker"):
                candidate_tickers.add(str(match["matched_ticker"]).strip().upper())
        candidate_tickers = sorted(candidate_tickers)
        if candidate_tickers:
            placeholders = ",".join(["%s"] * len(candidate_tickers))
            instruments = _read_dict_rows(cursor, "select symbol, security_type from public.instrument_search_index where upper(symbol) in (" + placeholders + ")", tuple(candidate_tickers))
            products = _read_dict_rows(cursor, "select ticker, issuer, product_name, official_url from public.etf_product_cache where upper(ticker) in (" + placeholders + ") and source_status = 'matched'", tuple(candidate_tickers))
        else:
            instruments, products = [], []
    targets, gaps = resolve_targets(entries=entries, instruments=instruments, products=products, matches=matches, as_of=as_of)
    alias_tickers = sorted({gap.get("ticker") for gap in gaps if gap.get("ticker")} - set(candidate_tickers))
    if alias_tickers:
        placeholders = ",".join(["%s"] * len(alias_tickers))
        with conn.cursor() as cursor:
            instruments.extend(_read_dict_rows(cursor, "select symbol, security_type from public.instrument_search_index where upper(symbol) in (" + placeholders + ")", tuple(alias_tickers)))
            products.extend(_read_dict_rows(cursor, "select ticker, issuer, product_name, official_url from public.etf_product_cache where upper(ticker) in (" + placeholders + ") and source_status = 'matched'", tuple(alias_tickers)))
        targets, gaps = resolve_targets(entries=entries, instruments=instruments, products=products, matches=matches, as_of=as_of)
    return list({row["ticker"]: row for row in targets}.values()), gaps, len(entries)


def execute_sync(conn, *, as_of, trigger, commit_sha="", collector=collect, write=True):
    run_id = str(uuid.uuid4())
    now = dt.datetime.now(dt.timezone.utc)
    cursor = conn.cursor()
    try:
        if write:
            cursor.execute("insert into public.etf_sync_runs (id, started_at, trigger, commit_sha, status) values (%s,%s,%s,%s,'running')", (run_id, now, trigger, commit_sha or None))
            conn.commit()
        targets, gaps, ledger_rows = discover(conn, as_of)
        _log_resolution_gaps(gaps)
        results = []
        for gap in gaps:
            results.append({"ticker": gap.get("ticker"), "issuer": None, "status": gap["status"], "records": [], "source_url": None, "parser_version": None, "error_code": gap["reason"]})
        for target in targets:
            fetched = collector(target["issuer"], target["ticker"], target["source_url"])
            records = fetched.get("records", []) if isinstance(fetched.get("records"), list) else []
            source = {"ticker": target["ticker"], "issuer": target["issuer"], "status": fetched.get("status", "failure"), "records": records, "source_url": target["official_url"], "parser_version": fetched.get("parser_version", PARSER_VERSION), "error_code": fetched.get("error_code")}
            try:
                if fetched.get("status") != "success" or not records:
                    raise ValueError("source_not_successful_or_empty")
                validate_record(max(records, key=lambda row: row["ex_date"]), now, DEFAULT_MAX_AGE_DAYS)
                for record in records:
                    validate_record(record, now, enforce_age=False)
                    if record.get("ticker", "").upper() != target["ticker"]:
                        raise ValueError("source_ticker_mismatch")
            except (KeyError, TypeError, ValueError) as exc:
                source["status"] = "failure"
                source["error_code"] = source.get("error_code") or (str(exc) if str(exc).startswith("source_") else _safe_error(exc))
                source["records"] = []
            results.append(source)
        _log_source_collection_summary([item for item in results if item.get("issuer")])
        good = [item for item in results if item["status"] == "success"]
        bad = [item for item in results if item["status"] != "success"]
        record_count = sum(len(item["records"]) for item in good)
        status = "success" if not bad else "partial_failure" if good else "failure"
        errors = ",".join(sorted({item["error_code"] for item in bad if item.get("error_code")})) or None
        if write:
            for item in good:
                for record in item["records"]:
                    cursor.execute(DISTRIBUTION_UPSERT_SQL, (item["ticker"], record["ex_date"], record.get("payment_date"), record.get("distribution_per_share"), record.get("reference_price"), record.get("distribution_rate"), record.get("currency", "KRW"), item["issuer"], record["source_url"], record.get("source_updated_at"), record["fetched_at"], record["parser_version"], json.dumps(record.get("raw_payload", {}), ensure_ascii=False)))
            for item in results:
                cursor.execute("""insert into public.etf_sync_run_sources
                  (run_id,ticker,issuer,status,records_fetched,records_written,source_url,parser_version,error_code,error_summary)
                  values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", (run_id, item.get("ticker"), item.get("issuer"), item["status"], len(item["records"]), len(item["records"]), item.get("source_url"), item.get("parser_version"), item.get("error_code"), item.get("error_code")))
            cursor.execute("""update public.etf_sync_runs set finished_at=%s,status=%s,candidate_count=%s,
              success_count=%s,failure_count=%s,unsupported_count=%s,records_fetched=%s,records_written=%s,error_summary=%s where id=%s""", (
                dt.datetime.now(dt.timezone.utc), status, len(targets) + len(gaps), len(good),
                sum(item["status"] in ("failure", "timeout") for item in bad),
                sum(item["status"] in ("unsupported", "manual_review") for item in bad),
                record_count, record_count, errors, run_id))
            cursor.execute("delete from public.etf_sync_runs where started_at < now() - interval '365 days'")
            conn.commit()
        summary = {"run_id": run_id, "status": status, "mode": "write" if write else "dry-run", "trigger": trigger,
                   "ledger_rows_read": ledger_rows, "candidate_count": len(targets) + len(gaps), "success_count": len(good),
                   "failure_count": sum(item["status"] in ("failure", "timeout") for item in bad),
                   "unsupported_count": sum(item["status"] in ("unsupported", "manual_review") for item in bad),
                   "records_fetched": record_count, "records_written": record_count if write else 0}
        _json_log("sync_complete", status=status, mode="write" if write else "dry-run", trigger=trigger)
        return summary
    except Exception as exc:
        conn.rollback()
        safe_error = _safe_error(exc)
        if write:
            try:
                cursor.execute("update public.etf_sync_runs set finished_at=%s,status='failure',failure_count=1,error_summary=%s where id=%s", (dt.datetime.now(dt.timezone.utc), safe_error, run_id))
                conn.commit()
            except Exception:
                conn.rollback()
        _json_log("sync_failed", run_id=run_id, error_code=safe_error)
        return {"run_id": run_id, "status": "failure", "error_code": safe_error}
    finally:
        cursor.close()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--dry-run", action="store_true")
    parser.add_argument("--trigger", choices=("schedule", "workflow_dispatch", "manual"), default="manual")
    parser.add_argument("--as-of", help="KST date in YYYY-MM-DD; defaults to today in Asia/Seoul")
    args = parser.parse_args(argv)
    required = ("SUPABASE_DB_HOST", "SUPABASE_DB_NAME", "SUPABASE_DB_USER", "SUPABASE_DB_PASSWORD")
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        _json_log("sync_failed", error_code="missing_database_environment", missing=missing)
        return 2
    try:
        import psycopg2
        conn = psycopg2.connect(
            host=os.environ["SUPABASE_DB_HOST"],
            port=os.getenv("SUPABASE_DB_PORT") or "5432",
            dbname=os.environ["SUPABASE_DB_NAME"],
            user=os.environ["SUPABASE_DB_USER"],
            password=os.environ["SUPABASE_DB_PASSWORD"],
            sslmode="require",
            connect_timeout=20,
        )
        with conn.cursor() as role_cursor:
            role_cursor.execute("set role etf_sync_worker")
        conn.commit()
    except Exception as exc:
        _json_log("sync_failed", error_code=_safe_error(exc))
        return 1
    try:
        as_of = dt.date.fromisoformat(args.as_of) if args.as_of else dt.datetime.now(KST).date()
        summary = execute_sync(conn, as_of=as_of, trigger=args.trigger, commit_sha=os.getenv("GITHUB_SHA", ""), write=args.write)
        return 0 if summary["status"] == "success" else 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
