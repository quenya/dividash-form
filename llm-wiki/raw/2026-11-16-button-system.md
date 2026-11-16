# Button System Snapshot

- Captured: 2026-11-16
- Source: user request in a Claude chat session reviewing this repository
- Request (verbatim): “버튼들이 너무 구식이야. 디자인을 입혀줘”
- Scope: one shared button style applied to every button outside charts and table headers, plus the tokens it needs. No behavior or data change. Builds on S019–S023.

## Behavior contract

- `.btn` with variants `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`, `btn-link` and sizes `btn-sm`, `btn-icon`, `btn-block`, `btn-option`, in `src/styles/App.css`. Hover, pressed (scale 0.97), disabled (45%), and busy (full opacity, progress cursor) states. The native file picker button matches `btn-secondary`.
- Primary fills and the active navigation item use `--accent-strong` (light `#3a6ad4`, 5.0:1 with white; dark `#4263eb`, 5.0:1). No text is white on `--accent-color` any more, which closes the accent-contrast gap tracked since S019.
- The ETF analysis period buttons became a `SegmentedControl`. Manual registration's submit button is full width at the end of the form.
- Unchanged on purpose: the annual chart's DOM legend buttons and the sortable table headers in the data view.

## Correction to S023

S023 records its capture and local verification as 2026-11-14. Both happened on 2026-11-16, after S022. The snapshot is left unchanged per the raw immutability rule; this note supersedes its date.

## Implementation evidence

- Classes applied in AuthGate, DividendData, DividendForecast, DividendForm, DividendSimulator, EtfCacheAnalytics, GoalTracker, NotificationCenter, OCRUpload, PortfolioAnalysis, RecentEtfCandidates, and TextAnalysis. Accessible names are unchanged, so existing tests still locate every button.
- Local verification on 2026-11-16 with `TZ=Asia/Seoul`: Jest passed 24 suites / 126 tests; `CI=true npm run build` compiled successfully.
- Visual check: the S023 build and this build were served against a mocked Supabase endpoint with synthetic data and captured in light and dark for login, manual input, OCR, data, ETF analysis, portfolio, and the dashboard shell.
- Not verified: authenticated runtime against the real Supabase project. No database writes or deployment were performed.

This snapshot records the request and verified implementation boundary; current source and tests remain authoritative if implementation changes later.
