# Gain and Loss Colors Snapshot

- Captured: 2026-11-14
- Source: user request in a Claude chat session reviewing this repository
- Request (verbatim): “한국식으로”, answering whether gain/loss should be green/red or the Korean convention (increase red, decrease blue).
- Scope: the color of change direction in `KPICard` and the year-over-year comparison chart. Status colors (`--success`, `--danger`) are unchanged. Builds on S019–S021.

## Behavior contract

- An increase is red (`--gain`) with ▲, a decrease is blue (`--loss`) with ▼, and a zero change is `--text-secondary` with no marker.
- The year-over-year chart uses the same gain/loss colors from the chart theme, so they follow light and dark mode; the current month stays faded.
- Light values `#d62b3c` and `#1b64da` reach 4.9:1 and 5.4:1 on white; dark values `#ff6b6b` and `#74a7ff` reach 5.4:1 and 6.3:1 on `--bg-secondary`.

## Implementation evidence

- Tokens and `.text-gain`/`.text-loss`/`.text-unchanged` in `src/styles/App.css`; mirrored chart values in `src/utils/chartTheme.js`, checked by `src/utils/chartTheme.test.js`.
- `yoyBarColors` in `src/utils/dividendChartData.js` applies colors at render time; `buildYoyComparison` now returns only the data. Literal-value tests in `src/utils/dividendChartData.test.js`; `src/components/KPICard.test.jsx` covers increase, decrease, and unchanged.
- Local verification on 2026-11-14 with `TZ=Asia/Seoul`: Jest passed 21 suites / 120 tests; `CI=true npm run build` compiled successfully.
- Visual check: the S021 build and this build were served against a mocked Supabase endpoint with synthetic demo data (three 2026 months lowered to show decreases) and captured in light and dark. Observed: red ▲ and blue ▼ in KPI cards, red increase and blue decrease bars, and the faded current month.
- Not verified: authenticated runtime against the real Supabase project. No database writes or deployment were performed.

This snapshot records the request and verified implementation boundary; current source and tests remain authoritative if implementation changes later.
