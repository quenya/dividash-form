-- Historical issuer-sourced ETF distribution index.
-- This table is public reference data; user dividend_entries remains the SSOT for chart amounts.
create table if not exists public.etf_distribution_history (
  ticker text not null,
  ex_date date not null,
  payment_date date,
  distribution_per_share numeric,
  reference_price numeric,
  distribution_rate numeric,
  currency text not null default 'KRW',
  source_issuer text not null check (source_issuer in ('KODEX', 'SOL', 'RISE', 'OTHER')),
  source_url text not null,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  parser_version text not null default '1',
  raw_payload jsonb not null default '{}'::jsonb,
  primary key (ticker, ex_date, source_issuer)
);

create index if not exists etf_distribution_history_payment_idx
  on public.etf_distribution_history (ticker, payment_date);
create index if not exists etf_distribution_history_issuer_idx
  on public.etf_distribution_history (source_issuer);

alter table public.etf_distribution_history enable row level security;
drop policy if exists "public can read ETF distribution history" on public.etf_distribution_history;
create policy "public can read ETF distribution history"
  on public.etf_distribution_history for select using (true);

-- Writes are reserved for the trusted issuer sync job.
