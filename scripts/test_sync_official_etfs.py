import datetime as dt
import json
import pathlib
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import sync_official_etfs as sync


class SyncSafetyTests(unittest.TestCase):
    def test_retry_retries_collector_exception(self):
        collector = Mock(side_effect=[RuntimeError("temporary"), {"status": "empty", "records": []}])
        with patch.object(sync.time, "sleep") as sleep:
            result = sync.collect_with_retry(collector, attempts=2, backoff_seconds=0)
        self.assertEqual(result["status"], "empty")
        self.assertEqual(collector.call_count, 2)
        sleep.assert_called_once()

    def test_future_ex_date_is_rejected(self):
        record = {"ticker": "0167B0", "ex_date": "2099-01-01", "fetched_at": "2026-09-05T00:00:00+00:00"}
        with self.assertRaises(sync.StaleDataError):
            sync.validate_record(record, now=dt.datetime(2026, 9, 5, tzinfo=dt.timezone.utc))

    def test_future_fetched_at_is_rejected(self):
        record = {"ticker": "0167B0", "ex_date": "2026-08-01", "fetched_at": "2099-01-01T00:00:00+00:00"}
        with self.assertRaises(sync.StaleDataError):
            sync.validate_record(record, now=dt.datetime(2026, 9, 5, tzinfo=dt.timezone.utc))

    def test_dry_run_never_imports_or_connects_to_db(self):
        with patch.object(sync, "connect_db", side_effect=AssertionError("DB touched")):
            result = sync.run(write=False, targets={}, collector=lambda *args: None)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["writes"], 0)

    def test_lock_rejects_second_instance(self):
        with tempfile.TemporaryDirectory() as directory:
            with sync.instance_lock(pathlib.Path(directory) / "sync.lock"):
                with self.assertRaises(sync.LockBusyError):
                    with sync.instance_lock(pathlib.Path(directory) / "sync.lock"):
                        pass

    def test_bounds_rejected_before_collection(self):
        collector = Mock(return_value={"status": "success", "records": []})
        for kwargs in ({"attempts": 0}, {"attempts": 6}, {"timeout": 0}, {"timeout": 21}, {"backoff_seconds": -1}, {"backoff_seconds": 61}):
            with self.assertRaises(ValueError):
                sync.run(targets={}, collector=collector, lock_path=tempfile.mktemp(), **kwargs)
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

    def test_stale_source_updated_at_is_rejected(self):
        record = {"ex_date": "2026-08-01", "fetched_at": "2026-09-05T00:00:00+00:00", "source_updated_at": "2024-01-01T00:00:00+00:00"}
        with self.assertRaises(sync.StaleDataError):
            sync.validate_record(record, now=dt.datetime(2026, 9, 5, tzinfo=dt.timezone.utc), max_age_days=370)

    def test_explicit_modes_are_mutually_exclusive(self):
        with self.assertRaises(ValueError):
            sync.run(write=True, dry_run=True, targets={}, lock_path=tempfile.mktemp())


if __name__ == "__main__":
    unittest.main()
