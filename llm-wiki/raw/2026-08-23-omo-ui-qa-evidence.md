# OMO UI and QA Evidence Snapshot

- Captured: 2026-08-23
- Source corpus: `.omo/evidence/` reports, geometry exports, and screenshots created between 2026-07-24 and 2026-08-23
- Current code baseline used for revalidation: commit `f6400e1e79dff9049ff22691d06f993826773c7c`
- Privacy treatment: screenshots are not copied into the Wiki; account data, email values, and other screen content are not reproduced
- Retention: the source `.omo/` directory is removed after ingest; this sanitized snapshot is the durable project record

## Evidence inventory

The corpus contains intermediate and final reviews for chart layout, manual-entry date reset, responsive navigation, KPI display, chart color/accessibility, and a focused security review. The reusable reports are:

- `.omo/evidence/dividash-focused-ui-fixes-gate-review.md`
- `.omo/evidence/dividash-chart-form-fixes-gate-review.md`
- `.omo/evidence/dividash-date-reset-blocker-fix-gate-review.md`
- `.omo/evidence/dividash-chart-form-fixes-manual-qa.md`
- `.omo/evidence/fix-yoy-chart-headroom-gate-review.md`
- `.omo/evidence/fix-yoy-chart-headroom-code-review.md`
- `.omo/evidence/dividash-final-qa-manual-qa.md`
- `.omo/evidence/dividash-security-0fa69f3-gate-review.md`
- `.omo/evidence/issue-16-gate-review.md`
- `.omo/evidence/issue-17-gate-review.md`

Geometry JSON and desktop/mobile screenshots support the reports, but are point-in-time render evidence rather than durable runtime truth.

## Chronology and resolution

1. The initial chart/form review accepted the chart direction but rejected the date reset because `Date#toISOString()` returned the previous calendar day during the KST midnight boundary. The original test repeated the same UTC algorithm and could not detect the defect.
2. The date implementation was changed to local `getFullYear`, `getMonth`, and `getDate` parts. A rendered-form regression test freezes a boundary date, submits the form, and asserts a literal local-date value. The focused follow-up gate approved the result.
3. A 375px full-page capture exposed an older fixed bottom navigation overlaying dashboard content. The layout was changed to a three-row `header / scrollable main / bottom navigation` grid with safe-area padding. A later QA attempt still recorded an authentication-prerequisite evidence gap; it did not treat an unauthenticated login capture as proof of the authenticated product shell.
4. The chart work converged on internal YoY y-axis headroom, a horizontal Top-10 stock bar chart, a bounded portfolio doughnut wrapper, and card width constraints.
5. The focused security review found no new credential, auth, XSS, logging, or submission-boundary change in the UI patch.
6. Issue 16 later verified the monthly-average KPI against the same elapsed prior-year period, hidden comparison when prior data is unavailable, and 375px wrapping without horizontal overflow.
7. Issue 17 later verified distinct indexed annual-chart colors, a shared palette, an interactive DOM legend, meaningful accessible names, readable tooltips, and responsive captures at 375, 768, and 1280 CSS pixels.

Intermediate `REJECT` and `FAIL` reports are retained as failure-mode evidence. They do not describe current behavior unless a fresh current-code or runtime check reproduces the issue.

## Current-code revalidation

At the captured baseline:

- `src/components/DividendChart.jsx` applies `20%` y-scale grace to the prior-year comparison, renders the stock Top-10 chart with `indexAxis: 'y'`, uses a shared indexed palette, and exposes a DOM legend for annual totals.
- `src/components/PortfolioAnalysis.jsx` keeps the sector doughnut inside a bounded responsive chart area.
- `src/components/DividendForm.jsx` resets `payment_date` through a local-calendar helper after a successful insert.
- `src/components/DividendForm.test.jsx` exercises the observable post-submit date at a fixed boundary value.
- `src/components/Layout.jsx` uses a dynamic-viewport three-row mobile grid; the center `main` is the scroll container and the bottom navigation occupies its own grid row.

The historical UI review commits `0fa69f3`, `1bd583d`, and `c83415f` are not ancestors of current `main`. Equivalent resolved behavior entered `main` through commit `64ba3a5424decd2eafb8d13cef7857713a4084d4` and was subsequently extended. Future work must verify current source rather than assuming those old review SHAs are the shipped implementation.

## Reusable QA rules

- Bind every review and screenshot set to an exact commit SHA; branch movement invalidates unstamped evidence.
- Authenticated product surfaces must be tested through an authenticated browser state. A login screen is not evidence for dashboard responsiveness.
- For local calendar dates, do not use UTC ISO serialization as “today.” Regression tests should use a fixed contract value that differs under UTC and local time, then assert rendered behavior.
- For responsive chart QA, check body `scrollWidth`, card/canvas bounds, CJK label wrapping, data-label collision, tooltip headroom, and bottom-navigation overlap.
- Full-page captures reveal scroll and overlay defects; viewport captures verify what the user initially sees. Use both when navigation or long charts are involved.
- Chart color claims require more than distinct pixels: verify stable index mapping, tooltip labels, legend interaction, accessible names, and hidden-series state.
- Treat build/test success as necessary but insufficient for layout claims; retain real browser geometry and visual evidence.

## Residual evidence limits

- Several early reports used stale or concurrently moved branch SHAs. Their observations are useful only as regression cases.
- Some Issue 16 transport data was browser-mocked, so that evidence does not prove live Supabase connectivity.
- Issue 16 and Issue 17 noted label collisions in dashboard charts outside their focused scopes. Current full-surface visual status requires a fresh authenticated capture before closure.
