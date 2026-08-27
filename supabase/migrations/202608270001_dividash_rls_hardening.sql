-- DiviDash RLS hardening.
--
-- Scope:
--   * Remove legacy broad policies from user_goals.
--   * Keep personal tables restricted to the authenticated owner.
--   * Keep public ticker metadata readable, but never writable by anon.
--   * Keep the public instrument search index read-only by design.
--
-- This migration is intentionally idempotent and does not alter user data.

-- Personal dividend data must never be visible or writable through anon.
ALTER TABLE public.dividend_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.dividend_entries;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.dividend_entries;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.dividend_entries;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.dividend_entries;

DROP POLICY IF EXISTS "dividend_entries_select_own" ON public.dividend_entries;
DROP POLICY IF EXISTS "dividend_entries_insert_own" ON public.dividend_entries;
DROP POLICY IF EXISTS "dividend_entries_update_own" ON public.dividend_entries;
DROP POLICY IF EXISTS "dividend_entries_delete_own" ON public.dividend_entries;

CREATE POLICY "dividend_entries_select_own" ON public.dividend_entries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "dividend_entries_insert_own" ON public.dividend_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "dividend_entries_update_own" ON public.dividend_entries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "dividend_entries_delete_own" ON public.dividend_entries
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- User goals are private. Remove legacy policies whose USING/WITH CHECK was true.
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.user_goals;
DROP POLICY IF EXISTS "Enable upsert for all" ON public.user_goals;
DROP POLICY IF EXISTS "Enable insert for all" ON public.user_goals;
DROP POLICY IF EXISTS "Enable update for all users" ON public.user_goals;
DROP POLICY IF EXISTS "user_goals_select_own" ON public.user_goals;
DROP POLICY IF EXISTS "user_goals_insert_own" ON public.user_goals;
DROP POLICY IF EXISTS "user_goals_update_own" ON public.user_goals;

CREATE POLICY "user_goals_select_own" ON public.user_goals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "user_goals_insert_own" ON public.user_goals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_goals_update_own" ON public.user_goals
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Simulation settings are private and owner-scoped.
ALTER TABLE public.simulation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.simulation_settings;
DROP POLICY IF EXISTS "Enable insert for all" ON public.simulation_settings;
DROP POLICY IF EXISTS "Enable update for all users" ON public.simulation_settings;
DROP POLICY IF EXISTS "simulation_settings_select_own" ON public.simulation_settings;
DROP POLICY IF EXISTS "simulation_settings_insert_own" ON public.simulation_settings;
DROP POLICY IF EXISTS "simulation_settings_update_own" ON public.simulation_settings;

CREATE POLICY "simulation_settings_select_own" ON public.simulation_settings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "simulation_settings_insert_own" ON public.simulation_settings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "simulation_settings_update_own" ON public.simulation_settings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Shared ticker matching metadata: public read is intentional, writes require login.
ALTER TABLE public.ticker_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ticker_matches;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.ticker_matches;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.ticker_matches;
DROP POLICY IF EXISTS "ticker_matches_read" ON public.ticker_matches;
DROP POLICY IF EXISTS "ticker_matches_insert_user" ON public.ticker_matches;
DROP POLICY IF EXISTS "ticker_matches_update_user" ON public.ticker_matches;

CREATE POLICY "ticker_matches_read" ON public.ticker_matches
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "ticker_matches_insert_user" ON public.ticker_matches
  FOR INSERT TO authenticated
  WITH CHECK (managed_by = 'user');
CREATE POLICY "ticker_matches_update_user" ON public.ticker_matches
  FOR UPDATE TO authenticated
  USING (managed_by = 'user')
  WITH CHECK (managed_by = 'user');

-- Public catalog: readable, never writable by browser clients.
ALTER TABLE public.tickers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tickers;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.tickers;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.tickers;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.tickers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.tickers;
DROP POLICY IF EXISTS "tickers_select_authenticated" ON public.tickers;

CREATE POLICY "tickers_select_authenticated" ON public.tickers
  FOR SELECT TO authenticated
  USING (true);

-- The instrument_search_index policy is intentionally public read-only.
ALTER TABLE public.instrument_search_index ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.instrument_search_index;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.instrument_search_index;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.instrument_search_index;
DROP POLICY IF EXISTS "public can read instrument search index" ON public.instrument_search_index;
CREATE POLICY "public can read instrument search index"
  ON public.instrument_search_index FOR SELECT TO anon, authenticated USING (true);
