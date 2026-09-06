# DiviDash task 006 — daily scheduling review

Date: 2026-09-05
Decision: NO-GO for once-daily unattended scheduling.

## Integration and verification

Integrated the completed task 004 and 005 commits into this review worktree:

- `3bb0d80` — bounded official ETF adapters
- `155690d` — authenticated forecast boundary

Verification completed:

- `python3 -m unittest discover -s scripts -p 'test_*.py' -v`: 7/7 passed
- `CI=true npm test -- --watchAll=false --runInBand`: 45/45 passed, 9 suites
- `npm run build`: passed
- `git diff --check`: passed
- Live issuer endpoints returned HTTP 200: KODEX 1,533 bytes, SOL 985 bytes, RISE 714,723 bytes. URLs match the existing issuer sync boundary.

The adapter and forecast changes add no write path to `dividend_entries`. The forecast service authenticates before querying, does not accept or return a caller-supplied `user_id`, and leaves ownership to Supabase RLS. The RLS migration restricts `dividend_entries` SELECT/INSERT/UPDATE/DELETE to `authenticated` users whose `user_id = auth.uid()`.

## Blocking gaps

1. No retry policy exists. `official_etf_adapters.collect` applies a maximum 20-second request timeout and returns explicit failure/timeout statuses, but it performs only one attempt. The existing database sync scripts likewise use one `curl` attempt.
2. Freshness is not enforced. Adapter records have `fetched_at` but no source freshness validation or stale-data rejection. The forecast boundary selects `expires_at` metadata but does not check it; distribution records are accepted regardless of age.
3. The existing write scripts are not safe scheduler entrypoints. `scripts/sync_etf_distributions.py` and `scripts/sync_sol_distributions.py` directly connect with `SUPABASE_DB_PASSWORD` and write to `etf_distribution_history`; they have no dry-run mode, retry/backoff, stale-response guard, lock/concurrency guard, structured failure exit policy, or rollback procedure. They do not write `dividend_entries`, which is a positive safety property, but that alone is insufficient for unattended execution.
4. Forecast horizon is not enforced. `horizonMonths` is recorded only as an assumption field; future official records outside the requested horizon are still included in `forecast`.
5. The adapter contract is not wired into the persistence scripts. The production sync path still has separate parsers and longer timeout limits (40 seconds / 30 seconds), so the reviewed bounded contract is not the behavior a daily job would execute.

## Scheduling decision

Do not install or bootstrap launchd. Do not deploy the existing sync scripts on a timer. A dry-run launchd prototype was intentionally not added because the current entrypoint is a password-bearing write job without the required freshness, retry, and rollback controls; a plist would make an unsafe path easier to run without fixing those controls.

## Required follow-up before approval

- Create one shared sync entrypoint using the reviewed adapters, with explicit `--dry-run` default and separate opt-in write mode.
- Add bounded retry/backoff, per-source timeout, stale/freshness validation, atomic transaction behavior, structured logs, non-zero failure exits, and a single-instance lock.
- Add tests proving: stale payloads are rejected, retries stop at the configured bound, dry-run performs zero database writes, writes are limited to `etf_product_cache` / `etf_distribution_history`, and `dividend_entries` is never targeted.
- Enforce forecast horizon and document how `expires_at` / `source_updated_at` are interpreted.
- Add a manual-run and rollback runbook; only then prepare an explicit-opt-in launchd plist for user approval.
