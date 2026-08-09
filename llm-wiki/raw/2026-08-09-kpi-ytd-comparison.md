# 2026-08-09 KPI YTD comparison change

- Changed file: `src/components/DividendChart.jsx`
- New helper: `src/utils/dividendKpi.js`
- Regression test: `src/utils/dividendKpi.test.js`

## Behavior

The `올해 누적 배당금` KPI now sums January through the current month of the current year. Its YoY change compares that value with January through the same month of the previous year. The monthly average uses the elapsed-month count for the same current-year YTD range.

The monthly comparison chart already limits displayed comparison bars through the current month and remains unchanged.

## Verification

- Targeted Jest regression tests: 2 passed
- Production build: passed
- Warning: Browserslist `caniuse-lite` data is stale; unrelated to this change
