# Motion Feedback Snapshot

- Captured: 2026-11-14
- Source: user request in a Claude chat session reviewing this repository
- Request (verbatim): “https://designbookmark.com/motion -> 여기서 적용해 볼만한 것이 있을까?”, then “1,2,3 진행해줘” for loading-to-success buttons, sliding tab indicators, and a toggle switch.
- Scope: interaction feedback only, implemented in plain CSS and React without new dependencies. The referenced Kokonut UI components use Tailwind, shadcn, and Motion, so only the ideas were taken. Builds on S019–S022.

## Behavior contract

- Remote actions show their state on the button: the manual registration and simulator save buttons go idle → loading → success (1.6s) → idle; OCR/text analysis and their save buttons show loading only because the form clears or results appear below. The button is disabled with `aria-busy` while loading, and success is announced through a visually hidden status region.
- Manual registration no longer uses `alert()` for success; a failed insert shows an error status message and keeps the entered values. The simulator save no longer uses `alert()`; a failure shows an error status message.
- Input-method tabs and the currency choice are `SegmentedControl` groups with a sliding indicator; the input section is rendered as an element so the control stays mounted across tab changes.
- Dividend reinvestment is a `ToggleSwitch` with switch semantics.
- `--motion-fast`/`--motion-base`/`--ease-out` tokens; a global `prefers-reduced-motion` rule cuts motion. The `animate-spin` class, which had no CSS, became `icon-spin`.

## Implementation evidence

- `src/components/ActionButton.jsx`, `SegmentedControl.jsx`, `ToggleSwitch.jsx` with tests; `DividendForm.test.jsx` covers success without `alert()` and the failure message.
- Local verification on 2026-11-14 with `TZ=Asia/Seoul`: Jest passed 24 suites / 126 tests; `CI=true npm run build` compiled successfully.
- Visual check: the S022 build and this build were served against a mocked Supabase endpoint with synthetic data. Static before/after captures in light and dark; motion captured frame by frame with transitions slowed about six times and with the insert request held open to show the loading state.
- Not verified: authenticated runtime against the real Supabase project, real network latency, and OS-level reduced-motion settings on devices. No database writes or deployment were performed.

This snapshot records the request and verified implementation boundary; current source and tests remain authoritative if implementation changes later.
