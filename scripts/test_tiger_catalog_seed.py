import pathlib
import unittest


ROOT = pathlib.Path(__file__).parents[1]
MIGRATION = (ROOT / "database/202609050001_tiger_dividend_covered_call.sql").read_text()
BASE_SCHEMA = (ROOT / "database/etf_product_cache.sql").read_text()
MATCHING = (ROOT / "database/ticker_matching.sql").read_text()


class TigerCatalogSeedTests(unittest.TestCase):
    def test_verified_identity_and_official_url_are_seeded(self):
        self.assertIn("'472150'", MIGRATION)
        self.assertIn("'TIGER 배당커버드콜액티브'", MIGRATION)
        self.assertIn("https://investments.miraeasset.com/tigeretf/ko/product/search/detail/index.do?ksdFund=KR7472150002", MIGRATION)
        self.assertIn("'TIGER'", BASE_SCHEMA)

    def test_seed_is_idempotent_and_does_not_touch_user_dividends(self):
        self.assertIn("ON CONFLICT (ticker) DO UPDATE", MIGRATION)
        self.assertNotIn("INSERT INTO PUBLIC.DIVIDEND_ENTRIES", MIGRATION.upper())

    def test_matching_seed_connects_exact_name_to_ticker(self):
        self.assertIn("('TIGER 배당커버드콜액티브', '472150'", MATCHING)
        self.assertIn("'confirmed', 'high'", MATCHING)
        self.assertIn("KR7472150002", MATCHING)


if __name__ == "__main__":
    unittest.main()