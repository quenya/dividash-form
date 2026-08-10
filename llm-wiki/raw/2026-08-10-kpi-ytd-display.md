# 2026-08-10 KPI YTD display change

- Changed files: `src/components/DividendChart.jsx`, `src/components/KPICard.jsx`, `src/utils/dividendKpi.js`
- Regression tests: `src/components/KPICard.test.jsx`, `src/utils/dividendKpi.test.js`

## Behavior

The `올해 누적 배당금` KPI labels the comparison as `전년 동기 대비` and includes the previous year's cumulative amount through the same month with thousands separators. The comparison row is omitted when the previous-year comparable total is unavailable or zero, because a percentage cannot be calculated reliably.
