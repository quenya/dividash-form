CREATE TABLE IF NOT EXISTS public.ticker_matches (
    source_input TEXT PRIMARY KEY,
    matched_ticker TEXT,
    matched_company_name TEXT,
    market TEXT,
    sector TEXT,
    industry TEXT,
    status TEXT NOT NULL DEFAULT 'manual_review'
        CONSTRAINT ticker_matches_status_allowed
        CHECK (status IN ('confirmed', 'manual_review', 'unmatched')),
    confidence TEXT NOT NULL DEFAULT 'low'
        CONSTRAINT ticker_matches_confidence_allowed
        CHECK (confidence IN ('high', 'medium', 'low')),
    evidence TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT confirmed_match_requires_ticker
        CHECK (status <> 'confirmed' OR NULLIF(BTRIM(matched_ticker), '') IS NOT NULL),
    CONSTRAINT confirmed_match_requires_high_confidence
        CHECK (status <> 'confirmed' OR confidence = 'high'),
    CONSTRAINT match_evidence_requires_value
        CHECK (NULLIF(BTRIM(evidence), '') IS NOT NULL),
    CONSTRAINT confirmed_match_requires_details
        CHECK (
            status <> 'confirmed'
            OR NULLIF(BTRIM(matched_company_name), '') IS NOT NULL
            AND NULLIF(BTRIM(market), '') IS NOT NULL
            AND NULLIF(BTRIM(sector), '') IS NOT NULL
            AND NULLIF(BTRIM(industry), '') IS NOT NULL
    )
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ticker_matches'::regclass
          AND conname = 'ticker_matches_status_allowed'
    ) THEN
        ALTER TABLE public.ticker_matches
            ADD CONSTRAINT ticker_matches_status_allowed
            CHECK (status IN ('confirmed', 'manual_review', 'unmatched')) NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ticker_matches'::regclass
          AND conname = 'ticker_matches_confidence_allowed'
    ) THEN
        ALTER TABLE public.ticker_matches
            ADD CONSTRAINT ticker_matches_confidence_allowed
            CHECK (confidence IN ('high', 'medium', 'low')) NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ticker_matches'::regclass
          AND conname = 'confirmed_match_requires_ticker'
    ) THEN
        ALTER TABLE public.ticker_matches
            ADD CONSTRAINT confirmed_match_requires_ticker
            CHECK (status <> 'confirmed' OR NULLIF(BTRIM(matched_ticker), '') IS NOT NULL) NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ticker_matches'::regclass
          AND conname = 'confirmed_match_requires_high_confidence'
    ) THEN
        ALTER TABLE public.ticker_matches
            ADD CONSTRAINT confirmed_match_requires_high_confidence
            CHECK (status <> 'confirmed' OR confidence = 'high') NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ticker_matches'::regclass
          AND conname = 'match_evidence_requires_value'
    ) THEN
        ALTER TABLE public.ticker_matches
            ADD CONSTRAINT match_evidence_requires_value
            CHECK (NULLIF(BTRIM(evidence), '') IS NOT NULL) NOT VALID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ticker_matches'::regclass
          AND conname = 'confirmed_match_requires_details'
    ) THEN
        ALTER TABLE public.ticker_matches
            ADD CONSTRAINT confirmed_match_requires_details
            CHECK (
                status <> 'confirmed'
                OR NULLIF(BTRIM(matched_company_name), '') IS NOT NULL
                AND NULLIF(BTRIM(market), '') IS NOT NULL
                AND NULLIF(BTRIM(sector), '') IS NOT NULL
                AND NULLIF(BTRIM(industry), '') IS NOT NULL
            ) NOT VALID;
    END IF;
END $$;

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tickers;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.tickers;
DROP POLICY IF EXISTS "tickers_insert_authenticated" ON public.tickers;
DROP POLICY IF EXISTS "tickers_update_authenticated" ON public.tickers;

ALTER TABLE public.ticker_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.ticker_matches;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.ticker_matches;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.ticker_matches;

CREATE POLICY "Enable read access for authenticated users" ON public.ticker_matches
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.ticker_matches
    FOR INSERT TO authenticated
    WITH CHECK (auth.role() = 'authenticated' AND status <> 'confirmed');

CREATE POLICY "Enable update for authenticated users" ON public.ticker_matches
    FOR UPDATE TO authenticated
    USING (auth.role() = 'authenticated' AND status <> 'confirmed')
    WITH CHECK (auth.role() = 'authenticated' AND status <> 'confirmed');

CREATE INDEX IF NOT EXISTS idx_ticker_matches_status
    ON public.ticker_matches(status);

CREATE INDEX IF NOT EXISTS idx_ticker_matches_matched_ticker
    ON public.ticker_matches(matched_ticker);

INSERT INTO public.tickers (ticker, company_name_kr, exchange, sector, industry)
VALUES
    ('458730', 'TIGER 미국배당다우존스', 'KRX', 'ETF', '미국 배당주'),
    ('498400', 'KODEX 200타겟위클리커버드콜', 'KRX', 'ETF', '커버드콜'),
    ('102970', 'KODEX 증권', 'KRX', 'ETF', '금융'),
    ('367380', 'ACE 미국나스닥100', 'KRX', 'ETF', '미국 나스닥100'),
    ('379800', 'KODEX 미국S&P500', 'KRX', 'ETF', '미국 대형주'),
    ('379810', 'KODEX 미국나스닥100', 'KRX', 'ETF', '미국 나스닥100'),
    ('446720', 'SOL 미국배당다우존스', 'KRX', 'ETF', '미국 배당주'),
    ('161510', 'PLUS 고배당주', 'KRX', 'ETF', '배당주'),
    ('0167B0', 'SOL 200타겟위클리커버드콜', 'KRX', 'ETF', '커버드콜'),
    ('229200', 'KODEX 코스닥150', 'KRX', 'ETF', '코스닥'),
    ('395160', 'KODEX AI반도체', 'KRX', 'ETF', '반도체'),
    ('455850', 'SOL AI반도체소부장', 'KRX', 'ETF', '반도체'),
    ('BITO', 'ProShares Bitcoin ETF', 'NYSE ARCA', 'ETF', '비트코인 선물'),
    ('QQQM', 'Invesco Nasdaq 100 ETF', 'NASDAQ', 'ETF', '미국 나스닥100'),
    ('SBUX', 'Starbucks Corporation', 'NASDAQ', 'Consumer Cyclical', 'Restaurants'),
    ('AMT', 'American Tower Corporation', 'NYSE', 'Real Estate', 'REIT'),
    ('QCOM', 'QUALCOMM Incorporated', 'NASDAQ', 'Technology', 'Semiconductors'),
    ('MS', 'Morgan Stanley', 'NYSE', 'Financial Services', 'Capital Markets'),
    ('PEP', 'PepsiCo, Inc.', 'NASDAQ', 'Consumer Defensive', 'Beverages'),
    ('MSCI', 'MSCI Inc.', 'NYSE', 'Financial Services', 'Financial Data'),
    ('SPG', 'Simon Property Group, Inc.', 'NYSE', 'Real Estate', 'REIT'),
    ('NKE', 'NIKE, Inc.', 'NYSE', 'Consumer Cyclical', 'Footwear & Apparel'),
    ('XOM', 'Exxon Mobil Corporation', 'NYSE', 'Energy', 'Oil & Gas Integrated'),
    ('EL', 'The Estée Lauder Companies Inc.', 'NYSE', 'Consumer Defensive', 'Household & Personal Products'),
    ('SPHD', 'Invesco S&P 500 High Dividend Low Volatility ETF', 'NYSE ARCA', 'ETF', 'High Dividend Low Volatility')
ON CONFLICT (ticker) DO NOTHING;

INSERT INTO public.ticker_matches (
    source_input,
    matched_ticker,
    matched_company_name,
    market,
    sector,
    industry,
    status,
    confidence,
    evidence
)
VALUES
    ('458730', '458730', 'TIGER 미국배당다우존스', 'KRX', 'ETF', '미국 배당주', 'confirmed', 'high', 'TIGER official product document: https://www.tigeretf.com/upload/etf/20250804095349009577.pdf'),
    ('498400', '498400', 'KODEX 200타겟위클리커버드콜', 'KRX', 'ETF', '커버드콜', 'confirmed', 'high', 'Samsung KODEX official product page: https://www.samsungfund.com/etf/product/view.do?id=2ETFP4&isBanner=Y'),
    ('102970', '102970', 'KODEX 증권', 'KRX', 'ETF', '금융', 'confirmed', 'high', 'Samsung KODEX official product list: https://m.samsungfund.com/upload/kodex/newsroom/20260325170636388.pdf'),
    ('367380', '367380', 'ACE 미국나스닥100', 'KRX', 'ETF', '미국 나스닥100', 'confirmed', 'high', 'ACE official product page: https://www.aceetf.co.kr/fund/K55101DB1182'),
    ('379800', '379800', 'KODEX 미국S&P500', 'KRX', 'ETF', '미국 대형주', 'confirmed', 'high', 'Samsung KODEX official search: https://m.samsungfund.com/etf/search.do?searchText=379800'),
    ('379810', '379810', 'KODEX 미국나스닥100', 'KRX', 'ETF', '미국 나스닥100', 'confirmed', 'high', 'Samsung KODEX official search: https://m.samsungfund.com/etf/search.do?searchText=379810'),
    ('446720', '446720', 'SOL 미국배당다우존스', 'KRX', 'ETF', '미국 배당주', 'confirmed', 'high', 'SOL official product page: https://www.soletf.com/ko/fund/etf/210942'),
    ('161510', '161510', 'PLUS 고배당주', 'KRX', 'ETF', '배당주', 'confirmed', 'high', 'PLUS official search: https://www.plusetf.co.kr/main/search?k=161510'),
    ('229200', '229200', 'KODEX 코스닥150', 'KRX', 'ETF', '코스닥', 'confirmed', 'high', 'Samsung KODEX official product list: https://m.samsungfund.com/upload/kodex/newsroom/20260325170636388.pdf'),
    ('395160', '395160', 'KODEX AI반도체', 'KRX', 'ETF', '반도체', 'confirmed', 'high', 'Samsung KODEX official product list: https://m.samsungfund.com/upload/kodex/newsroom/20260325170636388.pdf'),
    ('455850', '455850', 'SOL AI반도체소부장', 'KRX', 'ETF', '반도체', 'confirmed', 'high', 'SOL official product page: https://www.soletf.com/ko/fund/etf/210980'),
    ('SOL 200타겟위클리커버드콜', '0167B0', 'SOL 200타겟위클리커버드콜', 'KRX', 'ETF', '커버드콜', 'confirmed', 'high', 'SOL official product page identifies code 0167B0: https://www.soletf.co.kr/ko/fund/etf/211107?tabIndex=1'),
    ('BITO', 'BITO', 'ProShares Bitcoin ETF', 'NYSE ARCA', 'ETF', '비트코인 선물', 'confirmed', 'high', 'ProShares official product page: https://www.proshares.com/our-etfs/strategic/bito?source=GLOBAL_RISK_MANAGED'),
    ('QQQM', 'QQQM', 'Invesco Nasdaq 100 ETF', 'NASDAQ', 'ETF', '미국 나스닥100', 'confirmed', 'high', 'Invesco official product information: https://www.invesco.com/us/en/solutions/innovation-suite.html'),
    ('SBUX', 'SBUX', 'Starbucks Corporation', 'NASDAQ', 'Consumer Cyclical', 'Restaurants', 'confirmed', 'high', 'Starbucks investor FAQ identifies Nasdaq symbol SBUX: https://investor.starbucks.com/stock-info-and-resources/frequently-asked-questions-/default.aspx'),
    ('AMT', 'AMT', 'American Tower Corporation', 'NYSE', 'Real Estate', 'REIT', 'confirmed', 'high', 'SEC filing identifies AMT on the New York Stock Exchange: https://www.sec.gov/Archives/edgar/data/1053507/000105350726000041/amt-20260305.htm'),
    ('QCOM', 'QCOM', 'QUALCOMM Incorporated', 'NASDAQ', 'Technology', 'Semiconductors', 'confirmed', 'high', 'Qualcomm investor information identifies NASDAQ QCOM: https://investor.qualcomm.com/overview/default.aspx'),
    ('MS', 'MS', 'Morgan Stanley', 'NYSE', 'Financial Services', 'Capital Markets', 'confirmed', 'high', 'Morgan Stanley investor relations identifies NYSE: MS: https://www.morganstanley.com/about-us-ir'),
    ('PEP', 'PEP', 'PepsiCo, Inc.', 'NASDAQ', 'Consumer Defensive', 'Beverages', 'confirmed', 'high', 'PepsiCo investor release identifies NASDAQ PEP: https://www.pepsico.com/newsroom/press-releases/2026/pepsico-announces-webcast-of-annual-meeting-of-shareholders'),
    ('MSCI', 'MSCI', 'MSCI Inc.', 'NYSE', 'Financial Services', 'Financial Data', 'confirmed', 'high', 'MSCI investor FAQ identifies ticker MSCI and NYSE: https://ir.msci.com/frequently-asked-questions'),
    ('SPG', 'SPG', 'Simon Property Group, Inc.', 'NYSE', 'Real Estate', 'REIT', 'confirmed', 'high', 'Simon investor relations identifies NYSE: SPG: https://investors.simon.com/'),
    ('NKE', 'NKE', 'NIKE, Inc.', 'NYSE', 'Consumer Cyclical', 'Footwear & Apparel', 'confirmed', 'high', 'NIKE investor release identifies NYSE:NKE: https://investors.nike.com/investors/news-events-and-reports/investor-news/investor-news-details/2026/NIKE-Inc--Reports-Fiscal-2026-Fourth-Quarter-and-Full-Year-Results/default.aspx'),
    ('XOM', 'XOM', 'Exxon Mobil Corporation', 'NYSE', 'Energy', 'Oil & Gas Integrated', 'confirmed', 'high', 'ExxonMobil release identifies NYSE:XOM: https://corporate.exxonmobil.com/news/news-releases/2026/0310-redomiciling-the-company-from-new-jersey-to-texas'),
    ('EL', 'EL', 'The Estée Lauder Companies Inc.', 'NYSE', 'Consumer Defensive', 'Household & Personal Products', 'confirmed', 'high', 'Estée Lauder investor FAQ identifies NYSE ticker EL: https://www.elcompanies.com/en/investors/investor-resources/faqs'),
    ('SPHD', 'SPHD', 'Invesco S&P 500 High Dividend Low Volatility ETF', 'NYSE ARCA', 'ETF', 'High Dividend Low Volatility', 'confirmed', 'high', 'Invesco official fund details identify SPHD and NYSE ARCA: https://www.invesco.com/us/en/financial-products/etfs/invesco-sp-500-high-dividend-low-volatility-etf.html'),
    ('486290', NULL, NULL, NULL, NULL, NULL, 'manual_review', 'medium', 'Ticker and entered name conflict: independent lookup identifies 486290 as TIGER 미국나스닥100타겟데일리커버드콜, while SOL official page identifies SOL 미국배당미국채혼합50 as 490490. Review the original statement: https://www.soletf.com/ko/fund/etf/211068?tabIndex=2'),
    ('448880', NULL, NULL, NULL, NULL, NULL, 'manual_review', 'medium', 'Ticker and entered name conflict: 448880 is identified as ACE 24-12 회사채(AA-이상)액티브 in the available product report, not the entered KB RISE name. Review original statement: https://securities.miraeasset.com/bbs/download/2097498.pdf?attachmentId=2097498'),
    ('RISE 삼성전자SK하이닉스채권혼합', NULL, NULL, NULL, NULL, NULL, 'manual_review', 'medium', 'Brand and product-code conflict: available product material identifies KODEX 삼성전자SK하이닉스채권혼합50 as 0177N0. Review original statement: https://www.samsungfund.com/upload/kodex/newsroom/20260630135348177.pdf'),
    ('498410', NULL, NULL, NULL, NULL, NULL, 'manual_review', 'medium', 'Entered name conflicts with the official product name associated with code 498410, KODEX 금융고배당TOP10타겟위클리커버드콜. Review original statement: https://m.samsungfund.com/upload/kodex/newsroom/20260325170636388.pdf'),
    ('133690', NULL, NULL, NULL, NULL, NULL, 'manual_review', 'low', 'Ticker and abbreviated entered name need issuer-page confirmation before classification.'),
    ('402970', NULL, NULL, NULL, NULL, NULL, 'manual_review', 'low', 'Ticker has multiple similar ACE dividend product names in the source data; retain for issuer-page confirmation.'),
    ('360750', NULL, NULL, NULL, NULL, NULL, 'manual_review', 'low', 'Ticker and abbreviated TIGER name need issuer-page confirmation before classification.'),
    ('364960', NULL, NULL, NULL, NULL, NULL, 'manual_review', 'low', 'Ticker and TIGER BBIG name need issuer-page confirmation before classification.'),
    ('SPDR', NULL, NULL, NULL, NULL, NULL, 'manual_review', 'low', 'SPDR is an issuer or brand label rather than a unique security ticker.'),
    ('JP MORGAN', NULL, NULL, NULL, NULL, NULL, 'manual_review', 'low', 'JP MORGAN is an issuer or brand label and does not uniquely identify a security.'),
    ('CREDIT SWISS', NULL, NULL, NULL, NULL, NULL, 'manual_review', 'low', 'CREDIT SWISS is an issuer or legacy brand label and does not uniquely identify a security.'),
    ('ATVI', NULL, NULL, NULL, NULL, NULL, 'manual_review', 'medium', 'ATVI is a historical ticker and the source name is abbreviated; do not link acquired or delisted history without statement-date confirmation.')
ON CONFLICT (source_input) DO NOTHING;
