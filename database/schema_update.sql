-- Option B: Create tickers table for normalization

CREATE TABLE IF NOT EXISTS public.tickers (
    ticker TEXT PRIMARY KEY,
    sector TEXT,
    industry TEXT,
    exchange TEXT,
    company_name_kr TEXT -- Optional: Korean name for display
);

-- Enable RLS (Optional, depending on policy)
ALTER TABLE public.tickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.tickers
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.tickers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.tickers
    FOR UPDATE USING (true);

-- Seed Data (Sample)
INSERT INTO tickers (ticker, sector, industry) VALUES 
('AAPL', 'Technology', 'Consumer Electronics'),
('MSFT', 'Technology', 'Software - Infrastructure'),
('O', 'Real Estate', 'REIT - Retail'),
('SCHD', 'ETF', 'Multi-Sector'),
('JEPI', 'ETF', 'Multi-Sector'),
('JEPQ', 'ETF', 'Multi-Sector'),
('QQQ', 'ETF', 'Technology'),
('SPY', 'ETF', 'Market Index'),
('TSLA', 'Consumer Cyclical', 'Auto Manufacturers'),
('KO', 'Consumer Defensive', 'Beverages'),
('MCD', 'Consumer Cyclical', 'Restaurants'),
('JNJ', 'Healthcare', 'Drug Manufacturers'),
('V', 'Financial Services', 'Credit Services'),
('JPM', 'Financial Services', 'Banks - Diversified'),
('MAIN', 'Financial Services', 'Asset Management'),
('NVDA', 'Technology', 'Semiconductors'),
('T', 'Communication Services', 'Telecom Services'),
('VZ', 'Communication Services', 'Telecom Services'),
('TLT', 'ETF', 'Bond'),
('VNQ', 'ETF', 'Real Estate')
ON CONFLICT (ticker) DO UPDATE SET 
    sector = EXCLUDED.sector,
    industry = EXCLUDED.industry;

-- Goal Persistence Table
CREATE TABLE IF NOT EXISTS public.user_goals (
    key TEXT PRIMARY KEY,
    value NUMERIC DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- Policies for user_goals
CREATE POLICY "Enable read access for all" ON public.user_goals
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all" ON public.user_goals
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all" ON public.user_goals
    FOR UPDATE USING (true);
    
-- Seed initial goal if not exists
INSERT INTO public.user_goals (key, value) 
VALUES ('monthly_dividend_goal', 1000000)
ON CONFLICT (key) DO NOTHING;

-- Simulation Settings Persistence
CREATE TABLE IF NOT EXISTS public.simulation_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    monthly_addition NUMERIC DEFAULT 1000000,
    expected_yield NUMERIC DEFAULT 4.0,
    dividend_growth NUMERIC DEFAULT 5.0,
    reinvest BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT one_row_only CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE public.simulation_settings ENABLE ROW LEVEL SECURITY;

-- Policies for simulation_settings
CREATE POLICY "Enable read for all" ON public.simulation_settings
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all" ON public.simulation_settings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all" ON public.simulation_settings
    FOR UPDATE USING (true);

-- Seed initial settings if not exists
INSERT INTO public.simulation_settings (id, monthly_addition, expected_yield, dividend_growth, reinvest)
VALUES (1, 1000000, 4.0, 5.0, TRUE)
ON CONFLICT (id) DO NOTHING;
