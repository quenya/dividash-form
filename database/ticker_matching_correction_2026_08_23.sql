-- One-time correction for portfolio classifications confirmed by the owner,
-- the TOSS instrument cache, and the existing matching evidence.
-- Raw dividend_entries values are preserved; only ticker_matches metadata changes.
begin;

update public.ticker_matches
set matched_ticker = v.matched_ticker,
    matched_company_name = v.matched_company_name,
    market = v.market,
    sector = v.sector,
    industry = v.industry,
    status = 'confirmed',
    confidence = 'high',
    evidence = v.evidence,
    managed_by = 'user',
    updated_at = now()
from (values
  ('133690', '133690', 'TIGER 미국나스닥100', 'KRX', 'ETF', '미국 나스닥100', 'TOSS instrument cache; owner-confirmed ticker/name'),
  ('360750', '360750', 'TIGER 미국S&P500', 'KRX', 'ETF', '미국 대형주', 'TOSS instrument cache; owner-confirmed ticker/name'),
  ('364960', '364960', 'TIGER BBIG', 'KRX', 'ETF', '테마형', 'Owner-confirmed ticker/name and TOSS instrument cache'),
  ('402970', '402970', 'ACE 미국배당다우존스', 'KRX', 'ETF', '미국 배당주', 'Owner-confirmed ACE 미국배당다우존스 mapping'),
  ('498410', '498410', 'KODEX 금융고배당TOP10타겟위클리커버드콜', 'KRX', 'ETF', '커버드콜', 'TOSS instrument cache official name; existing evidence reviewed')
) as v(source_input, matched_ticker, matched_company_name, market, sector, industry, evidence)
where public.ticker_matches.source_input = v.source_input;

commit;
