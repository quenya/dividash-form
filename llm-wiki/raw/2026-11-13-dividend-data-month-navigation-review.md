# Monthly Dividend Data Navigation Review Remediation

- Captured: 2026-11-13
- Source: sanitized code-review findings and local verification for the monthly dividend-data navigation change
- Related request snapshot: [S017](./2026-11-13-dividend-data-month-navigation.md)
- Scope: ensure “all rows” is actually complete beyond the API's per-response row limit and make asynchronous query failures safe.

## Remediated behavior

- Fetch the selected month's exact-count result in sequential 500-row ranges; increment offsets by the number of rows actually returned and fail visibly if a non-empty expected range returns no rows.
- Use the requested sort plus unique `id` ordering so equal primary-sort values do not make offset batches unstable.
- Ignore results from superseded month/page/filter/sort requests. Catch rejected ledger queries and always clear the loading state for the current request.
- Treat official-link metadata lookup failures as a warning while preserving dividend ledger rows.

## Verification snapshot

- `src/components/DividendData.test.jsx` covers a 501-row month across multiple ranges, stable batch ordering, stale response ordering, rejected ledger queries, and rejected link metadata lookup.
- Local verification on 2026-11-13: Jest passed 18 suites / 102 tests; `npm run build` compiled successfully with the existing stale `caniuse-lite` database warning.
- Local browser returned HTTP 200 and rendered the login gate. The authenticated table flow was not verified; no credentials were entered and no database writes or deployment were performed.

Current component and test sources remain authoritative if implementation changes later.
