"""Bounded, read-only adapters for official Korean ETF distribution sources.

Adapters return a stable result contract and never write to Supabase. Persistence is
intentionally owned by a separate trusted sync job.
"""
from __future__ import annotations

import io
import json
import re
import socket
import ssl
import zipfile
import xml.etree.ElementTree as ET
from datetime import date, datetime, timezone
from html import unescape
from typing import Any, Callable, Dict, Iterable, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

PARSER_VERSION = "official-adapters-v2"
MAX_TIMEOUT_SECONDS = 20

# URLs are sourced from the existing issuer sync boundary. Do not add guessed URLs.
SOURCES = {
    "KODEX": "https://www.samsungfund.com/api/v1/kodex/divid-info.do?id={product_id}",
    "SOL": "https://www.soletf.com/api/etf/pds/dividend/{fund_code}",
    "RISE": "https://kbam.co.kr/api/products/etfs/{product_page}/dividend?download=xlsx",
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


def parse_rise_xlsx(payload: bytes, ticker: str, source_url: str) -> list:
    """Parse the official KBAM/Rise distribution-history XLSX export."""
    if not isinstance(payload, bytes) or len(payload) > 10_000_000:
        raise ValueError("RISE XLSX payload invalid or too large")
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    try:
        with zipfile.ZipFile(io.BytesIO(payload)) as workbook:
            names = set(workbook.namelist())
            sheet_path = "xl/worksheets/sheet1.xml"
            if sheet_path not in names:
                raise ValueError("RISE XLSX missing first worksheet")
            shared = []
            if "xl/sharedStrings.xml" in names:
                root = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
                shared = ["".join(node.itertext()) for node in root.findall("m:si", ns)]
            root = ET.fromstring(workbook.read(sheet_path))
    except (zipfile.BadZipFile, KeyError, ET.ParseError) as exc:
        raise ValueError("RISE XLSX is malformed") from exc

    def column_index(reference):
        letters = re.match(r"[A-Z]+", reference or "")
        if not letters:
            raise ValueError("RISE XLSX has invalid cell reference")
        value = 0
        for char in letters.group(0):
            value = value * 26 + ord(char) - 64
        return value - 1

    rows = []
    for row in root.findall(".//m:sheetData/m:row", ns):
        values = {}
        for cell in row.findall("m:c", ns):
            kind = cell.get("t")
            if kind == "inlineStr":
                value = "".join(cell.find("m:is", ns).itertext()) if cell.find("m:is", ns) is not None else ""
            else:
                raw = cell.findtext("m:v", default="", namespaces=ns)
                if kind == "s":
                    try:
                        value = shared[int(raw)]
                    except (ValueError, IndexError):
                        raise ValueError("RISE XLSX has invalid shared string")
                else:
                    value = raw
            values[column_index(cell.get("r"))] = value
        rows.append(values)
        if len(rows) > 5001:
            raise ValueError("RISE XLSX exceeds row limit")

    if not rows:
        raise ValueError("RISE XLSX missing header row")
    headers = {str(value).strip(): index for index, value in rows[0].items()}
    required = ("지급기준일", "실지급일", "분배금액(원)", "주당과세표준액(원)", "분배율(%)")
    if any(header not in headers for header in required):
        raise ValueError("RISE XLSX header schema changed")
    records = []
    for values in rows[1:]:
        raw = {header: values.get(headers[header], "") for header in required}
        if not any(str(value).strip() for value in raw.values()):
            continue
        record = _record("RISE", ticker, source_url, raw["지급기준일"], raw["실지급일"],
                         raw["분배금액(원)"], None, raw)
        record["distribution_rate"] = _number(raw["분배율(%)"])
        record["taxable_base_per_share"] = _number(raw["주당과세표준액(원)"])
        records.append(record)
    return records


def _fetch(url: str, timeout: int = MAX_TIMEOUT_SECONDS) -> bytes:
    if not isinstance(timeout, int) or timeout < 1 or timeout > MAX_TIMEOUT_SECONDS:
        raise ValueError(f"timeout must be 1-{MAX_TIMEOUT_SECONDS} seconds")
    request = Request(url, headers={"User-Agent": "DiviDash-official-adapter/1.0"})
    with urlopen(request, timeout=timeout) as response:
        return response.read(10_000_001)



def collect(issuer: str, ticker: str, source_url: str,
            fetcher: Callable[[str, int], Any] = _fetch, timeout: int = MAX_TIMEOUT_SECONDS,
            payload: Any = None) -> Dict[str, Any]:
    """Collect one source with explicit status and provenance.

    ``payload`` is a test seam; when omitted, only the supplied official URL is fetched.
    """
    issuer = str(issuer or "").strip().upper()
    base = {"issuer": issuer, "ticker": ticker, "source_url": source_url,
            "parser_version": PARSER_VERSION, "records": []}
    if issuer not in SOURCES:
        return {**base, "status": "unsupported", "error": "unsupported issuer", "error_code": "unsupported_issuer"}
    if not isinstance(timeout, int) or timeout < 1 or timeout > MAX_TIMEOUT_SECONDS:
        return {**base, "status": "failure", "error": f"timeout must be 1-{MAX_TIMEOUT_SECONDS} seconds", "error_code": "invalid_timeout"}
    try:
        body = payload if payload is not None else fetcher(source_url, timeout)
        if issuer == "KODEX":
            if isinstance(body, bytes):
                body = body.decode("utf-8")
            parsed = parse_kodex(body if isinstance(body, (dict, list)) else json.loads(body), ticker, source_url)
        elif issuer == "SOL":
            if isinstance(body, bytes):
                body = body.decode("utf-8")
            parsed = parse_sol(body if isinstance(body, (dict, list)) else json.loads(body), ticker, source_url)
        elif isinstance(body, bytes) and body.startswith(b"PK"):
            parsed = parse_rise_xlsx(body, ticker, source_url)
        else:
            parsed = parse_rise(body.decode("utf-8") if isinstance(body, bytes) else str(body), ticker, source_url)
        base["records"] = parsed
        base["status"] = "success" if parsed else "empty"
        return base
    except TimeoutError as exc:
        return {**base, "status": "timeout", "error": str(exc), "error_code": "request_timeout"}
    except HTTPError as exc:
        return {**base, "status": "failure", "error": str(exc), "error_code": f"http_{exc.code}"}
    except URLError as exc:
        reason = exc.reason
        if isinstance(reason, TimeoutError):
            code = "request_timeout"
        elif isinstance(reason, socket.gaierror):
            code = "network_dns_error"
        elif isinstance(reason, ssl.SSLError):
            code = "network_tls_error"
        elif isinstance(reason, (ConnectionError, OSError)):
            code = "network_connection_error"
        else:
            code = "network_error"
        return {**base, "status": "failure", "error": str(exc), "error_code": code}
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        return {**base, "status": "failure", "error": str(exc), "error_code": "invalid_source_response"}


__all__ = ["SOURCES", "PARSER_VERSION", "MAX_TIMEOUT_SECONDS", "collect", "parse_kodex", "parse_sol", "parse_rise"]
