---
title: UI Behavior and QA Invariants
type: workflow
status: current
updated: 2026-08-23
source_refs: [S002, S007]
tags: [ui, charts, responsive, qa, accessibility]
---

# UI Behavior and QA Invariants

이 페이지는 과거 `.omo/evidence/`의 중간·최종 QA 결과에서 재사용할 사용자 동작과 검증 규칙을 종합한다. 스크린샷은 point-in-time evidence이므로 현재 코드와 fresh runtime을 함께 확인한다.

## Current behavior invariants

### Dashboard charts

- 전년 동월 비교 chart는 y-axis 내부에 추가 headroom을 두어 최고 막대, data label, tooltip이 chart 상단과 충돌하지 않아야 한다. 현재 [`DividendChart.jsx`](../../src/components/DividendChart.jsx)는 해당 chart에 `20%` grace를 적용한다.
- 종목별 배당금은 순위와 긴 한국어 종목명을 읽을 수 있는 가로 Top-10 bar chart다. label truncation, 오른쪽 금액 label 공간, tooltip을 함께 확인한다.
- 연도별 합계는 정렬된 year index와 [`chartPalette.js`](../../src/utils/chartPalette.js)의 동일한 color mapping을 사용한다. DOM legend button은 hidden state와 접근 가능한 action name을 동기화해야 한다.
- Portfolio sector doughnut은 고정 최대 크기와 responsive width를 가진 wrapper 안에 있어야 하며 card 밖으로 넘치지 않아야 한다.

### Manual-entry local date

- 초기 지급일과 성공적인 등록 후 reset 지급일은 사용자의 local calendar date다.
- “오늘”을 `toISOString().slice(0, 10)`으로 만들지 않는다. KST 00:00–08:59에는 UTC 날짜가 전날일 수 있다.
- 회귀 테스트는 production formatter를 복제해 expected value를 계산하지 않는다. timezone 차이가 드러나는 고정 시각과 독립된 literal 결과를 사용하고 submit 후 실제 date input 값을 확인한다.

### Mobile shell

- Mobile layout은 `header / minmax(0, 1fr) main / bottom navigation`의 세 grid row를 사용한다.
- `main`만 세로 scroll container이며 bottom navigation은 fixed overlay가 아니라 별도 row다.
- bottom safe-area inset을 포함하고 375px에서 body horizontal overflow, chart/card overflow, navigation overlap이 없어야 한다.

### KPI and annual-chart behavior

- 월 평균 KPI는 올해 1월부터 현재 월까지와 작년 같은 기간을 같은 month denominator로 비교한다.
- KPI title과 prior-period label은 모두 같은 1월~현재 월 범위를 표시해 계산 기간과 화면 문구를 일치시킨다.
- 비교값은 명시적인 `▲`/`▼` 방향, percentage, formatted prior KRW amount를 제공하고 shared `KPICard`의 typography와 positive/negative color rule을 유지한다.
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

## Risks

- 과거 Issue 16과 Issue 17 capture는 focused target 밖의 일부 dashboard chart에서 label collision 가능성을 기록했다. 현재 상태는 fresh authenticated full-dashboard capture로 재검증해야 한다.
- UI screenshot에 실제 email, 계좌 또는 배당 데이터가 표시될 수 있다. 영구 Wiki에는 이미지나 값을 복사하지 않고 sanitized 결과만 남긴다.

## Related

- [Overview](./overview.md)
- [Application architecture](./architecture.md)
- [Authentication UX](./authentication-ux.md)
- [Known gaps](./known-gaps.md)
- [Wiki log](./log.md)

## Sources

- [S007 OMO UI and QA evidence](../raw/2026-08-23-omo-ui-qa-evidence.md)
- [`src/components/DividendChart.jsx`](../../src/components/DividendChart.jsx)
- [`src/components/DividendForm.jsx`](../../src/components/DividendForm.jsx)
- [`src/components/DividendForm.test.jsx`](../../src/components/DividendForm.test.jsx)
- [`src/components/Layout.jsx`](../../src/components/Layout.jsx)
- [`src/components/PortfolioAnalysis.jsx`](../../src/components/PortfolioAnalysis.jsx)
- [`src/utils/chartPalette.js`](../../src/utils/chartPalette.js)
