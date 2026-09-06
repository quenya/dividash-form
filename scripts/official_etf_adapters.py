"""Bounded, read-only adapters for official Korean ETF distribution sources.

Adapters return a stable result contract and never write to Supabase. Persistence is
intentionally owned by a separate trusted sync job.
"""
from __future__ import annotations

import json
import re
from datetime import date, datetime, timezone
from html import unescape
from typing import Any, Callable, Dict, Iterable, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

PARSER_VERSION = "official-adapters-v1"
MAX_TIMEOUT_SECONDS = 20

# URLs are sourced from the existing issuer sync boundary. Do not add guessed URLs.
SOURCES = {
    "KODEX": "https://www.samsungfund.com/api/v1/kodex/divid-info.do?id={product_id}",
    "SOL": "https://www.soletf.com/api/etf/pds/dividend/{fund_code}",
    "RISE": "https://www.riseetf.co.kr/prod/finderDetail/{product_page}",
}


def _date(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip().replace("-", "")
    if not re.fullmatch(r"\d{8}", text):
        return None
    try:
        return datetime.strptime(text, "%Y%m%d").date().isoformat()
    except ValueError:
        return None


def _number(value: Any) -> Optional[float]:
    if value is None or str(value).strip() == "":
        return None
    try:
        return float(str(value).replace(",", "").replace("%", "").strip())
    except (TypeError, ValueError):
        return None


def _record(issuer: str, ticker: str, source_url: str, ex_date: Any,
            payment_date: Any, amount: Any, reference_price: Any,
            raw_payload: Any) -> Dict[str, Any]:
    amount_n = _number(amount)
    price_n = _number(reference_price)
    rate = amount_n / price_n * 100 if amount_n is not None and price_n and price_n > 0 else None
    return {
        "ticker": str(ticker).strip().upper(),
        "ex_date": _date(ex_date) if not isinstance(ex_date, date) else ex_date.isoformat(),
        "payment_date": _date(payment_date) if not isinstance(payment_date, date) else payment_date.isoformat(),
        "distribution_per_share": amount_n,
        "reference_price": price_n,
        "distribution_rate": rate,
        "currency": "KRW",
        "source_issuer": issuer,
        "source_url": source_url,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "parser_version": PARSER_VERSION,
        "raw_payload": raw_payload,
    }


def parse_kodex(payload: Any, ticker: str, source_url: str) -> list:
    """Parse Samsung KODEX ``dividList`` JSON."""
    rows = payload.get("dividList") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        raise ValueError("KODEX response missing dividList")
    return [_record("KODEX", ticker, source_url, row.get("basicD"), row.get("payD"),
                    row.get("dividA"), None, row) for row in rows if isinstance(row, dict)]


def parse_sol(payload: Any, ticker: str, source_url: str) -> list:
    """Parse Shinhan SOL ``items`` JSON."""
    rows = payload.get("items") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        raise ValueError("SOL response missing items")
    return [_record("SOL", ticker, source_url, row.get("WORK_DT"), row.get("DIVIDEND_DT"),
                    row.get("DIVIDEND_PRI"), row.get("BFAS_STAS_STPR"), row) for row in rows if isinstance(row, dict)]


_RISE_ROW = re.compile(r"<tr[^>]*>\s*(?:<td[^>]*>\s*)?(\d{4}[-/]\d{2}[-/]\d{2}).*?</td>\s*"
                       r"(?:<td[^>]*>\s*)?(\d{4}[-/]\d{2}[-/]\d{2}).*?</td>\s*"
                       r"(?:<td[^>]*>\s*)?([^<]+?)\s*</td>", re.I | re.S)


def parse_rise(html: str, ticker: str, source_url: str) -> list:
    """Parse RISE product HTML distribution table without relying on a DOM library."""
    text = unescape(html)
    marker = text.find("분배금 지급현황")
    if marker < 0:
        raise ValueError("RISE response missing distribution section")
    rows = []
    for ex_date, payment_date, amount in _RISE_ROW.findall(text[marker:]):
        rows.append(_record("RISE", ticker, source_url, ex_date, payment_date, amount, None,
                            {"ex_date": ex_date, "payment_date": payment_date, "amount": amount.strip()}))
    return rows


def _fetch(url: str, timeout: int = MAX_TIMEOUT_SECONDS) -> str:
    if not isinstance(timeout, int) or timeout < 1 or timeout > MAX_TIMEOUT_SECONDS:
        raise ValueError(f"timeout must be 1-{MAX_TIMEOUT_SECONDS} seconds")
    request = Request(url, headers={"User-Agent": "DiviDash-official-adapter/1.0"})
    with urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8")


def collect(issuer: str, ticker: str, source_url: str,
            fetcher: Callable[[str, int], str] = _fetch, timeout: int = MAX_TIMEOUT_SECONDS,
            payload: Any = None) -> Dict[str, Any]:
    """Collect one source with explicit status and provenance.

    ``payload`` is a test seam; when omitted, only the supplied official URL is fetched.
    """
    issuer = str(issuer or "").strip().upper()
    base = {"issuer": issuer, "ticker": ticker, "source_url": source_url,
            "parser_version": PARSER_VERSION, "records": []}
    if issuer not in SOURCES:
        return {**base, "status": "unsupported", "error": "unsupported issuer"}
    if not isinstance(timeout, int) or timeout < 1 or timeout > MAX_TIMEOUT_SECONDS:
        return {**base, "status": "failure", "error": f"timeout must be 1-{MAX_TIMEOUT_SECONDS} seconds"}
    try:
        body = payload if payload is not None else fetcher(source_url, timeout)
        if issuer == "KODEX":
            parsed = parse_kodex(body if isinstance(body, (dict, list)) else json.loads(body), ticker, source_url)
        elif issuer == "SOL":
            parsed = parse_sol(body if isinstance(body, (dict, list)) else json.loads(body), ticker, source_url)
        else:
            parsed = parse_rise(str(body), ticker, source_url)
        base["records"] = parsed
        base["status"] = "success" if parsed else "empty"
        return base
    except (TimeoutError, HTTPError, URLError) as exc:
        return {**base, "status": "timeout" if isinstance(exc, TimeoutError) else "failure", "error": str(exc)}
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        return {**base, "status": "failure", "error": str(exc)}


__all__ = ["SOURCES", "PARSER_VERSION", "MAX_TIMEOUT_SECONDS", "collect", "parse_kodex", "parse_sol", "parse_rise"]
