"""Resolve recent verified ETF payments to known official issuer pages."""
from __future__ import annotations

from datetime import date
import re
from urllib.parse import parse_qs, urlparse

ISSUER_HOSTS = {
    "KODEX": {"www.samsungfund.com"},
    "RISE": {"riseetf.co.kr", "www.riseetf.co.kr"},
    "TIGER": {"investments.miraeasset.com"},
    "SOL": {"www.soletf.com", "www.soletf.co.kr"},
}


def _normalized_ticker(value):
    return str(value or "").strip().upper()


def _previous_month(value):
    month = value.month - 1 or 12
    year = value.year - (value.month == 1)
    if month == 12:
        return date(year, month, min(value.day, 31))
    return date(year, month, min(value.day, (date(year, month + 1, 1) - date.resolution).day))


def _source_url(issuer, official_url):
    parsed = urlparse(str(official_url or ""))
    try:
        port = parsed.port
    except ValueError:
        return None
    if (
        parsed.scheme != "https"
        or parsed.username is not None
        or parsed.password is not None
        or port not in (None, 443)
        or parsed.hostname not in ISSUER_HOSTS.get(issuer, set())
    ):
        return None
    if issuer == "RISE":
        parts = parsed.path.rstrip("/").split("/")
        if len(parts) == 4 and parts[1:3] == ["prod", "finderDetail"] and parts[3].isalnum():
            return f"https://kbam.co.kr/api/products/etfs/{parts[3]}/dividend?download=xlsx"
    elif issuer == "TIGER" and parsed.path == "/tigeretf/ko/product/search/detail/index.do":
        fund_code = parse_qs(parsed.query).get("ksdFund", [""])[0]
        if fund_code == "KR7472150002":
            return f"https://investments.miraeasset.com/tigeretf/ko/reference/dividend-excel.ajax?ksdFund={fund_code}"
    elif issuer == "KODEX" and parsed.path == "/etf/product/view.do":
        product_id = parse_qs(parsed.query).get("id", [""])[0]
        if product_id and product_id.isalnum():
            return f"https://www.samsungfund.com/api/v1/kodex/divid-info.do?id={product_id}"
    elif issuer == "SOL":
        parts = parsed.path.rstrip("/").split("/")
        if len(parts) == 5 and parts[1:4] == ["ko", "fund", "etf"] and parts[4].isdigit():
            return f"https://{parsed.hostname}/api/etf/pds/dividend/{parts[4]}"
    return None


def _is_etf(value):
    text = str(value or "").strip().casefold()
    return text == "etf" or "상장지수" in text


def resolve_targets(*, entries, instruments, products, as_of, matches=()):
    """Return deduplicated recent ETF collector targets and explicit review gaps.

    Only official URL mappings already verified in the product cache are followed.
    ``entries`` must contain payment_date and may contain ticker/company_name.
    """
    start = _previous_month(as_of)
    aliases = {}
    for match in matches:
        if str(match.get("status", "")).casefold() != "confirmed" or str(match.get("confidence", "")).casefold() != "high":
            continue
        ticker = _normalized_ticker(match.get("matched_ticker"))
        name = "".join(str(match.get("source_input", "")).casefold().split())
        if ticker and name:
            aliases.setdefault(name, set()).add(ticker)

    tickers = set()
    unresolved = []
    for entry in entries:
        try:
            paid = date.fromisoformat(str(entry.get("payment_date", ""))[:10])
        except ValueError:
            continue
        if start <= paid <= as_of:
            ticker = _normalized_ticker(entry.get("ticker"))
            if not ticker:
                name = "".join(str(entry.get("company_name", "")).casefold().split())
                candidates = aliases.get(name, set())
                if len(candidates) == 1:
                    ticker = next(iter(candidates))
            if ticker:
                if not re.fullmatch(r"[A-Z0-9]{6}", ticker):
                    unresolved.append({"ticker": ticker, "status": "manual_review", "reason": "invalid_ticker_format"})
                else:
                    tickers.add(ticker)
            else:
                unresolved.append({
                    "ticker": None,
                    "company_name": entry.get("company_name"),
                    "status": "manual_review",
                    "reason": "unique_confirmed_ticker_match_missing",
                })

    instruments_by_ticker = {
        _normalized_ticker(item.get("symbol")): item
        for item in instruments if _normalized_ticker(item.get("symbol"))
    }
    etf_tickers = {
        ticker for ticker, item in instruments_by_ticker.items()
        if _is_etf(item.get("security_type"))
    }
    products_by_ticker = {}
    for product in products:
        ticker = _normalized_ticker(product.get("ticker"))
        if ticker:
            products_by_ticker.setdefault(ticker, []).append(product)

    targets = []
    for ticker in sorted(tickers):
        if ticker not in instruments_by_ticker:
            unresolved.append({"ticker": ticker, "status": "manual_review", "reason": "instrument_metadata_missing"})
            continue
        if ticker not in etf_tickers:
            continue
        records = products_by_ticker.get(ticker, [])
        if not records:
            unresolved.append({"ticker": ticker, "status": "unsupported", "reason": "verified_official_product_mapping_missing"})
            continue
        if len(records) != 1:
            unresolved.append({"ticker": ticker, "status": "manual_review", "reason": "conflicting_official_product_mappings"})
            continue
        product = records[0]
        issuer = str(product.get("issuer", "")).strip().upper()
        source_url = _source_url(issuer, product.get("official_url"))
        if not source_url or issuer not in ISSUER_HOSTS:
            unresolved.append({"ticker": ticker, "status": "manual_review", "reason": "invalid_or_unverified_official_url"})
            continue
        if issuer == "TIGER" and (ticker != "472150" or product.get("product_name") != "TIGER 배당커버드콜액티브"):
            unresolved.append({"ticker": ticker, "status": "manual_review", "reason": "verified_tiger_product_mismatch"})
            continue
        targets.append({
            "ticker": ticker,
            "issuer": issuer,
            "product_name": product.get("product_name"),
            "official_url": product["official_url"],
            "source_url": source_url,
        })
    return targets, unresolved
