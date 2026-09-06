-- Verified official catalog seed for TIGER 배당커버드콜액티브 (472150).
-- Safe to rerun: only the public reference cache is inserted/updated.
-- dividend_entries and other user-owned data are never written.
BEGIN;

ALTER TABLE public.etf_product_cache
  DROP CONSTRAINT IF EXISTS etf_product_cache_issuer_check;
ALTER TABLE public.etf_product_cache
  ADD CONSTRAINT etf_product_cache_issuer_check
  CHECK (issuer IN ('KODEX', 'SOL', 'RISE', 'TIGER', 'OTHER'));

INSERT INTO public.etf_product_cache (
  ticker, issuer, product_name, official_url, isin, underlying_index,
  distribution_frequency, source_status, raw_payload, parser_version, updated_at
)
VALUES (
  '472150',
  'TIGER',
  'TIGER 배당커버드콜액티브',
  'https://investments.miraeasset.com/tigeretf/ko/product/search/detail/index.do?ksdFund=KR7472150002',
  'KR7472150002',
  '코스피 200 커버드콜 5% OTM 지수',
  'monthly',
  'matched',
  jsonb_build_object('source', 'Mirae Asset TIGER official product page', 'verified_name', 'TIGER 배당커버드콜액티브', 'verified_ticker', '472150'),
  'manual-seed-1',
  NOW()
)
ON CONFLICT (ticker) DO UPDATE SET
  issuer = EXCLUDED.issuer,
  product_name = EXCLUDED.product_name,
  official_url = EXCLUDED.official_url,
  isin = EXCLUDED.isin,
  underlying_index = EXCLUDED.underlying_index,
  distribution_frequency = EXCLUDED.distribution_frequency,
  source_status = EXCLUDED.source_status,
  raw_payload = EXCLUDED.raw_payload,
  parser_version = EXCLUDED.parser_version,
  updated_at = NOW();

COMMIT;