# DiviDash Design System

## 1. Direction

DiviDash is an operational finance dashboard. The UI should preserve the existing quiet app-shell pattern: restrained surfaces, clear data hierarchy, compact controls, and minimal decorative treatment.

## 2. Tokens

- Background: `var(--bg-primary)`, `var(--bg-secondary)`, `var(--bg-card)`
- Text: `var(--text-primary)`, `var(--text-secondary)`
- Accent: `var(--accent-color)`
- Border: `var(--border-color)`
- Danger: `#dc3545`
- Success: `#28a745`

## 3. Typography

- Base font: existing system sans-serif stack from `src/styles/App.css`
- Page titles: existing dashboard heading scale
- Form labels and helper text: compact, readable, no marketing copy

## 4. Spacing

- Base spacing unit: 4px
- Form/control gaps: 8px to 12px
- Card padding: 16px to 24px
- Desktop content padding: 32px
- Mobile content padding: 16px

## 5. Primitives

- App shell: fixed desktop sidebar, mobile top header plus bottom nav
- Card: single-level framed surface only, no nested decorative cards
- Button: visible focus, explicit disabled state, command text only
- Form field: label plus input/select/textarea, full-width in narrow panels
- Status message: bordered tonal block for success/error
- Categorical chart: use the shared chart palette, one legend item per category, and an explicit tooltip label.

### Chart palette

Year and categorical series use these opaque colors in index order so related charts keep the same category mapping:
`#4e73df`, `#d94b3d`, `#168a63`, `#b87800`, `#2e8fa3`, `#6b7280`, `#d46213`, `#805bbf`.

## 6. Accessibility

- Every auth input must have a label and autocomplete attribute.
- Buttons that submit remote actions must expose disabled/loading state.
- Security messages should be factual and avoid exposing internal error payloads unless needed for debugging.

## 7. Accepted Debt

- Existing components still contain inline styles and raw colors. Security hardening preserves that structure to avoid mixing a broad design refactor into this change.
