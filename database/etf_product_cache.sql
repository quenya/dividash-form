-- Public ETF product metadata cache.
-- No user/account/dividend amount data belongs in this table.
create table if not exists public.etf_product_cache (
  ticker text primary key,
  issuer text not null check (issuer in ('KODEX', 'SOL', 'RISE', 'OTHER')),
  product_name text not null,
  official_url text not null,
  isin text,
  underlying_index text,
  total_fee numeric,
  net_assets numeric,
  listing_date date,
  distribution_frequency text,
  last_distribution_date date,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  source_status text not null default 'matched'
    check (source_status in ('matched', 'manual_review', 'unmatched', 'stale')),
  raw_payload jsonb not null default '{}'::jsonb,
  parser_version text not null default '1',
  updated_at timestamptz not null default now()
);

create index if not exists etf_product_cache_issuer_idx
  on public.etf_product_cache (issuer);
create index if not exists etf_product_cache_expires_idx
  on public.etf_product_cache (expires_at);
create index if not exists etf_product_cache_name_idx
  on public.etf_product_cache (product_name);

alter table public.etf_product_cache enable row level security;
drop policy if exists "public can read ETF product cache" on public.etf_product_cache;
create policy "public can read ETF product cache"
  on public.etf_product_cache for select using (true);

-- Only a trusted server-side sync job should write this table.
drop policy if exists "authenticated cannot write ETF product cache" on public.etf_product_cache;
