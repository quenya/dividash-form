# Spike 001: recent ticker discovery

## Question

Given user-owned `dividend_entries`, can a deterministic, disposable routine produce unique ETF candidates whose payment dates fall in the recent three-month period, while safely filling missing tickers only from `ticker_matches` rows that are both `confirmed` and `high` confidence?

## Scope and constraints

- This spike does not modify the production DividendForm files.
- `asOfDate` is explicit and required for reproducibility.
- The inclusive period is `[asOfDate - windowMonths calendar months, asOfDate]`.
- `dividend_entries` is the source of dates and candidate presence; `instrument_search_index` is used to verify that a ticker exists and is an ETF.
- Duplicate rows for the same ticker and payment date count once.
- Missing tickers may resolve through `source_input` or `matched_company_name`, but only for `status=confirmed`, `confidence=high`, and a six-character uppercase alphanumeric ticker (including Korean ETF identifiers such as `0162Z0`).
- Unresolved, unindexed, or non-ETF rows are reported in `unsupported` rather than silently included.

## Approach

A dependency-free Node.js module (`discover.mjs`) keeps the experiment runnable with the repository's existing Node installation. `discover()` accepts plain arrays shaped like the three Supabase result sets and returns the period boundaries, sorted candidates, and sorted unsupported rows. The CLI accepts a JSON fixture and prints observable JSON output.

The key alternative was to derive the window from the latest payment date in the entries. That approach was rejected: it can move the reporting period forward or backward when old data is loaded, and it does not honor the requested as-of date. Calendar-month subtraction with end-of-month clamping was selected so 2026-08-31 minus three months becomes 2026-05-31, while 2026-03-31 minus one month becomes 2026-02-28.

## Run

```sh
node --test spikes/001-recent-ticker-discovery/discover.test.mjs
node spikes/001-recent-ticker-discovery/discover.mjs spikes/001-recent-ticker-discovery/fixture.json
```

The fixture demonstrates one direct ETF, one high-confidence ticker recovery, one non-ETF, one missing instrument, one out-of-window row, and a duplicate.

## Results

- Explicit as-of date and inclusive three-month boundaries work.
- Same ticker/payment-date duplicates are removed.
- Confirmed/high matching recovers the missing ticker; medium-confidence matching does not.
- Six-character alphanumeric tickers are accepted, including `0162Z0`.
- Instrument presence and ETF type are both required.
- Invalid dates and unsupported rows are excluded and surfaced as diagnostics.

## Verdict: VALIDATED

### What worked

- The core discovery question is answered with a standalone function, CLI, fixture, and three edge-focused tests.
- The production files named in the task were not changed.

### What didn't

- This spike does not call Supabase or verify production row-level security/network behavior.
- It does not validate issuer metadata or official source URLs; those belong to the subsequent collection step.

### Surprises

- Existing utility logic in the repository used the latest entry date as its reference, which is unsuitable for reproducible as-of reporting.
- Korean ETF security types require checking `상장지수` in addition to the literal `ETF` label.

### Recommendation for the real build

Keep the pure discovery logic separate from the Supabase hook. Fetch user entries, matches, and index rows, pass a stable as-of date into the pure function, and display both candidates and unsupported diagnostics. Add a production adapter only after deciding how the UI should expose the as-of date and diagnostics.
