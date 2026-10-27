import io
import json
import unittest
from contextlib import redirect_stdout
from datetime import date, datetime, timezone
from pathlib import Path
from unittest.mock import patch

from sync_recent_official_etfs import execute_sync, month_ago
from official_etf_adapters import collect


class FakeCursor:
    def __init__(self):
        self.description = []
        self.rows = []
        self.calls = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params=()):
        self.calls.append((query, params))
        if "from public.get_recent_etf_payments_for_sync" in query:
            self.description = [("ticker",), ("company_name",), ("payment_date",)]
            self.rows = [("0094M0", "RISE 코리아밸류업위클리고정커버드콜", "2026-10-03")]
        elif "from public.ticker_matches" in query:
            self.description = [("source_input",), ("matched_ticker",), ("status",), ("confidence",)]
            self.rows = []
        elif "from public.instrument_search_index" in query:
            self.description = [("symbol",), ("security_type",)]
            self.rows = [("0094M0", "ETF")]
        elif "from public.etf_product_cache" in query:
            self.description = [("ticker",), ("issuer",), ("product_name",), ("official_url",)]
            self.rows = [("0094M0", "RISE", "RISE 코리아밸류업위클리고정커버드콜", "https://riseetf.co.kr/prod/finderDetail/44J2")]
        else:
            self.rows = []

    def fetchall(self):
        return self.rows

    def close(self):
        pass


class FakeConnection:
    def __init__(self):
        self.cursors = []
        self.commits = 0
        self.rollbacks = 0

    def cursor(self):
        cursor = FakeCursor()
        self.cursors.append(cursor)
        return cursor

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


class TigerCursor(FakeCursor):
    def execute(self, query, params=()):
        self.calls.append((query, params))
        if "from public.get_recent_etf_payments_for_sync" in query:
            self.description = [("ticker",), ("company_name",), ("payment_date",)]
            self.rows = [("472150", "TIGER 배당커버드콜액티브", "2026-10-02")]
        elif "from public.ticker_matches" in query:
            self.description = [("source_input",), ("matched_ticker",), ("status",), ("confidence",)]
            self.rows = []
        elif "from public.instrument_search_index" in query:
            self.description = [("symbol",), ("security_type",)]
            self.rows = [("472150", "ETF")]
        elif "from public.etf_product_cache" in query:
            self.description = [("ticker",), ("issuer",), ("product_name",), ("official_url",)]
            self.rows = [("472150", "TIGER", "TIGER 배당커버드콜액티브", "https://investments.miraeasset.com/tigeretf/ko/product/search/detail/index.do?ksdFund=KR7472150002")]
        else:
            self.rows = []


class TigerConnection(FakeConnection):
    def cursor(self):
        cursor = TigerCursor()
        self.cursors.append(cursor)
        return cursor


class DailySyncTests(unittest.TestCase):
    def test_migration_grants_sync_role_select_policies(self):
        migration = Path(__file__).parents[1] / "database" / "202610170001_rise_0094m0_and_sync_run_logs.sql"
        sql = migration.read_text()
        self.assertIn('on public.ticker_matches for select to etf_sync_worker', sql)
        self.assertIn("using (status = 'confirmed' and confidence = 'high')", sql)
        self.assertIn('on public.instrument_search_index for select to etf_sync_worker using (true)', sql)

    def test_month_window_clamps_month_end(self):
        self.assertEqual(month_ago(date(2026, 3, 31)), date(2026, 2, 28))
        self.assertEqual(month_ago(date(2026, 1, 31)), date(2025, 12, 31))

    def test_write_discovers_recent_ticker_and_records_run_and_schedule(self):
        conn = FakeConnection()
        fetched_at = datetime.now(timezone.utc).isoformat()
        calls = []

        def collector(issuer, ticker, source_url):
            calls.append((issuer, ticker, source_url))
            return {"status": "success", "parser_version": "test-v1", "records": [{
                "ticker": ticker, "ex_date": "2026-10-01", "payment_date": "2026-10-19",
                "distribution_per_share": 123, "reference_price": None, "distribution_rate": None,
                "currency": "KRW", "source_url": source_url, "fetched_at": fetched_at,
                "parser_version": "test-v1", "raw_payload": {"public": True},
            }]}

        result = execute_sync(conn, as_of=date(2026, 10, 17), trigger="workflow_dispatch", collector=collector)

        self.assertEqual(calls, [("RISE", "0094M0", "https://kbam.co.kr/api/products/etfs/44J2/dividend?download=xlsx")])
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["records_written"], 1)
        sql = " ".join(query for cursor in conn.cursors for query, _ in cursor.calls)
        self.assertIn("insert into public.etf_distribution_history", sql)
        self.assertIn("insert into public.etf_sync_runs", sql)
        self.assertIn("insert into public.etf_sync_run_sources", sql)
        self.assertNotIn("insert into public.dividend_entries", sql)
        self.assertNotIn("update public.dividend_entries", sql)
        self.assertGreaterEqual(conn.commits, 2)

    def test_daily_sync_discovers_and_parses_tiger_without_database_writes(self):
        conn = TigerConnection()
        fixture = Path(__file__).parent / "fixtures" / "tiger_472150_dividend.html"
        url = "https://investments.miraeasset.com/tigeretf/ko/reference/dividend-excel.ajax?ksdFund=KR7472150002"

        calls = []
        with redirect_stdout(io.StringIO()):
            result = execute_sync(
                conn, as_of=date(2026, 10, 17), trigger="manual", write=False,
                collector=lambda issuer, ticker, source_url: (
                    calls.append((issuer, ticker, source_url)) or collect(
                        issuer, ticker, source_url, payload=fixture.read_bytes()
                    )
                ),
            )

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["candidate_count"], 1)
        self.assertEqual(result["success_count"], 1)
        self.assertEqual(result["records_fetched"], 34)
        self.assertEqual(result["records_written"], 0)
        self.assertEqual(calls, [("TIGER", "472150", url)])
        sql = " ".join(query for cursor in conn.cursors for query, _ in cursor.calls)
        self.assertNotIn("insert into public.etf_distribution_history", sql)
        self.assertNotIn("insert into public.dividend_entries", sql)
        self.assertEqual(conn.commits, 0)

    def test_dry_run_preserves_structured_source_error_code(self):
        conn = FakeConnection()
        output = io.StringIO()
        with redirect_stdout(output):
            result = execute_sync(
                conn, as_of=date(2026, 10, 17), trigger="manual", write=False,
                collector=lambda *_args: {"status": "failure", "records": [], "error_code": "http_403"},
            )
        self.assertEqual(result["status"], "failure")
        self.assertIn('"error_code": "http_403"', output.getvalue())

    def test_dry_run_logs_aggregated_gap_reasons_without_private_instruments(self):
        conn = FakeConnection()
        gaps = [
            {"ticker": "0162Z0", "company_name": "PRIVATE ETF A", "status": "unsupported", "reason": "verified_official_product_mapping_missing"},
            {"ticker": "123456", "company_name": "PRIVATE ETF B", "status": "unsupported", "reason": "verified_official_product_mapping_missing"},
            {"ticker": "654321", "company_name": "PRIVATE ETF C", "status": "manual_review", "reason": "invalid_or_unverified_official_url"},
        ]
        output = io.StringIO()
        with redirect_stdout(output), patch(
            "sync_recent_official_etfs.discover", return_value=([], gaps, len(gaps))
        ):
            result = execute_sync(
                conn, as_of=date(2026, 10, 17), trigger="manual", write=False,
            )

        events = [json.loads(line) for line in output.getvalue().splitlines()]
        gap_events = [event for event in events if event["event"] == "target_resolution_gap_summary"]
        self.assertEqual(gap_events, [
            {"event": "target_resolution_gap_summary", "status": "manual_review",
             "reason": "invalid_or_unverified_official_url", "count": 1},
            {"event": "target_resolution_gap_summary", "status": "unsupported",
             "reason": "verified_official_product_mapping_missing", "count": 2},
        ])
        self.assertNotIn("0162Z0", output.getvalue())
        self.assertNotIn("PRIVATE ETF", output.getvalue())
        self.assertEqual(result["status"], "failure")
        self.assertEqual(conn.commits, 0)

    def test_dry_run_does_not_write_any_database_rows(self):
        conn = FakeConnection()
        result = execute_sync(conn, as_of=date(2026, 10, 17), trigger="manual", write=False,
                              collector=lambda *_args: {"status": "empty", "records": []})
        self.assertEqual(result["mode"], "dry-run")
        self.assertEqual(conn.commits, 0)
        sql = " ".join(query for cursor in conn.cursors for query, _ in cursor.calls)
        self.assertNotIn("insert into public.etf_sync_runs", sql)
        self.assertNotIn("insert into public.etf_distribution_history", sql)


if __name__ == "__main__":
    unittest.main()
