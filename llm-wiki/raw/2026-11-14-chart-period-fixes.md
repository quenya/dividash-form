# Chart Period and Label Fixes Snapshot

- Captured: 2026-11-14
- Source: user request in a Claude chat session reviewing this repository
- Request (verbatim): “사용중인 차트는 개선할 부분이 있을까”, followed by “진행해” for the proposed first three items: unlabeled empty months, misleading single-swatch legends, and the unfinished current period.
- Scope: `DividendChart` behavior only. No data-flow, ledger, or schema change. Builds on S019.

## Behavior contract

- Year-over-year comparison months after the current month are `null` and carry no data label; previously they showed “₩ 0”.
- The account-total and year-over-year comparison charts hide the Chart.js legend because their single swatch did not match per-bar colors.
- The current month (monthly and comparison charts) and the current year (annual chart) are drawn at reduced opacity, their tooltip titles end with “(진행 중)”, and one caption above the charts explains faded bars. Values and totals are unchanged.

## Implementation evidence

- `src/utils/dividendChartData.js` holds `buildYoyComparison`, `formatKrwLabel`, and `periodFill`; `src/utils/dividendChartData.test.js` covers null months, real zero labels, current-month fading, sign colors, and a missing previous year with literal expected values.
- `src/components/DividendChart.jsx` uses one date per render for the current month/year in labels, tooltips, and the KPI title.
- Local verification on 2026-11-14 with `TZ=Asia/Seoul`: Jest passed 21 suites / 114 tests; `CI=true npm run build` compiled successfully.
- Visual check: the S019 build and this build were served against a mocked Supabase endpoint with synthetic demo data and captured in light and dark themes. Observed: no December label on the comparison chart, no single-swatch legends, faded current-month and current-year bars, and the “11월 (진행 중)” tooltip title on hover.
- Not verified: authenticated runtime against the real Supabase project. No database writes or deployment were performed.

This snapshot records the request and verified implementation boundary; current source and tests remain authoritative if implementation changes later.
