import contextlib
import datetime as dt
import io
import json
import pathlib
import sys
import tempfile
import unittest
from unittest.mock import Mock, call, patch

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import sync_official_etfs as sync


class FakeCursor:
    def __init__(self, fail_on_execute=None):
        self.executed = []
        self.fail_on_execute = fail_on_execute
        self.closed = False

    def execute(self, sql, params):
        self.executed.append((sql, params))
        if self.fail_on_execute and len(self.executed) == self.fail_on_execute:
            raise RuntimeError("write failed")

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, fail_on_execute=None):
        self.cursor_obj = FakeCursor(fail_on_execute)
        self.commit_count = 0
        self.rollback_count = 0
        self.closed = False

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.commit_count += 1

    def rollback(self):
        self.rollback_count += 1

    def close(self):
        self.closed = True


def target_and_record():
    now = dt.datetime.now(dt.timezone.utc)
    target = {"KODEX": {"102970": {"id": "x", "url": "https://example.test/etf", "product_name": "Example ETF"}}}
    record = {
        "ex_date": (now.date() - dt.timedelta(days=1)).isoformat(),
        "fetched_at": now.isoformat(),
        "source_url": "https://example.test/history",
        "parser_version": "test-1",
        "distribution_per_share": 1,
    }
    return target, record


class SyncSafetyTests(unittest.TestCase):
    def test_retry_retries_collector_exception(self):
        collector = Mock(side_effect=[RuntimeError("temporary"), {"status": "empty", "records": []}])
        with patch.object(sync.time, "sleep") as sleep:
            result = sync.collect_with_retry(collector, attempts=2, backoff_seconds=0)
        self.assertEqual(result["status"], "empty")
        self.assertEqual(collector.call_count, 2)
        sleep.assert_called_once_with(0)

    def test_exponential_retry_sleep_is_capped(self):
        collector = Mock(return_value={"status": "failure", "records": [], "error": "temporary"})
        with patch.object(sync.time, "sleep") as sleep:
            sync.collect_with_retry(collector, attempts=5, backoff_seconds=60)
        self.assertEqual(sleep.call_args_list, [call(60), call(60), call(60), call(60)])

    def test_future_ex_date_is_rejected(self):
        record = {"ticker": "0167B0", "ex_date": "2099-01-01", "fetched_at": "2026-09-05T00:00:00+00:00"}
        with self.assertRaises(sync.StaleDataError):
            sync.validate_record(record, now=dt.datetime(2026, 9, 5, tzinfo=dt.timezone.utc))

    def test_future_fetched_at_is_rejected(self):
        record = {"ticker": "0167B0", "ex_date": "2026-08-01", "fetched_at": "2099-01-01T00:00:00+00:00"}
        with self.assertRaises(sync.StaleDataError):
            sync.validate_record(record, now=dt.datetime(2026, 9, 5, tzinfo=dt.timezone.utc))

    def test_dry_run_real_target_never_connects_to_db(self):
        target, record = target_and_record()
        collector = Mock(return_value={"status": "success", "records": [record]})
        with patch.object(sync, "connect_db", side_effect=AssertionError("DB touched")) as connect:
            result = sync.run(targets=target, collector=collector, lock_path=tempfile.mktemp())
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["writes"], 0)
        connect.assert_not_called()
        collector.assert_called_once()

    def test_successful_write_commits_once_and_closes(self):
        target, record = target_and_record()
        connection = FakeConnection()
        collector = Mock(return_value={"status": "success", "records": [record]})
        with patch.object(sync, "connect_db", return_value=connection):
            result = sync.run(write=True, targets=target, collector=collector, lock_path=tempfile.mktemp())
        self.assertEqual(result["writes"], 1)
        self.assertEqual(connection.commit_count, 1)
        self.assertEqual(connection.rollback_count, 0)
        self.assertTrue(connection.cursor_obj.closed)
        self.assertTrue(connection.closed)
        self.assertEqual(len(connection.cursor_obj.executed), 2)
        sql = " ".join(statement for statement, _ in connection.cursor_obj.executed)
        self.assertIn("public.etf_product_cache", sql)
        self.assertIn("public.etf_distribution_history", sql)
        self.assertNotIn("dividend_entries", sql)

    def test_mid_write_exception_rolls_back_once_without_commit(self):
        target, record = target_and_record()
        connection = FakeConnection(fail_on_execute=2)
        collector = Mock(return_value={"status": "success", "records": [record]})
        with patch.object(sync, "connect_db", return_value=connection):
            with self.assertRaisesRegex(RuntimeError, "write failed"):
                sync.run(write=True, targets=target, collector=collector, lock_path=tempfile.mktemp())
        self.assertEqual(connection.commit_count, 0)
        self.assertEqual(connection.rollback_count, 1)
        self.assertTrue(connection.cursor_obj.closed)
        self.assertTrue(connection.closed)

    def test_lock_rejects_second_instance(self):
        with tempfile.TemporaryDirectory() as directory:
            with sync.instance_lock(pathlib.Path(directory) / "sync.lock"):
                with self.assertRaises(sync.LockBusyError):
                    with sync.instance_lock(pathlib.Path(directory) / "sync.lock"):
                        pass

    def test_bounds_rejected_before_collection(self):
        collector = Mock(return_value={"status": "success", "records": []})
        invalid = ({"attempts": 0}, {"attempts": 6}, {"timeout": 0}, {"timeout": 21}, {"backoff_seconds": -1}, {"backoff_seconds": 61}, {"max_age_days": 0})
        for kwargs in invalid:
            with self.assertRaises(ValueError):
                sync.run(targets={"KODEX": {"x": {}}}, collector=collector, lock_path=tempfile.mktemp(), **kwargs)
        collector.assert_not_called()

    def test_sql_only_targets_two_public_tables(self):
        self.assertIn("public.etf_product_cache", sync.PRODUCT_UPSERT_SQL)
        self.assertIn("public.etf_distribution_history", sync.DISTRIBUTION_UPSERT_SQL)
        self.assertNotIn("dividend_entries", sync.PRODUCT_UPSERT_SQL + sync.DISTRIBUTION_UPSERT_SQL)

    def test_empty_and_unsupported_source_fail_without_db(self):
        targets = {"KODEX": {"102970": {"id": "x", "url": "x", "product_name": "x"}}}
        for status in ("empty", "unsupported", "failure", "timeout"):
            with patch.object(sync, "connect_db", side_effect=AssertionError("DB touched")):
                result = sync.run(targets=targets, collector=lambda *a, status=status, **k: {"status": status, "records": []}, lock_path=tempfile.mktemp())
            self.assertEqual(result["status"], "failure")
            self.assertEqual(result["writes"], 0)

    def test_main_fail_closed_returns_nonzero_and_emits_json_lines(self):
        output = io.StringIO()
        with patch.object(sync, "collect", return_value={"status": "failure", "records": [], "error": "source unavailable"}), patch.object(sync.time, "sleep"), contextlib.redirect_stdout(output):
            code = sync.main(["--dry-run", "--lock-path", tempfile.mktemp()])
        self.assertNotEqual(code, 0)
        for line in output.getvalue().splitlines():
            json.loads(line)

    def test_main_lock_contention_returns_nonzero_and_emits_json_lines(self):
        with tempfile.TemporaryDirectory() as directory:
            lock = pathlib.Path(directory) / "sync.lock"
            output = io.StringIO()
            with sync.instance_lock(lock):
                with contextlib.redirect_stdout(output):
                    code = sync.main(["--dry-run", "--lock-path", str(lock)])
            self.assertNotEqual(code, 0)
            for line in output.getvalue().splitlines():
                json.loads(line)

    def test_stale_source_updated_at_is_rejected(self):
        record = {"ex_date": "2026-08-01", "fetched_at": "2026-09-05T00:00:00+00:00", "source_updated_at": "2024-01-01T00:00:00+00:00"}
        with self.assertRaises(sync.StaleDataError):
            sync.validate_record(record, now=dt.datetime(2026, 9, 5, tzinfo=dt.timezone.utc), max_age_days=370)

    def test_explicit_modes_are_mutually_exclusive(self):
        with self.assertRaises(ValueError):
            sync.run(write=True, dry_run=True, targets={}, lock_path=tempfile.mktemp())


if __name__ == "__main__":
    unittest.main()
