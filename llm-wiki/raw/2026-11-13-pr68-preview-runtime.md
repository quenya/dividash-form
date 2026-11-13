# PR #68 Vercel Preview Runtime Check

- Captured: 2026-11-13
- Source: browser runtime inspection of the Vercel previews associated with [DiviDash PR #68](https://github.com/quenya/dividash-form/pull/68)
- Scope: verify whether successful preview deployment checks provide a working React application runtime; no production deployment was inspected.

## Observed result

- Vercel reported both preview deployments complete and their PR checks passed.
- Browser inspection of the `dividash-form` preview rendered an empty page. The uncaught runtime exception was `Error: supabaseUrl is required` from the generated main JavaScript bundle.
- A second preview project also rendered a blank page; no authenticated calendar interaction was verified.
- The observed failure is consistent with missing Preview `REACT_APP_SUPABASE_URL` configuration. It does not establish production runtime status or prove whether any configured Preview key is valid.

## Verification boundary

The deploy checks establish that preview deployments completed, not that the browser application initialized. Configure only the intended Preview environment variables and repeat real-browser verification before claiming an authenticated preview pass. Do not copy or inspect environment-variable values in logs or documentation.