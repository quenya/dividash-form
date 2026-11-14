# Design Token Consistency Snapshot

- Captured: 2026-11-14
- Source: user request in a Claude chat session reviewing this repository
- Request (verbatim): “디자인을 적용하고 싶어. 검토해줘”, followed by the selected option “DESIGN.md 기준 일관성 정리” and “계속”.
- Scope: apply the existing `DESIGN.md` direction consistently — semantic color tokens with light/dark values, one theme source, canvas-safe chart colors, the shared chart palette, the status-message primitive, and the app-shell accessibility rules. No visual redesign, data-flow, or database change.

## Review findings that motivated the change

- Components used raw hex/rgba values instead of tokens; several light-only values (`#fff`, `#f5f5f5`, `#f8f9fa`) produced white blocks and low-contrast text in dark mode, including the manual-entry table header.
- `ThemeContext` wrote body colors inline that differed from the CSS tokens; `--bg-card` was used but never defined.
- Chart text was fixed at `#666`; `DividendSimulator` passed `var(--accent-color)` to Chart.js, which canvas cannot resolve, so its line rendered in the default black.
- `PortfolioAnalysis` and the Top-10 stock chart used Chart.js default colors instead of the shared palette.
- Navigation lacked `aria-current`; mobile icon-only buttons lacked accessible names; the currency tabs set `outline: none`.

## Implementation evidence

- Tokens and primitives: `src/styles/App.css`; rules: `DESIGN.md`.
- Chart colors: `src/utils/chartTheme.js` and `useChartTheme()` in `src/context/ThemeContext.jsx`; `src/utils/chartTheme.test.js` asserts the chart values equal the CSS tokens.
- App shell: `src/components/Layout.jsx` with `src/components/Layout.test.jsx` (current page, grouped input pages, mobile icon-button names).
- Local verification on 2026-11-14 with `TZ=Asia/Seoul`: Jest passed 20 suites / 108 tests; `CI=true npm run build` compiled successfully. Under a UTC timezone, four existing `todayScheduledNotifications` tests fail before and after this change.
- Visual check: production builds before and after the change were served locally against a mocked Supabase endpoint with synthetic demo data (no real account, ledger, or personal values) and captured with Chromium at 1366px and 375px, in light and dark themes. Observed: readable dark-mode chart text and grid, the manual-entry table header no longer white in dark mode, the simulator line drawn in the accent color, palette colors on the sector doughnut, and `document.documentElement.scrollWidth` of 375 at 375px. The bottom-nav label wrapping at 375px was identical before and after.
- Not verified: authenticated runtime against the real Supabase project, and 768px. No database writes or deployment were performed.

This snapshot records the request and verified implementation boundary; current source and tests remain authoritative if implementation changes later.
