# DiviDash Design System

## 1. Direction

DiviDash is an operational finance dashboard. The UI should preserve the existing quiet app-shell pattern: restrained surfaces, clear data hierarchy, compact controls, and minimal decorative treatment.

## 2. Tokens

All colors come from CSS custom properties in `src/styles/App.css`: light values on `:root`, dark values on `body.dark-mode`. Components use `var(--token)` instead of raw hex values.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg-primary` | `#f5f6fa` | `#1a1b1e` | Page background, table headers, inset blocks |
| `--bg-secondary`, `--bg-card` | `#ffffff` | `#25262b` | Cards, sidebar, inputs |
| `--text-primary` | `#2d3436` | `#e0e0e0` | Body text |
| `--text-secondary` | `#636e72` | `#a1a1aa` | Labels, helper text, chart text |
| `--accent-color` | `#4f8cff` | `#5c7cfa` | Primary actions, active navigation |
| `--text-on-accent` | `#ffffff` | `#ffffff` | Text on accent fills |
| `--border-color` | `#dfe6e9` | `#373a40` | Borders, table rules |
| `--danger` | `#dc3545` | `#ff6b6b` | Errors, negative change, unresolved items |
| `--text-on-danger` | `#ffffff` | `#1a1b1e` | Text on danger fills |
| `--success` | `#1a7f37` | `#51cf66` | Saved state, positive change, goal reached |
| `--warning` | `#9a6700` | `#d29922` | Partial or stale data notices |
| `--gain` | `#d62b3c` | `#ff6b6b` | Increase (▲), Korean market convention |
| `--loss` | `#1b64da` | `#74a7ff` | Decrease (▼), Korean market convention |
| `--danger-bg` / `--danger-border`, `--success-bg` / `--success-border` | tonal rgba | tonal rgba | Status message blocks |
| `--chart-grid` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.08)` | Chart grid lines |
| `--radius-sm` / `--radius-md` / `--radius-lg` | 6 / 8 / 12px | same | Controls / nav items / cards |

Success changed from `#28a745` to `#1a7f37` because the old value reached only 3.1:1 on white; the new value meets 4.5:1 for text. Dark-mode semantic colors are lighter variants chosen for at least 4.5:1 on `--bg-secondary`.

`color-scheme` follows the theme, so native controls (buttons, date inputs, range sliders, scrollbars) also switch. `ThemeContext` only toggles the `dark-mode` class; it does not write colors.

## 3. Typography

- Base font: `--font-sans`, the system sans-serif stack with Korean system faces (`Apple SD Gothic Neo`, `Malgun Gothic`, `Noto Sans KR`). No web font is loaded.
- Amounts: tables and `.tabular-nums` use tabular figures so digits line up.
- Page titles: existing dashboard heading scale
- Form labels and helper text: compact, readable, no marketing copy

## 4. Spacing

- Base spacing unit: 4px
- Form/control gaps: 8px to 12px
- Card padding: 16px to 24px
- Desktop content padding: 32px
- Mobile content padding: 16px

## 5. Primitives

- App shell: fixed desktop sidebar, mobile top header plus bottom nav. Implemented with `.app-*` classes in `App.css`; navigation is a `nav` landmark and marks the current page with `aria-current="page"`.
- Card: single-level framed surface only, no nested decorative cards
- Button: visible focus, explicit disabled state, command text only. Never set `outline: none`; the global `:focus-visible` rule draws the focus ring. Icon-only buttons need an `aria-label`; toggles expose `aria-pressed`.
- Form field: label plus input/select/textarea, full-width in narrow panels
- Status message: `.status-message` (success) or `.status-message.is-error`, a bordered tonal block with `role="status"`.
- Change direction: follow the Korean market convention. An increase is red (`--gain`) with ▲, a decrease is blue (`--loss`) with ▼, and no change is `--text-secondary` with no marker. Always pair the color with the marker. `--success` and `--danger` are for status (saved, error, unresolved), never for direction. Use `.text-gain`, `.text-loss`, and `.text-unchanged` for text; tests assert these classes because jsdom drops `var()` values from inline `color`.
- Categorical chart: use the shared chart palette only when color identifies the same category across charts (years, accounts), with one legend item per category and an explicit tooltip label.
- Ranking chart: Top 10 securities and sector share are horizontal bars in one color (`--accent-color` via the chart theme); the Unknown sector is gray `#6b7280` (`UNKNOWN_SECTOR_COLOR`).

### Chart palette

Year and categorical series use these opaque colors in index order so related charts keep the same category mapping:
`#4e73df`, `#d94b3d`, `#168a63`, `#b87800`, `#2e8fa3`, `#6b7280`, `#d46213`, `#805bbf`.

The palette has eight colors; a chart with more categories repeats them in order.

### Chart periods and labels

- A period that has not ended yet (the current month, the current year) is drawn at 35% opacity (`IN_PROGRESS_OPACITY` in `src/utils/dividendChartData.js`) and its tooltip title ends with "(진행 중)". One caption above the dashboard charts explains faded bars.
- A month with no value is `null` and gets no data label; a real zero change is still labeled `₩ 0`.
- A single-series chart whose bars are colored per category (account totals, year-over-year change) hides the Chart.js legend: its one swatch would match only the first bar. Category names are already on the axis.
- Data labels mark only the value the chart is about: the current month on the monthly and year-over-year charts, and the final year on the simulator. Every value stays in the tooltip.
- KRW axes use `formatKrwAxis` (`30만`, `2.5억`); data labels and tooltips keep full amounts (`₩ 154,700`).
- The monthly chart draws the current year as bars and earlier years as lines. Only last year's line is visible by default; older years start hidden and can be turned on from the legend. Its tooltip lists every visible year for the hovered month.

### Chart theme

Chart.js draws on canvas, which cannot resolve CSS variables: a `var(--…)` string passed to a chart is ignored and falls back to the default color. Chart text, grid, tooltip, accent, and gain/loss colors come from `useChartTheme()` (`src/context/ThemeContext.jsx`), backed by `src/utils/chartTheme.js`. Those values mirror the CSS tokens, and `chartTheme.test.js` fails if `--text-secondary`, `--chart-grid`, `--accent-color`, `--gain`, or `--loss` drift apart. Change both files together.

## 6. Accessibility

- Every auth input must have a label and autocomplete attribute.
- Buttons that submit remote actions must expose disabled/loading state.
- Security messages should be factual and avoid exposing internal error payloads unless needed for debugging.
- Text tokens meet 4.5:1 on their intended surfaces, with the exception listed under Accepted Debt.

## 7. Accepted Debt

- Layout properties (spacing, flex, sizing) are still inline styles in most components outside the app shell. Move them to classes per component, starting with `DividendForm` and `PortfolioAnalysis`, in changes that do not mix in behavior work.
- White text on `--accent-color` is 3.2:1 in light mode and 3.7:1 in dark mode, below 4.5:1. Fixing it changes the brand accent and needs a design decision.
- The mobile bottom nav has seven items; at 375px several Korean labels wrap to two lines.
- Remaining literal colors: the modal overlay and notification shadow, the react-calendar dark-mode overrides, the scrollbar thumb, and the unused `DividendPredictionChart`.
