-- Security hardening migration for DiviDash.
--
-- Before running:
-- 1. Create or identify the Supabase Auth user that should own existing rows.
-- 2. Replace the UUID below with that user's auth.users.id.
--
-- This script intentionally fails until APP_OWNER_ID is replaced.

DO $$
DECLARE
  app_owner_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  IF app_owner_id = '00000000-0000-0000-0000-000000000000' THEN
    RAISE EXCEPTION 'Replace app_owner_id with the owning auth.users.id before running security_hardening.sql';
  END IF;

  ALTER TABLE public.dividend_entries
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

  UPDATE public.dividend_entries
  SET user_id = app_owner_id
  WHERE user_id IS NULL;

  ALTER TABLE public.dividend_entries
    ALTER COLUMN user_id SET NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_dividend_entries_user_id
    ON public.dividend_entries(user_id);

  ALTER TABLE public.user_goals
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

  UPDATE public.user_goals
  SET user_id = app_owner_id
  WHERE user_id IS NULL;

  ALTER TABLE public.user_goals
    ALTER COLUMN user_id SET NOT NULL;

  ALTER TABLE public.user_goals
    DROP CONSTRAINT IF EXISTS user_goals_pkey;

  ALTER TABLE public.user_goals
    ADD CONSTRAINT user_goals_pkey PRIMARY KEY (user_id, key);

  ALTER TABLE public.simulation_settings
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

  UPDATE public.simulation_settings
  SET user_id = app_owner_id
  WHERE user_id IS NULL;

  ALTER TABLE public.simulation_settings
    ALTER COLUMN user_id SET NOT NULL;

  ALTER TABLE public.simulation_settings
    DROP CONSTRAINT IF EXISTS simulation_settings_pkey;

  ALTER TABLE public.simulation_settings
    ADD CONSTRAINT simulation_settings_pkey PRIMARY KEY (user_id, id);
END $$;

ALTER TABLE public.dividend_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.tickers;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.tickers;
DROP POLICY IF EXISTS "Enable update for all users" ON public.tickers;
DROP POLICY IF EXISTS "Enable read access for all" ON public.user_goals;
DROP POLICY IF EXISTS "Enable insert for all" ON public.user_goals;
DROP POLICY IF EXISTS "Enable update for all" ON public.user_goals;
DROP POLICY IF EXISTS "Enable read for all" ON public.simulation_settings;
DROP POLICY IF EXISTS "Enable insert for all" ON public.simulation_settings;
DROP POLICY IF EXISTS "Enable update for all" ON public.simulation_settings;
DROP POLICY IF EXISTS "dividend_entries_select_own" ON public.dividend_entries;
DROP POLICY IF EXISTS "dividend_entries_insert_own" ON public.dividend_entries;
DROP POLICY IF EXISTS "dividend_entries_update_own" ON public.dividend_entries;
DROP POLICY IF EXISTS "dividend_entries_delete_own" ON public.dividend_entries;
DROP POLICY IF EXISTS "tickers_select_authenticated" ON public.tickers;
DROP POLICY IF EXISTS "tickers_insert_authenticated" ON public.tickers;
DROP POLICY IF EXISTS "tickers_update_authenticated" ON public.tickers;
DROP POLICY IF EXISTS "user_goals_select_own" ON public.user_goals;
DROP POLICY IF EXISTS "user_goals_insert_own" ON public.user_goals;
DROP POLICY IF EXISTS "user_goals_update_own" ON public.user_goals;
DROP POLICY IF EXISTS "simulation_settings_select_own" ON public.simulation_settings;
DROP POLICY IF EXISTS "simulation_settings_insert_own" ON public.simulation_settings;
DROP POLICY IF EXISTS "simulation_settings_update_own" ON public.simulation_settings;

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

CREATE POLICY "tickers_select_authenticated" ON public.tickers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "tickers_insert_authenticated" ON public.tickers
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "tickers_update_authenticated" ON public.tickers
  FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

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
