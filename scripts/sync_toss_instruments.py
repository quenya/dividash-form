#!/usr/bin/env python3
"""Refresh the public instrument search index from Toss Securities Open API."""
import csv
import json
import os
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

MARKETS = ["KOSPI", "KOSDAQ", "NASDAQ", "NYSE", "AMEX"]
BASE_URL = os.environ.get("TOSSINVEST_BASE_URL", "https://openapi.tossinvest.com")


def request_json(url, *, data=None, headers=None):
    request = urllib.request.Request(url, data=data, headers=headers or {})
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.load(response)


def get_token():
    body = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": os.environ["TOSSINVEST_CLIENT_ID"],
        "client_secret": os.environ["TOSSINVEST_CLIENT_SECRET"],
    }).encode()
    return request_json(
        f"{BASE_URL}/oauth2/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )["access_token"]


def load_market(token, market):
    url = f"{BASE_URL}/api/v1/stocks/all?{urllib.parse.urlencode({'market': market, 'status': 'ACTIVE'})}"
    for attempt in range(3):
        try:
            payload = request_json(url, headers={"Authorization": f"Bearer {token}"})
            return [{**item, "market": market} for item in payload.get("result", [])]
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 2:
                raise
            time.sleep(1.2 * (attempt + 1))


def psql_args():
    return [
        os.environ.get("PSQL_BIN", "/opt/homebrew/opt/libpq/bin/psql"),
        "-h", os.environ["SUPABASE_DB_HOST"],
        "-p", os.environ.get("SUPABASE_DB_PORT", "5432"),
        "-U", os.environ["SUPABASE_DB_USER"],
        "-d", os.environ.get("SUPABASE_DB_NAME", "postgres"),
        "-v", "ON_ERROR_STOP=1",
    ]


def main():
    token = get_token()
    rows = []
    for market in MARKETS:
        rows.extend(load_market(token, market) or [])
        time.sleep(0.4)
    unique = {(row["market"], row["symbol"]): row for row in rows}

    with tempfile.NamedTemporaryFile(mode="w", suffix=".tsv", delete=False, newline="") as file:
        path = file.name
        writer = csv.writer(file, delimiter="\t", lineterminator="\n")
        for row in unique.values():
            writer.writerow([
                row.get("symbol", ""), row.get("name", ""), row["market"],
                row.get("securityType", ""), row.get("isinCode", ""),
            ])

    os.environ["PGPASSWORD"] = os.environ["SUPABASE_DB_PASSWORD"]
    sql = f"""
create temporary table incoming_instruments (
  symbol text not null, name text not null, market text not null,
  security_type text, isin_code text
);
\\copy incoming_instruments (symbol, name, market, security_type, isin_code) from '{path}' with (format csv, delimiter E'\\t');
insert into public.instrument_search_index (symbol, name, market, security_type, isin_code, synced_at)
select symbol, name, market, security_type, nullif(isin_code, ''), now()
from incoming_instruments
on conflict (market, symbol) do update set
  name = excluded.name,
  security_type = excluded.security_type,
  isin_code = excluded.isin_code,
  source = 'tossinvest',
  synced_at = now();
delete from public.instrument_search_index i
where i.source = 'tossinvest'
  and not exists (select 1 from incoming_instruments n where n.market = i.market and n.symbol = i.symbol);
select count(*) as indexed_instruments from public.instrument_search_index;
"""
    try:
        result = subprocess.run(psql_args(), input=sql, text=True, capture_output=True, check=True)
        print(result.stdout.strip())
    finally:
        os.unlink(path)


if __name__ == "__main__":
    main()
