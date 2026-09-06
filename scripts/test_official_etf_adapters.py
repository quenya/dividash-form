import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from official_etf_adapters import (MAX_TIMEOUT_SECONDS, SOURCES, collect,
                                   parse_kodex, parse_rise, parse_sol)


class OfficialAdapterContractTests(unittest.TestCase):
    def test_kodex_contract_and_provenance(self):
        url = SOURCES["KODEX"].format(product_id="2ETF15")
        result = collect("KODEX", "102970", url, payload={"dividList": [{
            "basicD": "20260801", "payD": "20260805", "dividA": "123.45"
        }]})
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["records"][0]["ex_date"], "2026-08-01")
        self.assertEqual(result["records"][0]["source_url"], url)
        self.assertEqual(result["records"][0]["source_issuer"], "KODEX")

    def test_sol_rate_and_raw_payload(self):
        url = SOURCES["SOL"].format(fund_code="211107")
        result = collect("SOL", "0167B0", url, payload={"items": [{
            "WORK_DT": "20260801", "DIVIDEND_DT": "20260805",
            "DIVIDEND_PRI": "100", "BFAS_STAS_STPR": "10000"
        }]})
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["records"][0]["distribution_rate"], 1.0)
        self.assertEqual(result["records"][0]["raw_payload"]["DIVIDEND_PRI"], "100")

    def test_rise_html_parser(self):
        url = SOURCES["RISE"].format(product_page="44K1")
        html = "<h3>분배금 지급현황</h3><table><tr><td>2026-08-01</td><td>2026-08-05</td><td>75</td><td>tax</td></tr></table>"
        result = collect("RISE", "0162Z0", url, payload=html)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["records"][0]["distribution_per_share"], 75.0)

    def test_empty_and_malformed_are_explicit(self):
        url = SOURCES["KODEX"].format(product_id="2ETF15")
        self.assertEqual(collect("KODEX", "102970", url, payload={"dividList": []})["status"], "empty")
        self.assertEqual(collect("KODEX", "102970", url, payload={"wrong": []})["status"], "failure")

    def test_timeout_and_unsupported_are_explicit(self):
        url = SOURCES["SOL"].format(fund_code="211107")
        def timed_out(_url, _timeout):
            raise TimeoutError("bounded timeout")
        self.assertEqual(collect("SOL", "0167B0", url, fetcher=timed_out)["status"], "timeout")
        self.assertEqual(collect("TIGER", "123456", "https://example.invalid")["status"], "unsupported")

    def test_timeout_bound_rejects_unbounded_values(self):
        url = SOURCES["KODEX"].format(product_id="2ETF15")
        result = collect("KODEX", "102970", url, timeout=MAX_TIMEOUT_SECONDS + 1, payload={"dividList": []})
        self.assertEqual(result["status"], "failure")

    def test_parsers_do_not_write_dividend_entries(self):
        source = json.dumps({"items": []})
        result = collect("SOL", "0167B0", SOURCES["SOL"].format(fund_code="211107"), payload=source)
        self.assertNotIn("dividend_entries", json.dumps(result))


if __name__ == "__main__":
    unittest.main()
