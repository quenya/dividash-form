# OMO Password and Account UX Evidence Snapshot

- Captured: 2026-08-23
- Source corpus: `.omo/evidence/password-auth/` screenshots created on 2026-08-02
- Prototype implementation: commit `6ac37bc436e3428f37f8aeeacf1140fe4f067d4b` on branch `agent/password-reset`
- Current-code baseline: commit `f6400e1e79dff9049ff22691d06f993826773c7c`
- Privacy treatment: screenshots and displayed email values are not copied into the Wiki
- Retention: the source `.omo/` directory is removed after ingest; this sanitized snapshot is the durable project record

## What the captures document

The screenshot sequence covers desktop and mobile login, password-reset request, recovery refinement, and authenticated account settings. It includes 375px mobile, 768px tablet, and approximately 1200–1280px desktop/wide layouts. Filenames containing `fixed`, `final`, and `keepall` show an iterative visual QA sequence; only the final images are useful as design intent, not as proof of deployment.

Reusable design intent:

- The unauthenticated card explains that dividend data is visible only to signed-in users.
- Sign-in exposes account creation and a password-reset entry point.
- Password-reset request asks only for the email and returns to sign-in without exposing whether an account exists.
- Recovery requires a new password and confirmation, validates minimum length and equality, and reports success or error accessibly.
- Authenticated account settings show the current login identity and allow password change, with a clear path back to the dashboard.
- Mobile account settings retain the application header and bottom navigation while keeping the form readable without horizontal overflow.

## Implementation status

This is not current `main` behavior.

- Current `src/components/AuthGate.jsx` supports sign-in and sign-up only.
- Current `src/context/AuthContext.jsx` exposes sign-in, sign-up, and sign-out only.
- The prototype branch adds password-reset email requests, `PASSWORD_RECOVERY` event handling, password update, a shared password form, and an account-settings surface.
- Commit `6ac37bc436e3428f37f8aeeacf1140fe4f067d4b` and branch head `b79ecb108fa81883a0096f515664fc4d069db496` are not ancestors of current `main`.

The screenshot set therefore records a reusable prototype and acceptance criteria, not a shipped feature.

## Verification required before adoption

- Rebase or reimplement against current auth, layout, account-master, and security behavior; do not merge the old branch blindly.
- Confirm the Supabase password-reset redirect origin is in the deployed allowlist for the exact production alias.
- Exercise the real email link and `PASSWORD_RECOVERY` event end to end in a browser; a static screenshot cannot validate the auth event or session transition.
- Use a non-enumerating reset-request message and avoid logging email, token, recovery fragment, or password values.
- Verify password update error/success states, expired or reused links, signed-out recovery, signed-in account change, and session continuity.
- Repeat 375, 768, and desktop visual checks with real authenticated state and inspect focus order, keyboard operation, accessible status/alert roles, safe-area behavior, and horizontal overflow.
