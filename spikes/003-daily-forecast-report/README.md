# Spike 003: daily official disclosure collection and forecast report

## Question

Given every ticker with a `dividend_entries` payment in the recent three-month window, can a daily, manually launched prototype classify official disclosure collection as collected, failed, or unsupported, then produce a forecast report separate from the user's actual dividend history?

## Approach

`collect.mjs` composes the validated Spike 001 calendar-window ticker discovery and Spike 002 per-share estimate. It uses explicit adapter labels (`KODEX`, `SOL`, `RISE`) on instruments and an injectable `officialSources` payload, preserving each source URL, disclosure count, failure reason, and adapter status. It does not schedule itself and never mutates `entries`.

The CLI writes two artifacts:

```sh
node --test spikes/003-daily-forecast-report/collect.test.mjs
node spikes/003-daily-forecast-report/collect.mjs spikes/003-daily-forecast-report/fixture.json spikes/003-daily-forecast-report/out
```

The output directory contains `report.json` for machine consumption and a mobile-friendly `report.html` with separate official-collection and forecast tables. Forecast rows include ticker, official source URL, payment date, per-share dates/amounts, estimated amount, assumptions, and calculation failure reasons.

## Status model

- `collected`: supported adapter returned a non-empty disclosure list with a source URL.
- `failed`: supported adapter had a missing URL, empty disclosures, or an explicit fetch failure; the reason is retained.
- `unsupported`: adapter is not one of KODEX/SOL/RISE, or discovery could not validate the ticker.
- Forecasts remain `estimated_with_assumptions` or `cannot_calculate` as defined by Spike 002, independently of collection status.

## Observed verification

- 3/3 tests pass.
- Fixture CLI execution returned `collectionCount: 4` and `forecastCount: 4`.
- Generated JSON and HTML artifacts were written under `out-v2/` during verification.
- Fixture results included two collected adapters, one RISE `source_timeout`, and one unsupported adapter. KODEX estimated amount was 12,000 KRW from 100 inferred units × 120 KRW next per-share amount.
- Existing `src/components/DividendForm.jsx` and `src/components/DividendForm.test.jsx` were not modified by this spike.

## Verdict: PARTIAL

### What worked

- The daily loop's core handoff is observable: recent ticker discovery → adapter classification → official source provenance/status → separate forecast report.
- Supported, failed, and unsupported states are deterministic and testable; failure is never silently converted into a guessed URL or amount.
- Actual user entries remain input-only; the report explicitly marks forecast storage as separate.

### What didn't

- This spike does not perform live KODEX, SOL, or RISE HTTP parsing. `officialSources` is an adapter boundary/fixture contract, so production HTML/API schema drift is untested.
- No Supabase authentication, persistence, retry queue, rate limiting, or source freshness policy is included.
- The fixture uses `example.test` URLs and synthetic disclosures; they demonstrate provenance handling, not official-data correctness.

### Surprises

- Collection success does not guarantee a calculable forecast: SOL has a collected source but no prior official record in the fixture, and is correctly marked `cannot_calculate`.
- An adapter failure can still retain a known official URL while forecast calculation remains blocked; this is useful for actionable retry reporting.

### Recommendation before launchd

Keep this as a manual CLI until each adapter has a live fixture captured from its official source and parser contract tests. Add bounded retries, timeout/error taxonomy, source freshness checks, and persisted run history before scheduling once per day. Require explicit gross/net and tax/fee basis before treating any estimate as more than assumption-labeled; never mix official scheduled amounts into the user-entered dividend history or overwrite it.
