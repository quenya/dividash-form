# Chart Readability Snapshot

- Captured: 2026-11-14
- Source: user request in a Claude chat session reviewing this repository
- Request (verbatim): “진행”, approving the proposed readability items after S020: emphasize the current year in the monthly chart, use 만-unit axes, stop overlapping labels on the year-over-year chart, use one color for the Top 10 chart, replace the sector doughnut with horizontal bars and a gray Unknown sector, and label only the final simulator value.
- Scope: chart presentation in `DividendChart`, `PortfolioAnalysis`, and `DividendSimulator`. No data-flow, ledger, KPI, or schema change. Builds on S019 and S020.

## Behavior contract

- Monthly chart: current year as bars (current month still faded), earlier years as lines, only last year visible by default, and an index tooltip listing every visible year for the hovered month.
- Year-over-year chart: only the current month carries a data label.
- KRW axes on the dashboard, Top 10, sector, and simulator charts use 만/억 units; labels and tooltips keep full amounts.
- Top 10 and sector charts are single-color horizontal bars; the Unknown sector is gray. Sector bars show share percentages; tooltips show amount and share.
- Simulator: only the final year is labeled, placed left of the last point so it is not clipped.

## Implementation evidence

- Helpers `formatKrwAxis`, `sectorBarColors`, and `buildMonthlyYearDatasets` in `src/utils/dividendChartData.js`, with literal-value tests in `src/utils/dividendChartData.test.js`. `src/components/PortfolioAnalysis.test.jsx` checks the horizontal sector chart and its colors.
- The unused slice-border and on-slice values were removed from `src/utils/chartTheme.js` with the doughnut.
- Local verification on 2026-11-14 with `TZ=Asia/Seoul`: Jest passed 21 suites / 119 tests; `CI=true npm run build` compiled successfully.
- Visual check: the S020 build and this build were served against a mocked Supabase endpoint with synthetic demo data (including synthetic confirmed sector matches) and captured at 1366px and 375px. Observed: bars plus a line in the monthly chart with 2024 hidden, a single label on the year-over-year chart, 만-unit axes, single-color ranking bars, a gray Unknown sector bar, an “11월 (진행 중)” tooltip listing 2025 and 2026, and an unclipped final simulator label.
- Not verified: authenticated runtime against the real Supabase project. No database writes or deployment were performed.

This snapshot records the request and verified implementation boundary; current source and tests remain authoritative if implementation changes later.
