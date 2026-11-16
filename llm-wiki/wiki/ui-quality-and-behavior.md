---
title: UI Behavior and QA Invariants
type: workflow
status: current
updated: 2026-11-16
source_refs: [S002, S007, S015, S017, S018, S019, S020, S021, S022, S023, S024]
tags: [ui, charts, calendar, responsive, accessibility, qa, theme]
---

# UI Behavior and QA Invariants

이 페이지는 과거 `.omo/evidence/`의 중간·최종 QA 결과에서 재사용할 사용자 동작과 검증 규칙을 종합한다. 스크린샷은 point-in-time evidence이므로 현재 코드와 fresh runtime을 함께 확인한다.

## Current behavior invariants

### Dashboard charts

- 전년 동월 비교 chart는 y-axis 내부에 추가 headroom을 두어 최고 막대, data label, tooltip이 chart 상단과 충돌하지 않아야 한다. 현재 [`DividendChart.jsx`](../../src/components/DividendChart.jsx)는 해당 chart에 `20%` grace를 적용한다.
- 종목별 배당금은 순위와 긴 한국어 종목명을 읽을 수 있는 가로 Top-10 bar chart다. 막대는 accent 단색이다. label truncation, 오른쪽 금액 label 공간, tooltip을 함께 확인한다.
- 연도별 합계는 정렬된 year index와 [`chartPalette.js`](../../src/utils/chartPalette.js)의 동일한 color mapping을 사용한다. DOM legend button은 hidden state와 접근 가능한 action name을 동기화해야 한다.
- Portfolio 섹터 비중은 가로 bar chart다. 높이는 섹터 수에 비례하고(최소 160px) card 밖으로 넘치지 않아야 한다. 알려진 섹터는 accent 단색, Unknown은 회색이며 막대 끝에 비중 %, tooltip에 금액과 비중을 표시한다(S021).
- 월별 chart는 올해를 막대, 이전 연도를 선으로 그린다. 기본으로 지난해 선만 보이고 더 이전 연도는 legend에서 켠다. Tooltip은 같은 달의 보이는 모든 연도를 함께 보여준다(S021).
- KRW 축은 `formatKrwAxis`로 만/억 단위를 쓰고, data label과 tooltip은 전체 금액을 유지한다. Data label은 월별·전년 대비 chart의 이번 달, simulator의 마지막 연도에만 붙인다(S021).
- 아직 끝나지 않은 기간(월별·전년 동월 대비 chart의 이번 달, 연도별 chart의 올해)은 흐리게 그리고 tooltip 제목에 “(진행 중)”을 붙인다. Chart 위 caption 한 줄이 흐린 막대의 의미를 설명한다. 값과 합계는 바꾸지 않는다(S020).
- 전년 동월 대비 chart에서 이번 달 이후의 달은 `null`이며 data label을 붙이지 않는다. 실제 증감 0은 `₩ 0`으로 표시한다. Helper와 회귀 테스트는 [`dividendChartData.js`](../../src/utils/dividendChartData.js)와 [`dividendChartData.test.js`](../../src/utils/dividendChartData.test.js)다.
- 막대마다 색이 다른 단일 series chart(계좌별 합계, 전년 동월 대비)는 Chart.js legend를 숨긴다. 한 개의 swatch가 첫 막대 색만 보여 의미를 잘못 전달했기 때문이다.

### Manual-entry local date

- 초기 지급일과 성공적인 등록 후 reset 지급일은 사용자의 local calendar date다.
- “오늘”을 `toISOString().slice(0, 10)`으로 만들지 않는다. KST 00:00–08:59에는 UTC 날짜가 전날일 수 있다.
- 회귀 테스트는 production formatter를 복제해 expected value를 계산하지 않는다. timezone 차이가 드러나는 고정 시각과 독립된 literal 결과를 사용하고 submit 후 실제 date input 값을 확인한다.

### Notification center

- Header notifications include verified official distribution rows payable today, tomorrow, or the following local calendar date. Eligibility remains limited to ETF tickers found in recent user dividend history and verified as ETFs.
- Actual receipts are joined by exact payment date and same direct ticker, or by the existing unique confirmed high-confidence name resolver. Show each account receipt on its own line, then total valid amounts separately per currency; never combine ledger receipts with official per-share distributions. Missing/invalid amounts or currencies make the total explicitly incomplete. Missing ledger records mean unregistered, not non-payment; multiple official events on one ticker/date do not duplicate receipts.
- Duplicate issuer schedules are collapsed. Amounts are shown in the issuer's currency per share, with a direct issuer-source link; do not imply account-level or portfolio totals.
- Loading, official-data failures, and sync-status warnings are distinct. A failed query must not be presented as an authoritative empty schedule list.
- Implementation and tests: `src/utils/threeDayScheduledNotifications.js` and its test; source data comes from `useDividendData`.

### Dividend calendar receipt share estimates

- Actual user-entered receipts remain the ledger source of truth; verified official ETF schedules are read-only reference data and remain separate calendar events and totals.
- An actual receipt shows an approximate whole-share estimate only when exactly one verified official schedule matches the same ticker, exact payment date, and currency. The estimate is `round(actual receipt amount / official distribution per share)` and displays the per-share basis.
- Missing, ambiguous, invalid, or currency-incompatible schedule matches produce no estimate. The UI notes that taxes and fees can make an actual receipt differ from the gross per-share schedule.
- The visible official schedule window remains this month and next month. For historical actual receipts, the data hook separately fetches official rows for exact past payment dates of candidate ETF tickers; those rows are used as estimate inputs but are not shown as past scheduled events.
- The feature is presentation-only and does not change `dividend_entries` or actual-receipt totals. Regression tests cover exact match, ambiguous matches, currency mismatch, historical lookup, and rendered estimate/caveat: `src/utils/dividendCalendarEvents.test.js`, `src/hooks/useDividendData.test.js`, and `src/components/DividendCalendar.test.jsx`.

### Dividend data monthly view

- The dividend data table opens at the current local calendar month and queries `payment_date >= month start` and `< next month start`, keeping rows from adjacent months out of the view.
- Top-level previous/next month controls move the selected month and reset within-month pagination to page 1; an empty month remains navigable and shows the normal empty state.
- Page size defaults to all rows in the selected month. The exact-count query fetches the full month in 500-row ranges with `id` as a stable tie-breaker; users can opt into 10, 25, or 50 rows per page for server-side pagination within that month.
- Changing month, page, filter, or sort discards stale asynchronous responses. A rejected ledger query ends loading and shows an error; a rejected official-link lookup warns while preserving the ledger rows.
- This is a read-only view of user-entered `dividend_entries`; month navigation and presentation do not write or alter ledger rows.
- Regression tests cover current-month bounds, year rollover, previous/next navigation, all-row loading across multiple server ranges, numeric paging, stale-response suppression, query rejection, and link-metadata failure in `src/components/DividendData.test.jsx`.

### Mobile shell

- Mobile layout은 `header / minmax(0, 1fr) main / bottom navigation`의 세 grid row를 사용한다.
- `main`만 세로 scroll container이며 bottom navigation은 fixed overlay가 아니라 별도 row다.
- bottom safe-area inset을 포함하고 375px에서 body horizontal overflow, chart/card overflow, navigation overlap이 없어야 한다.
- Desktop sidebar와 mobile bottom navigation은 `aria-label="주 메뉴"`인 `nav` landmark이며, 현재 화면 버튼에 `aria-current="page"`를 둔다. 수동·화면 캡처·텍스트 입력 화면은 모두 `입력`을 현재 화면으로 표시한다. Mobile header의 icon-only 테마·로그아웃 버튼은 accessible name을 가진다. Shell style은 [`App.css`](../../src/styles/App.css)의 `.app-*` class에 있고 회귀 테스트는 [`Layout.test.jsx`](../../src/components/Layout.test.jsx)다.
- 7개 bottom navigation item은 375px에서 일부 한국어 label이 두 줄로 줄바꿈된다. 변경 전후 동일한 기존 상태이며 [Known gaps](./known-gaps.md)에서 추적한다.

### Motion and action feedback

- 원격 저장 버튼은 [`ActionButton`](../../src/components/ActionButton.jsx)과 `useActionStatus`로 누른 자리에서 처리 중(비활성, `aria-busy`)과 완료(1.6초)를 보여준다. 결과 확인용 `alert()`은 쓰지 않는다. 수동 등록 실패는 입력값을 유지한 채 오류 status message로 알린다(S023).
- 입력 방식 탭과 통화 선택은 [`SegmentedControl`](../../src/components/SegmentedControl.jsx), 배당금 재투자는 `role="switch"`인 [`ToggleSwitch`](../../src/components/ToggleSwitch.jsx)다.
- 움직임은 `--motion-fast`/`--motion-base` token과 transform·opacity 위주이며, `prefers-reduced-motion: reduce`에서는 전역 rule로 거의 0이 된다. 상태는 label, `aria-pressed`, `aria-checked`만으로도 읽혀야 한다.
- 상태 사이를 애니메이션하는 component는 변경 중에도 mount가 유지되어야 한다. `App.jsx`의 입력 영역은 내부 component가 아니라 element로 렌더링한다.

### Theme and design tokens

- 색은 [`DESIGN.md`](../../DESIGN.md)와 [`App.css`](../../src/styles/App.css)의 token만 사용한다. Light 값은 `:root`, dark 값은 `body.dark-mode`에 있고 [`ThemeContext.jsx`](../../src/context/ThemeContext.jsx)는 class만 전환한다. Body에 inline 색을 쓰지 않는다.
- Light 전용 literal(`#fff`, `#f5f5f5`, `#f8f9fa`)은 dark mode에서 흰 block과 저대비 text를 만든다. 표 header·inset block은 `--bg-primary`, 입력·내부 block은 `--bg-secondary`를 쓴다.
- Chart.js canvas는 `var(--…)`를 해석하지 못하고 기본색으로 그린다. Chart 색은 `useChartTheme()`와 [`chartTheme.js`](../../src/utils/chartTheme.js)에서 가져오며 [`chartTheme.test.js`](../../src/utils/chartTheme.test.js)가 CSS token과의 일치를 검사한다.
- Sector doughnut과 Top-10 종목 chart도 [`chartPalette.js`](../../src/utils/chartPalette.js)를 쓴다. 8개를 넘는 category는 색이 순서대로 반복된다.
- Success/error message는 `.status-message`와 `.status-message.is-error`(`role="status"`)를 쓴다. jsdom은 inline `color`의 `var()`를 버리므로 증감 색을 검증해야 하는 곳은 `.text-gain`/`.text-loss`/`.text-unchanged` class를 쓴다.
- Focus ring은 전역 `:focus-visible` rule이 그린다. Inline `outline: none`을 두지 않는다.
- 버튼은 `.btn`과 variant·size class로만 꾸민다(S024). 흰 글자가 올라가는 채움은 `--accent-strong`을 쓰며 `--accent-color` 위에 흰 글자를 두지 않는다. 연도별 chart의 DOM legend와 데이터 표의 정렬 header는 의도적으로 제외한다.

### KPI and annual-chart behavior

- 월 평균 KPI는 올해 1월부터 현재 월까지와 작년 같은 기간을 같은 month denominator로 비교한다.
- KPI title과 prior-period label은 모두 같은 1월~현재 월 범위를 표시해 계산 기간과 화면 문구를 일치시킨다.
- 비교값은 명시적인 `▲`/`▼` 방향, percentage, formatted prior KRW amount를 제공하고 shared `KPICard`의 typography를 유지한다. 증감 색은 한국 증시 관례를 따라 증가는 빨강(`--gain`)과 ▲, 감소는 파랑(`--loss`)과 ▼, 변화 0은 회색에 방향 표시 없이 보여준다. 전년 동월 대비 chart도 같은 색을 chart theme에서 가져온다(S022).
- 비교 가능한 prior-period total이 없으면 변화율, 방향, prior amount를 포함한 comparison row 전체를 숨긴다.
- 연도별 chart의 palette, legend, tooltip, canvas accessible name은 375, 768, desktop에서 의미를 유지해야 한다.

## Reusable QA workflow

1. 검증 시작 시 branch 이름만 기록하지 말고 exact commit SHA를 고정한다. QA 중 branch가 이동하면 결과를 새 SHA에서 다시 확인한다.
2. 인증 뒤 surface는 실제 authenticated browser state에서 연다. Login gate capture를 dashboard mobile QA로 대체하지 않는다.
3. Desktop full-page와 viewport capture, 375px mobile capture를 함께 만든다. 필요한 경우 768px intermediate viewport도 포함한다.
4. `document.documentElement.scrollWidth`, card/canvas bounding boxes, bottom-nav bounds를 기록한다.
5. CJK label wrapping, tooltip headroom, data-label collision, legend wrapping, focus/keyboard state를 직접 확인한다.
6. Build와 test를 실행하되 visual PASS는 fresh browser evidence와 source trace가 함께 있을 때만 선언한다.
7. Screenshot, geometry, report가 같은 SHA와 build를 가리키는지 freshness를 확인한다.

## Historical failure modes

- UTC ISO date와 같은 알고리즘으로 expected value를 만든 tautological test는 local-date defect를 숨겼다.
- Fixed bottom navigation은 body width가 정상이어도 chart 위를 가릴 수 있었다. Full-page visual inspection이 geometry-only check의 빈틈을 발견했다.
- Concurrent branch amend로 QA 대상 SHA가 바뀐 사례가 있었다. 결과는 목적이 아니라 artifact revision에 귀속해야 한다.
- Unauthenticated 375px screenshot은 authenticated product shell의 no-overlay 근거가 될 수 없었다.
- `App.jsx`가 입력 영역을 render마다 새로 정의되는 내부 component로 만들고 있어, 탭을 바꿀 때마다 subtree 전체가 remount되었다. 이 상태에서는 CSS transition이 일어나지 않으므로 S023에서 element로 바꿨다.
- Lucide spinner에 Tailwind의 `animate-spin` class를 썼지만 Tailwind가 없어 회전하지 않았다. S023에서 `icon-spin`으로 바꿨다.
- Simulator chart가 Chart.js에 `var(--accent-color)`를 넘겨 dark mode에서 선이 검은색으로 거의 보이지 않았다. Unit test로는 드러나지 않았고 dark-mode capture에서 확인됐다(S019).

## Risks

- 과거 Issue 16과 Issue 17 capture는 focused target 밖의 일부 dashboard chart에서 label collision 가능성을 기록했다. 현재 상태는 fresh authenticated full-dashboard capture로 재검증해야 한다.
- UI screenshot에 실제 email, 계좌 또는 배당 데이터가 표시될 수 있다. 영구 Wiki에는 이미지나 값을 복사하지 않고 sanitized 결과만 남긴다.

## Related

- [Overview](./overview.md)
- [Application architecture](./architecture.md)
- [Data model](./data-model.md)
- [Authentication UX](./authentication-ux.md)
- [Known gaps](./known-gaps.md)
- [Wiki log](./log.md)

## Sources

- [S019 Design token consistency](../raw/2026-11-14-design-token-consistency.md)
- [S020 Chart period and label fixes](../raw/2026-11-14-chart-period-fixes.md)
- [S021 Chart readability](../raw/2026-11-14-chart-readability.md)
- [S022 Gain and loss colors](../raw/2026-11-14-gain-loss-colors.md)
- [S023 Motion feedback](../raw/2026-11-14-motion-feedback.md)
- [S024 Button system](../raw/2026-11-16-button-system.md)
- [`src/components/ActionButton.test.jsx`](../../src/components/ActionButton.test.jsx)
- [`src/components/KPICard.test.jsx`](../../src/components/KPICard.test.jsx)
- [`src/components/PortfolioAnalysis.test.jsx`](../../src/components/PortfolioAnalysis.test.jsx)
- [`src/utils/dividendChartData.js`](../../src/utils/dividendChartData.js)
- [`src/utils/dividendChartData.test.js`](../../src/utils/dividendChartData.test.js)
- [`DESIGN.md`](../../DESIGN.md)
- [`src/styles/App.css`](../../src/styles/App.css)
- [`src/context/ThemeContext.jsx`](../../src/context/ThemeContext.jsx)
- [`src/utils/chartTheme.js`](../../src/utils/chartTheme.js)
- [`src/utils/chartTheme.test.js`](../../src/utils/chartTheme.test.js)
- [`src/components/Layout.test.jsx`](../../src/components/Layout.test.jsx)
- [S007 OMO UI and QA evidence](../raw/2026-08-23-omo-ui-qa-evidence.md)
- [S015 Dividend Calendar Estimated Holding Count](../raw/2026-11-13-dividend-calendar-estimated-shares.md)
- [S017 Monthly Dividend Data Navigation](../raw/2026-11-13-dividend-data-month-navigation.md)
- [S018 Monthly Dividend Data Navigation Review Remediation](../raw/2026-11-13-dividend-data-month-navigation-review.md)
- [`src/utils/dividendCalendarEvents.js`](../../src/utils/dividendCalendarEvents.js)
- [`src/utils/dividendCalendarEvents.test.js`](../../src/utils/dividendCalendarEvents.test.js)
- [`src/hooks/useDividendData.js`](../../src/hooks/useDividendData.js)
- [`src/hooks/useDividendData.test.js`](../../src/hooks/useDividendData.test.js)
- [`src/components/DividendCalendar.jsx`](../../src/components/DividendCalendar.jsx)
- [`src/components/DividendCalendar.test.jsx`](../../src/components/DividendCalendar.test.jsx)
- [`src/components/DividendData.jsx`](../../src/components/DividendData.jsx)
- [`src/components/DividendData.test.jsx`](../../src/components/DividendData.test.jsx)
- [`src/components/DividendChart.jsx`](../../src/components/DividendChart.jsx)
- [`src/components/DividendForm.jsx`](../../src/components/DividendForm.jsx)
- [`src/components/DividendForm.test.jsx`](../../src/components/DividendForm.test.jsx)
- [`src/components/Layout.jsx`](../../src/components/Layout.jsx)
- [`src/components/PortfolioAnalysis.jsx`](../../src/components/PortfolioAnalysis.jsx)
- [`src/utils/chartPalette.js`](../../src/utils/chartPalette.js)
