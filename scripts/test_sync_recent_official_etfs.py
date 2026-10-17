import unittest
from datetime import date, datetime, timezone
from pathlib import Path

from sync_recent_official_etfs import execute_sync, month_ago


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
