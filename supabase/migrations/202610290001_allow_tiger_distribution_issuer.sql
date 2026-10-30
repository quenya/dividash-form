-- Permit verified TIGER issuer rows in the public ETF distribution history.
-- Replaces only the issuer allowlist; no history rows are rewritten.
ALTER TABLE public.etf_distribution_history
  DROP CONSTRAINT IF EXISTS etf_distribution_history_source_issuer_check;

ALTER TABLE public.etf_distribution_history
  ADD CONSTRAINT etf_distribution_history_source_issuer_check
  CHECK (source_issuer IN ('KODEX', 'SOL', 'RISE', 'TIGER', 'OTHER'));
