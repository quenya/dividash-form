-- Add only verified public ETF catalog and alias metadata used by the daily sync.
-- Official provenance: S012 (KODEX 284430), S010 (RISE 0094M0), S009 (TIGER 472150).
-- No dividend_entries rows or user-entered amounts/accounts are changed.

INSERT INTO public.tickers (ticker, company_name_kr, exchange, sector, industry)
VALUES
  ('284430', 'KODEX 200미국채혼합50', 'KRX', 'ETF', '미국채혼합'),
  ('0094M0', 'RISE 코리아밸류업위클리고정커버드콜', 'KRX', 'ETF', '커버드콜'),
  ('472150', 'TIGER 배당커버드콜액티브', 'KRX', 'ETF', '커버드콜')
ON CONFLICT (ticker) DO NOTHING;

INSERT INTO public.etf_product_cache (
  ticker, issuer, product_name, official_url, source_status,
  raw_payload, parser_version, updated_at
)
VALUES (
  '284430', 'KODEX', 'KODEX 200미국채혼합50',
  'https://www.samsungfund.com/etf/product/view.do?id=2ETF99', 'matched',
  '{"source_id":"S012","verified_by":"official_issuer_page_and_notice"}'::jsonb,
  'verified-seed-v1', now()
)
ON CONFLICT (ticker) DO NOTHING;

INSERT INTO public.ticker_matches (
  source_input, matched_ticker, matched_company_name, market,
  sector, industry, status, confidence, evidence, managed_by
)
VALUES
  (
    'KODEX 200미국채혼합50', '284430', 'KODEX 200미국채혼합50', 'KRX',
    'ETF', '미국채혼합', 'confirmed', 'high',
    'Samsung KODEX official product page and name-change notice: https://www.samsungfund.com/etf/product/view.do?id=2ETF99 ; https://www.samsungfund.com/etf/lounge/notice-view.do?no=77233',
    'migration_seed'
  ),
  (
    'RISE 코리아밸류업위클리고정커버드콜', '0094M0', 'RISE 코리아밸류업위클리고정커버드콜', 'KRX',
    'ETF', '커버드콜', 'confirmed', 'high',
    'KBAM RISE official product page: https://riseetf.co.kr/prod/finderDetail/44J2',
    'migration_seed'
  ),
  (
    'TIGER 배당커버드콜액티브', '472150', 'TIGER 배당커버드콜액티브', 'KRX',
    'ETF', '커버드콜', 'confirmed', 'high',
    'Mirae Asset TIGER official product page: https://investments.miraeasset.com/tigeretf/ko/product/search/detail/index.do?ksdFund=KR7472150002',
    'migration_seed'
  )
ON CONFLICT (source_input) DO UPDATE
SET matched_ticker = EXCLUDED.matched_ticker,
    matched_company_name = EXCLUDED.matched_company_name,
    market = EXCLUDED.market,
    sector = EXCLUDED.sector,
    industry = EXCLUDED.industry,
    status = EXCLUDED.status,
    confidence = EXCLUDED.confidence,
    evidence = EXCLUDED.evidence,
    managed_by = EXCLUDED.managed_by,
    updated_at = now()
WHERE public.ticker_matches.managed_by = 'migration_seed';
