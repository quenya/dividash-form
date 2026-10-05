# Spike 002: official per-share amount estimate

## Question

Given recent user-owned `dividend_entries` and issuer-sourced per-share distributions, can the next scheduled deposit be estimated by reversing the latest holding count (`actual deposit / prior official per-share`) and multiplying by the next official per-share amount?

## Approach

`infer.mjs` is a dependency-free, standalone Node module. It resolves missing tickers only through confirmed/high-confidence matches, selects the latest actual deposit in an explicit inclusive calendar window, finds the latest official distribution on or before that deposit and the next official distribution after it, and returns a prediction without mutating any input row.

Formula:

`inferred units = latest actual deposit / prior official distribution per share`
`estimated deposit = inferred units × next official distribution per share`

Official dates prefer `payment_date` and fall back to `ex_date`. Each result carries source URLs, dates, currencies, assumptions, and machine-readable calculation failure reasons.

## Explicit limitations

- Taxes, withholding, fees, and commissions make the deposit unsuitable as a gross-unit proxy. If a positive amount is present in any supported tax/fee field, the result is `cannot_calculate` rather than silently pretending it is gross.
- When those fields are absent (the current `dividend_entries` schema has no tax/fee columns), the result is `estimated_with_assumptions`; it assumes the stored amount is comparable to the official gross per-share amount.
- Currency mismatches, zero/negative prior distributions, missing prior/next official records, invalid values, and conflicting duplicate actual amounts are surfaced as reasons.
- A distribution change is not smoothed: the next official amount is used as published.
- Official data is reference input only; user entries are never edited.

## Run

```sh
node --test spikes/002-official-amount-estimate/infer.test.mjs
node spikes/002-official-amount-estimate/infer.mjs spikes/002-official-amount-estimate/fixture.json
```

The fixture produces one estimate (069500: 100 inferred units, 12,000 KRW estimated), and observable non-calculable cases for tax/withholding, currency mismatch, and a zero prior distribution. The historical cases also exercise MAE/MAPE reporting.

## Observed verification

- 6/6 tests pass.
- Fixture CLI output reports `evaluatedCount: 1`, `cannotCalculateCount: 2`, `mae: 200`, and `mape: 1.694915254237288` for the valid historical case; zero prior and currency mismatch are retained as failure reasons.
- Production `src/components/DividendForm.jsx` and its tests were not modified.

## Verdict: PARTIAL

### What worked

- Deterministic inference works when prior/next issuer data, amount, and currency are compatible.
- Per-share distribution changes, duplicate handling, date boundary behavior, provenance URLs, and MAE/MAPE are observable in a runnable CLI and tests.

### What didn't

- No production Supabase fetch or authenticated user session was used; this is intentionally a pure spike.
- Without explicit tax/fee provenance in `dividend_entries`, a successful result remains assumption-labeled and should not be presented as an exact forecast.

### Surprises

- The latest issuer record before an actual payment is often close to the payment date; selecting the next record strictly after the actual payment avoids accidentally reusing the already-paid distribution.
- A zero prior per-share distribution makes reverse inference mathematically undefined and must be reported, not coerced to zero.

### Recommendation for the real build

Keep this pure calculation separate from the Supabase hook. Add explicit amount basis (`gross`/`net`) and tax/fee fields or require user confirmation before showing a forecast. Display `cannot_calculate` reasons and official source links alongside any estimate; never overwrite `dividend_entries`.
