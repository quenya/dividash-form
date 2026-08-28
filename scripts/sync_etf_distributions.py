#!/usr/bin/env python3
"""Sync issuer-sourced ETF distribution history into Supabase Postgres."""
import json, os, re, subprocess
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from urllib.parse import urlparse
import psycopg2

TARGETS = {
  'KODEX': {'102970': {'id': '2ETF15', 'url': 'https://www.samsungfund.com/etf/product/view.do?id=2ETF15'}, '498400': {'id': '2ETFP4', 'url': 'https://www.samsungfund.com/etf/product/view.do?id=2ETFP4'}, '498410': {'id': '2ETFP1', 'url': 'https://www.samsungfund.com/etf/product/view.do?id=2ETFP1'}},
  'SOL': {'0167B0': {'fund': '211107', 'url': 'https://www.soletf.com/ko/fund/etf/211107?tabIndex=1'}, '490490': {'fund': '211068', 'url': 'https://www.soletf.com/ko/fund/etf/211068?tabIndex=2'}},
  'RISE': {'0162Z0': {'url': 'https://www.riseetf.co.kr/prod/finderDetail/44K1'}},
}

def env():
  for p in (Path('.env'), Path('.env.local')):
    if p.exists():
      for line in p.read_text().splitlines():
        if line and not line.startswith('#') and '=' in line:
          k,v=line.split('=',1); os.environ.setdefault(k.strip(), v.strip().strip('"\''))

def get(url): return subprocess.check_output(['curl','-fsSL','--max-time','40',url], text=True)
def d(v): return datetime.strptime(str(v).replace('-',''), '%Y%m%d').date()
def rows_kodex(ticker, meta):
  data=json.loads(get(f"https://www.samsungfund.com/api/v1/kodex/divid-info.do?id={meta['id']}"))
  for x in data.get('dividList',[]):
    yield d(x['basicD']), d(x['payD']), float(x['dividA']), None, float(x['dividY']) if x.get('dividY') else None, x

def rows_sol(ticker, meta):
  data=json.loads(get(f"https://www.soletf.com/api/etf/pds/dividend/{meta['fund']}"))
  for x in data.get('items',[]):
    price=float(x['BFAS_STAS_STPR']) if x.get('BFAS_STAS_STPR') is not None else None
    amount=float(x['DIVIDEND_PRI'])
    yield_rate=amount/price*100 if price and price > 0 else None
    yield d(x['WORK_DT']), d(x['DIVIDEND_DT']), amount, price, yield_rate, x

def rows_rise(ticker, meta):
  s=unescape(get(meta['url']))
  block=s[s.find('분배금 지급현황'):]
  for a,b,c,e in re.findall(r'<tr>\s*<td>(\d{4}-\d{2}-\d{2})</td>\s*<td>(\d{4}-\d{2}-\d{2})</td>\s*<td>\s*([^<]+?)\s*</td>\s*<td>\s*([^<]+?)\s*</td>', block):
    amount=float(c.replace(',','').strip())
    yield d(a), d(b), amount, None, None, {'basicD':a,'payD':b,'dividA':amount,'taxDividA':e.strip()}

def main():
  env(); project=urlparse(os.environ['REACT_APP_SUPABASE_URL']).hostname.split('.')[0]
  user=os.getenv('SUPABASE_DB_USER','postgres'); user=user if user.endswith(project) else f'{user}.{project}'
  conn=psycopg2.connect(host=os.environ['SUPABASE_DB_HOST'],port=os.getenv('SUPABASE_DB_PORT','5432'),dbname=os.environ['SUPABASE_DB_NAME'],user=user,password=os.environ['SUPABASE_DB_PASSWORD'],sslmode='require')
  total=0; by={}
  try:
    with conn:
      with conn.cursor() as cur:
        for issuer, products in TARGETS.items():
          for ticker, meta in products.items():
            parser = rows_kodex if issuer == 'KODEX' else rows_sol if issuer == 'SOL' else rows_rise
            count=0
            for ex_date,payment_date,per_share,price,rate,payload in parser(ticker,meta):
              cur.execute("""insert into public.etf_distribution_history (ticker,ex_date,payment_date,distribution_per_share,reference_price,distribution_rate,currency,source_issuer,source_url,source_updated_at,fetched_at,parser_version,raw_payload) values (%s,%s,%s,%s,%s,%s,'KRW',%s,%s,%s,now(),%s,%s) on conflict (ticker,ex_date,source_issuer) do update set payment_date=excluded.payment_date,distribution_per_share=excluded.distribution_per_share,reference_price=excluded.reference_price,distribution_rate=excluded.distribution_rate,source_url=excluded.source_url,source_updated_at=excluded.source_updated_at,fetched_at=now(),parser_version=excluded.parser_version,raw_payload=excluded.raw_payload""", (ticker,ex_date,payment_date,per_share,price,rate,issuer,meta['url'],datetime.now(timezone.utc),issuer.lower()+'-v1',json.dumps(payload,ensure_ascii=False)))
              count += 1; total += 1
            by[ticker]=count
  finally: conn.close()
  print(json.dumps({'total_upserted':total,'by_ticker':by},ensure_ascii=False))
if __name__ == '__main__': main()
