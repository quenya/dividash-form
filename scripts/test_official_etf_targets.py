import unittest
from datetime import date

from scripts.official_etf_targets import resolve_targets


class OfficialEtfTargetTests(unittest.TestCase):
    def test_resolves_official_api_urls_from_verified_product_pages(self):
        for issuer, ticker, product_name, url, expected in [
            ("KODEX", "123456", "verified", "https://www.samsungfund.com/etf/product/view.do?id=2ETF15", "https://www.samsungfund.com/api/v1/kodex/divid-info.do?id=2ETF15"),
            ("SOL", "123456", "verified", "https://www.soletf.com/ko/fund/etf/211107?tabIndex=1", "https://www.soletf.com/api/etf/pds/dividend/211107"),
            ("TIGER", "472150", "TIGER 배당커버드콜액티브", "https://investments.miraeasset.com/tigeretf/ko/product/search/detail/index.do?ksdFund=KR7472150002", "https://investments.miraeasset.com/tigeretf/ko/reference/dividend-excel.ajax?ksdFund=KR7472150002"),
        ]:
            with self.subTest(issuer=issuer):
                targets, gaps = resolve_targets(
                    entries=[{"ticker": ticker, "payment_date": "2026-10-01"}],
                    instruments=[{"symbol": ticker, "security_type": "ETF"}],
                    products=[{"ticker": ticker, "issuer": issuer, "product_name": product_name, "official_url": url}],
                    as_of=date(2026, 10, 17),
                )
                self.assertEqual(targets[0]["source_url"], expected)
                self.assertEqual(gaps, [])

    def test_resolves_tiger_by_verified_official_url_and_product_name(self):
        url = "https://investments.miraeasset.com/tigeretf/ko/product/search/detail/index.do?ksdFund=KR7472150002"
        targets, unresolved = resolve_targets(
            entries=[{"ticker": "472150", "company_name": "TIGER 배당커버드콜액티브", "payment_date": "2026-10-02"}],
            instruments=[{"symbol": "472150", "security_type": "ETF"}],
            products=[{"ticker": "472150", "issuer": "TIGER", "product_name": "TIGER 배당커버드콜액티브", "official_url": url}],
            as_of=date(2026, 10, 17),
        )
        self.assertEqual(targets[0]["source_url"], "https://investments.miraeasset.com/tigeretf/ko/reference/dividend-excel.ajax?ksdFund=KR7472150002")
        self.assertEqual(unresolved, [])

    def test_rejects_mismatched_tiger_product_name(self):
        targets, unresolved = resolve_targets(
            entries=[{"ticker": "472150", "payment_date": "2026-10-02"}],
            instruments=[{"symbol": "472150", "security_type": "ETF"}],
            products=[{"ticker": "472150", "issuer": "TIGER", "product_name": "different TIGER product", "official_url": "https://investments.miraeasset.com/tigeretf/ko/product/search/detail/index.do?ksdFund=KR7472150002"}],
            as_of=date(2026, 10, 17),
        )
        self.assertEqual(targets, [])
        self.assertEqual(unresolved[0]["reason"], "verified_tiger_product_mismatch")

    def test_rejects_unverified_tiger_product_code(self):
        targets, unresolved = resolve_targets(
            entries=[{"ticker": "472150", "payment_date": "2026-10-02"}],
            instruments=[{"symbol": "472150", "security_type": "ETF"}],
            products=[{"ticker": "472150", "issuer": "TIGER", "product_name": "incorrect", "official_url": "https://investments.miraeasset.com/tigeretf/ko/product/search/detail/index.do?ksdFund=OTHER"}],
            as_of=date(2026, 10, 17),
        )
        self.assertEqual(targets, [])
        self.assertEqual(unresolved[0]["reason"], "invalid_or_unverified_official_url")

    def test_resolves_name_only_entry_only_through_unique_confirmed_high_match(self):
        matches = [{"source_input": "RISE sample", "matched_ticker": "0094M0", "status": "confirmed", "confidence": "high"}]
        targets, _ = resolve_targets(
            entries=[{"company_name": "RISE sample", "payment_date": "2026-10-01"}],
            instruments=[{"symbol": "0094M0", "security_type": "ETF"}],
            products=[{"ticker": "0094M0", "issuer": "RISE", "product_name": "sample", "official_url": "https://riseetf.co.kr/prod/finderDetail/44J2"}],
            matches=matches, as_of=date(2026, 10, 17),
        )
        self.assertEqual([target["ticker"] for target in targets], ["0094M0"])

    def test_reports_instrument_catalog_gaps_and_conflicting_aliases(self):
        targets, unresolved = resolve_targets(
            entries=[
                {"ticker": "0162Z0", "payment_date": "2026-10-01"},
                {"company_name": "ambiguous", "payment_date": "2026-10-02"},
            ],
            instruments=[], products=[], as_of=date(2026, 10, 17),
            matches=[
                {"source_input": "ambiguous", "matched_ticker": "0094M0", "status": "confirmed", "confidence": "high"},
                {"source_input": "ambiguous", "matched_ticker": "0162Z0", "status": "confirmed", "confidence": "high"},
            ],
        )
        self.assertEqual(targets, [])
        self.assertIn("instrument_metadata_missing", [row["reason"] for row in unresolved])
        self.assertIn("unique_confirmed_ticker_match_missing", [row["reason"] for row in unresolved])

    def test_resolves_recent_verified_etfs_from_product_cache_not_fixed_sync_list(self):
        entries = [
            {"ticker": "0094m0", "company_name": "RISE 코리아밸류업위클리고정커버드콜", "payment_date": "2026-09-25"},
            {"ticker": "0094M0", "company_name": "RISE 코리아밸류업위클리고정커버드콜", "payment_date": "2026-10-03"},
            {"ticker": "999999", "company_name": "미확인", "payment_date": "2026-10-05"},
            {"ticker": "888888", "company_name": "오래된 지급", "payment_date": "2026-08-01"},
        ]
        instruments = [
            {"symbol": "0094M0", "security_type": "ETF"},
            {"symbol": "999999", "security_type": "주식"},
            {"symbol": "888888", "security_type": "ETF"},
        ]
        products = [{
            "ticker": "0094M0", "issuer": "RISE",
            "product_name": "RISE 코리아밸류업위클리고정커버드콜",
            "official_url": "https://riseetf.co.kr/prod/finderDetail/44J2",
        }]

        targets, unresolved = resolve_targets(
            entries=entries, instruments=instruments, products=products,
            as_of=date(2026, 10, 17),
        )

        self.assertEqual(len(targets), 1)
        self.assertEqual(targets[0]["ticker"], "0094M0")
        self.assertEqual(targets[0]["source_url"], "https://kbam.co.kr/api/products/etfs/44J2/dividend?download=xlsx")
        self.assertEqual(unresolved, [])

    def test_reports_recent_etf_without_verified_official_product_mapping(self):
        targets, unresolved = resolve_targets(
            entries=[{"ticker": "0162Z0", "payment_date": "2026-10-01"}],
            instruments=[{"symbol": "0162Z0", "security_type": "ETF"}],
            products=[], as_of=date(2026, 10, 17),
        )
        self.assertEqual(targets, [])
        self.assertEqual(unresolved, [{"ticker": "0162Z0", "status": "unsupported", "reason": "verified_official_product_mapping_missing"}])

    def test_rejects_non_issuer_urls_and_invalid_tickers(self):
        targets, unresolved = resolve_targets(
            entries=[{"ticker": "123456", "payment_date": "2026-10-01"}],
            instruments=[{"symbol": "123456", "security_type": "ETF"}],
            products=[{"ticker": "123456", "issuer": "RISE", "product_name": "x", "official_url": "https://example.invalid/item"}],
            as_of=date(2026, 10, 17),
        )
        self.assertEqual(targets, [])
        self.assertEqual(unresolved[0]["status"], "manual_review")


if __name__ == "__main__":
    unittest.main()
