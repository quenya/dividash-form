#!/usr/bin/env python3
"""Sync SOL ETF issuer distribution history into Supabase Postgres."""
import json, os, ssl, subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
import psycopg2

SOL_FUNDS = {
    '0167B0': ('211107', 'https://www.soletf.com/ko/fund/etf/211107?tabIndex=1'),
    '490490': ('211068', 'https://www.soletf.com/ko/fund/etf/211068?tabIndex=2'),
}

def load_env():
    for path in (Path('.env'), Path('.env.local')):
        if path.exists():
            for line in path.read_text().splitlines():
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ.setdefault(key.strip(), value.strip().strip('"\''))

def fetch_json(url):
    # Official endpoint is public JSON; curl is used because this host's Python CA bundle is incomplete.
    raw = subprocess.check_output(['curl', '-fsSL', '--max-time', '30', url], text=True)
    return json.loads(raw)

def parse_date(value):
    return datetime.strptime(str(value), '%Y%m%d').date()

def main():
    load_env()
    project = urlparse(os.environ['REACT_APP_SUPABASE_URL']).hostname.split('.')[0]
    user = os.getenv('SUPABASE_DB_USER', 'postgres')
    if not user.endswith(project): user = f'{user}.{project}'
    conn = psycopg2.connect(host=os.environ['SUPABASE_DB_HOST'], port=os.getenv('SUPABASE_DB_PORT', '5432'), dbname=os.environ['SUPABASE_DB_NAME'], user=user, password=os.environ['SUPABASE_DB_PASSWORD'], sslmode='require')
    inserted = 0
    try:
        with conn:
            with conn.cursor() as cur:
                for ticker, (fund_code, source_url) in SOL_FUNDS.items():
                    payload = fetch_json(f'https://www.soletf.com/api/etf/pds/dividend/{fund_code}')
                    if not isinstance(payload.get('items'), list): raise RuntimeError(f'SOL response has no items: {ticker}')
                    for item in payload['items']:
                        ex_date = parse_date(item['WORK_DT'])
                        payment_date = parse_date(item['DIVIDEND_DT'])
                        per_share = float(item['DIVIDEND_PRI'])
                        reference_price = float(item['BFAS_STAS_STPR']) if item.get('BFAS_STAS_STPR') is not None else None
                        rate = (per_share / reference_price * 100) if reference_price and reference_price > 0 else None
                        cur.execute("""
                          insert into public.etf_distribution_history
                            (ticker, ex_date, payment_date, distribution_per_share, reference_price,
                             distribution_rate, currency, source_issuer, source_url, source_updated_at,
                             fetched_at, parser_version, raw_payload)
                          values (%s,%s,%s,%s,%s,%s,'KRW','SOL',%s,%s,now(),'sol-v1',%s)
                          on conflict (ticker, ex_date, source_issuer) do update set
                            payment_date=excluded.payment_date,
                            distribution_per_share=excluded.distribution_per_share,
                            reference_price=excluded.reference_price,
                            distribution_rate=excluded.distribution_rate,
                            source_url=excluded.source_url,
                            source_updated_at=excluded.source_updated_at,
                            fetched_at=now(), parser_version=excluded.parser_version,
                            raw_payload=excluded.raw_payload
                        """, (ticker, ex_date, payment_date, per_share, reference_price, rate, source_url, datetime.now(timezone.utc), json.dumps(item, ensure_ascii=False)))
                        inserted += 1
    finally:
        conn.close()
    print(json.dumps({'issuer': 'SOL', 'funds': len(SOL_FUNDS), 'upserted': inserted}, ensure_ascii=False))

if __name__ == '__main__': main()
