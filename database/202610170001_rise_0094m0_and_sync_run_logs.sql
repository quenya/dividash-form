-- Verified RISE product metadata for dynamic issuer-schedule collection.
-- Source: llm-wiki/raw/sources.md S010 (official KB RISE product page).
insert into public.etf_product_cache (
  ticker, issuer, product_name, official_url, source_status,
  raw_payload, parser_version, updated_at
) values (
  '0094M0', 'RISE', 'RISE 코리아밸류업위클리고정커버드콜',
  'https://riseetf.co.kr/prod/finderDetail/44J2', 'matched',
  '{"source_id":"S010"}'::jsonb, 'verified-seed-v1', now()
)
on conflict (ticker) do update set
  issuer = excluded.issuer,
  product_name = excluded.product_name,
  official_url = excluded.official_url,
  source_status = excluded.source_status,
  raw_payload = excluded.raw_payload,
  parser_version = excluded.parser_version,
  updated_at = now();

-- Durable operational run history contains only public instrument/source metadata.
create table if not exists public.etf_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text not null check (trigger in ('schedule', 'workflow_dispatch', 'manual')),
  commit_sha text,
  status text not null check (status in ('running', 'success', 'partial_failure', 'failure')),
  candidate_count integer not null default 0 check (candidate_count >= 0),
  success_count integer not null default 0 check (success_count >= 0),
  failure_count integer not null default 0 check (failure_count >= 0),
  unsupported_count integer not null default 0 check (unsupported_count >= 0),
  records_fetched integer not null default 0 check (records_fetched >= 0),
  records_written integer not null default 0 check (records_written >= 0),
  error_summary text
);
create index if not exists etf_sync_runs_started_at_idx on public.etf_sync_runs (started_at desc);

create table if not exists public.etf_sync_run_sources (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.etf_sync_runs(id) on delete cascade,
  ticker text,
  issuer text,
  status text not null check (status in ('success', 'empty', 'failure', 'timeout', 'unsupported', 'manual_review')),
  records_fetched integer not null default 0 check (records_fetched >= 0),
  records_written integer not null default 0 check (records_written >= 0),
  source_url text,
  parser_version text,
  latest_data_date date,
  fetched_at timestamptz,
  attempts integer not null default 1 check (attempts >= 1),
  error_code text,
  error_summary text,
  unique (run_id, ticker)
);
create index if not exists etf_sync_run_sources_run_idx on public.etf_sync_run_sources (run_id);
create index if not exists etf_sync_run_sources_ticker_idx on public.etf_sync_run_sources (ticker, run_id);

alter table public.etf_sync_runs enable row level security;
alter table public.etf_sync_run_sources enable row level security;
revoke all on public.etf_sync_runs, public.etf_sync_run_sources from public, anon, authenticated;

-- Restricted runtime identity. An operator creates a dedicated LOGIN account
-- and grants it membership in this NOLOGIN role; see docs/007-official-etf-sync-runbook.md.
do $$ begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'etf_sync_worker') then
    create role etf_sync_worker nologin noinherit nobypassrls;
  end if;
end $$;
alter role etf_sync_worker nologin noinherit nobypassrls;
grant usage on schema public to etf_sync_worker;

-- SECURITY DEFINER exposes only payment date and instrument identity; no amounts/accounts.
create or replace function public.get_recent_etf_payments_for_sync(p_start date, p_end date)
returns table (ticker text, company_name text, payment_date date)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select d.ticker, d.company_name, d.payment_date
  from public.dividend_entries as d
  where d.payment_date between p_start and p_end
$$;
revoke all on function public.get_recent_etf_payments_for_sync(date, date) from public, anon, authenticated;
grant execute on function public.get_recent_etf_payments_for_sync(date, date) to etf_sync_worker;

grant select (source_input, matched_ticker, status, confidence) on public.ticker_matches to etf_sync_worker;
grant select (symbol, security_type) on public.instrument_search_index to etf_sync_worker;
grant select (ticker, issuer, product_name, official_url, source_status) on public.etf_product_cache to etf_sync_worker;
grant select, insert, update on public.etf_distribution_history to etf_sync_worker;
grant select, insert, update, delete on public.etf_sync_runs to etf_sync_worker;
grant select, insert on public.etf_sync_run_sources to etf_sync_worker;

drop policy if exists "ETF sync worker can write official distributions" on public.etf_distribution_history;
create policy "ETF sync worker can write official distributions"
  on public.etf_distribution_history for all to etf_sync_worker using (true) with check (true);
drop policy if exists "ETF sync worker can manage run history" on public.etf_sync_runs;
create policy "ETF sync worker can manage run history"
  on public.etf_sync_runs for all to etf_sync_worker using (true) with check (true);
drop policy if exists "ETF sync worker can manage source history" on public.etf_sync_run_sources;
create policy "ETF sync worker can manage source history"
  on public.etf_sync_run_sources for all to etf_sync_worker using (true) with check (true);

-- Public app receives only aggregate operational health, never candidate tickers
-- or per-run counts that could reveal private ledger-derived activity.
create or replace view public.etf_sync_status_public
with (security_barrier = true) as
select r.status, r.finished_at,
       exists (
         select 1 from public.etf_sync_run_sources s
         where s.run_id = r.id and s.status in ('unsupported', 'manual_review')
       ) as has_coverage_gaps
from public.etf_sync_runs r
where r.finished_at is not null
order by r.started_at desc
limit 1;
grant select on public.etf_sync_status_public to anon, authenticated;
comment on view public.etf_sync_status_public is
  'Sanitized latest ETF sync health; excludes private ticker candidates and run counts.';
