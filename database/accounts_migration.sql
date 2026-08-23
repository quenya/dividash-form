-- DiviDash account master migration.
-- Prerequisite: run security_hardening.sql first so dividend_entries.user_id
-- exists and is owned by the authenticated user.
-- This migration never stores an unmasked account number.

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  brokerage_name text NOT NULL,
  account_type text,
  account_number_masked text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_display_name_not_blank CHECK (length(btrim(display_name)) > 0),
  CONSTRAINT accounts_brokerage_name_not_blank CHECK (length(btrim(brokerage_name)) > 0),
  CONSTRAINT accounts_account_number_masked_format CHECK (
    account_number_masked IS NULL OR account_number_masked !~ '[0-9]{4,}'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_user_display_name_lower_idx
  ON public.accounts (user_id, lower(display_name));

CREATE INDEX IF NOT EXISTS accounts_user_active_idx
  ON public.accounts (user_id, is_active, created_at DESC);

ALTER TABLE public.dividend_entries
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS dividend_entries_account_id_idx
  ON public.dividend_entries (account_id);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounts_select_own ON public.accounts;
DROP POLICY IF EXISTS accounts_insert_own ON public.accounts;
DROP POLICY IF EXISTS accounts_update_own ON public.accounts;
DROP POLICY IF EXISTS accounts_delete_own ON public.accounts;

CREATE POLICY accounts_select_own ON public.accounts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY accounts_insert_own ON public.accounts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY accounts_update_own ON public.accounts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY accounts_delete_own ON public.accounts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Safe compatibility backfill. Existing entries remain readable through
-- account_name; only rows with a non-null owner and non-empty account_name are
-- linked to a new account master row.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dividend_entries'
      AND column_name = 'user_id'
  ) THEN
    INSERT INTO public.accounts (user_id, display_name, brokerage_name)
    SELECT DISTINCT
      de.user_id,
      btrim(de.account_name),
      btrim(de.account_name)
    FROM public.dividend_entries de
    WHERE de.user_id IS NOT NULL
      AND de.account_name IS NOT NULL
      AND length(btrim(de.account_name)) > 0
    ON CONFLICT (user_id, lower(display_name)) DO NOTHING;

    UPDATE public.dividend_entries de
    SET account_id = a.id
    FROM public.accounts a
    WHERE de.account_id IS NULL
      AND de.user_id = a.user_id
      AND lower(btrim(de.account_name)) = lower(a.display_name);
  END IF;
END $$;

COMMENT ON TABLE public.accounts IS
  'User-owned account master. Store only masked account numbers.';
COMMENT ON COLUMN public.accounts.account_number_masked IS
  'Masked display value only; never store the full account number in this table.';
