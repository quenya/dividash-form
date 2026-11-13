# Dividend Calendar Estimated Holding Count Snapshot

- Captured: 2026-11-13
- Source: user request in the DiviDash development Telegram thread; implementation and tests in pull request [#68](https://github.com/quenya/dividash-form/pull/68)
- Request (verbatim): “배당 캘린더의 실제 입금내역에 예정 분배금을 함께 고려해서 몇 주를 보유중인지 같이 표시해 주는 것으로 해줘”
- Scope: derive an approximate share count for an actual ETF receipt from an issuer-verified per-share distribution; never write the estimate to the user's ledger.

## Behavior contract

- Match only the same ticker, exact payment date, and currency, and only when exactly one verified official schedule row matches.
- Estimate whole shares by rounding `actual receipt amount / official distribution per share`; display the per-share basis and mark the count as approximate because taxes or fees can make the receipt differ from a gross distribution.
- Omit the estimate when the match is missing, ambiguous, invalid, or currency-incompatible.
- Keep official schedules as separate read-only calendar events and keep actual user receipts as the source of truth for ledger totals.
- Current/next-month schedules remain the visible forecast window. Historical official rows are looked up by exact payment dates from actual receipts for eligible recent ETF tickers, solely to derive estimates for actual receipt events.

## Implementation evidence

- `src/hooks/useDividendData.js` queries current/next-month official schedules and exact historical receipt dates for candidate ETF tickers.
- `src/utils/dividendCalendarEvents.js` matches verified schedule rows without adding historical schedules to the visible event list.
- Regression coverage: `src/hooks/useDividendData.test.js`, `src/utils/dividendCalendarEvents.test.js`, and `src/components/DividendCalendar.test.jsx`.

This snapshot records the product request and the intended code boundary; the current source and tests remain authoritative if implementation changes later.