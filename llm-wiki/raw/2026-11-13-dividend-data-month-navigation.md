# Monthly Dividend Data Navigation Snapshot

- Captured: 2026-11-13
- Source: user request in the DiviDash development Telegram thread
- Request (verbatim): “배당 데이터 표를 월 단위로 끊도록 하자. 그리고 상단에는 지난달과 다음달 등으로 이동할 수 있도록 하자. 기본으로는 페이지당 건수 전체 나오는 것으로 해줘”
- Scope: display one selected calendar month at a time in the dividend data table, provide adjacent-month navigation, and default to all rows for that month.

## Behavior contract

- The table initially selects the user's current local calendar month.
- Filter `payment_date` with an inclusive month-start bound and an exclusive first-day-of-next-month bound; previous/next controls move by one calendar month.
- Default page size is all rows matching the selected month. Optional 10, 25, and 50 row page sizes retain server-side pagination within that month.
- The view is read-only and does not add, update, or delete user dividend records.

## Implementation evidence

- `src/components/DividendData.jsx` implements month selection, navigation, date bounds, and page-size behavior.
- `src/components/DividendData.test.jsx` covers month bounds, year rollover, navigation, all-rows default, and numeric pagination.
- Local verification on 2026-11-13: Jest passed 18 suites / 98 tests; `npm run build` compiled successfully. The build emitted the existing stale `caniuse-lite` database warning.
- No database writes or deployment were performed as part of this change.

This snapshot records the request and verified implementation boundary; current source and tests remain authoritative if implementation changes later.
