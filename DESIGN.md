# DiviDash Design System

## 1. Atmosphere & Identity

DiviDash is a calm financial command center: practical, readable, and low-noise. Its signature is a light dashboard surface with a single blue action accent, dark-mode parity, and modest card depth that keeps forms approachable without feeling decorative.

## 2. Color

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | `--bg-primary` | `#f5f6fa` | `#1a1b1e` | App background |
| Surface/secondary | `--bg-secondary` | `#ffffff` | `#25262b` | Cards and forms |
| Text/primary | `--text-primary` | `#2d3436` | `#e0e0e0` | Headings and input text |
| Text/secondary | `--text-secondary` | `#636e72` | `#a1a1aa` | Help text and metadata |
| Border/default | `--border-color` | `#dfe6e9` | `#373a46` | Inputs and dividers |
| Accent/primary | `--accent-color` | `#4f8cff` | `#5c7cfa` | Primary actions and focus |
| Action/text | `--button-text` | `#ffffff` | `#ffffff` | Primary action labels |
| Status/error | `--status-error` | `#b42318` | `#f97066` | Inline validation and errors |
| Status/success | `--status-success` | `#18794e` | `#5dd39e` | Completion messages |

Accent is reserved for interactive actions. Error and success colors are used only for inline status messages.

## 3. Typography

- Primary: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- Body: 16px with a 1.6 line-height.
- Secondary text: 14px with a 1.5 line-height.
- Card titles: 22px, weight 600.
- Login and account headings: 22px, weight 700.

## 4. Spacing & Layout

All new spacing uses a 4px base unit.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Icon-to-label spacing |
| `--space-2` | `8px` | Compact control groups |
| `--space-3` | `12px` | Field and button gaps |
| `--space-4` | `16px` | Standard section spacing |
| `--space-5` | `20px` | Card inner rhythm |
| `--space-6` | `24px` | Card padding |
| `--space-8` | `32px` | Page-level separation |

The authentication surface is a centered `cover` layout. The account surface is a `content-limiter` inside the existing fixed-sidenav shell; the main content remains the only vertical scroll owner.

## 5. Components

### Card

- **Structure**: bordered surface with heading, content stack, and optional actions.
- **Variants**: dashboard, authentication, account.
- **Spacing**: `--space-5` to `--space-6` padding.
- **States**: default and content-stress reflow.
- **Accessibility**: semantic headings and labeled controls.

### Form field

- **Structure**: label above input, optional inline error or help text below.
- **Variants**: email, password, confirmation.
- **Spacing**: `--space-2` label gap and `--space-3` field gap.
- **States**: default, focus, disabled, loading, error.
- **Accessibility**: explicit labels, visible focus, `aria-live` for status.

### Password form

- **Structure**: heading, password and confirmation fields, primary submit action, inline status.
- **Variants**: recovery and account change.
- **Spacing**: card stack using `--space-3` and `--space-4`.
- **States**: default, submitting, mismatch, API error, success.
- **Accessibility**: keyboard reachable, autocomplete values, status announced inline.

## 6. Motion & Interaction

No new animation is required for password flows. Existing button hover and pressed states remain in place. Focus indicators must be visible, and `prefers-reduced-motion` continues to disable non-essential motion.

## 7. Depth & Surface

The project uses a mixed strategy: `--border-color` for structure and `--card-shadow` for card elevation. New authentication and account cards use the existing `.card` treatment and do not introduce a second radius or shadow scale.

## 8. Accessibility Constraints & Accepted Debt

- WCAG 2.2 AA target.
- Body and helper text must remain readable in both light and dark themes.
- Every input has a visible label and focus state.
- Error and success messages use `role="status"` or `role="alert"` as appropriate.
- Password fields use `autocomplete="new-password"` during reset/change and `autocomplete="current-password"` only for sign-in.

Accepted debt: existing dashboard components use inline styles and some legacy raw CSS values. New password surfaces use the documented tokens and do not expand that legacy pattern.
