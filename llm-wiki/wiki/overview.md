---
title: DiviDash Overview
type: overview
status: current
updated: 2026-08-14
source_refs: [S002, S005, S006, S007]
tags: [product, navigation, react]
---

# DiviDash Overview

DiviDash는 인증된 사용자가 배당금 내역을 입력하고, 월·연·계좌·종목 단위로 분석하며, 목표와 장기 시뮬레이션을 관리하는 React 기반 대시보드다.

## User surfaces

[`Layout.jsx`](../../src/components/Layout.jsx)는 여섯 개의 상위 navigation surface를 제공한다.

1. 대시보드: KPI와 월별·연도별·계좌별·종목별 시각화. 올해 누적 KPI와 월 평균 KPI의 전년 비교는 작년 같은 월까지의 누적값과 그 기간의 월평균을 사용하며, 비교 가능한 전년 동기 값이 있을 때만 변화율과 금액을 표시한다.
2. 캘린더: 지급일 중심으로 실제 입금 내역과 이번 달 및 다음 달의 공식 예정 분배를 별도 이벤트로 탐색한다. 공식 분배액은 주당 공식 금액이며 사용자 보유 수량을 곱한 입금액이나 실제 입금 합계에 포함하지 않는다. 공식 이벤트는 최근 입금 이력의 직접 티커 또는 confirmed 이름 매칭과 ETF 유형이 확인된 eligible ticker, 공식 발행사·URL 근거, 조회 기간 내 payment date가 모두 필요하다. 데이터는 Supabase 공식 분배 내역 조회에 한정되며 미래 일정의 완전성·실제 입금을 보장하지 않는다.
3. 포트폴리오: ticker metadata와 배당 데이터를 결합한 섹터 분석
4. 시뮬레이터: 월 적립액, 예상 수익률, 배당 성장률, 재투자 설정 기반 장기 추정
5. 데이터: 저장된 배당 내역의 pagination 목록
6. 입력: manual, OCR, text 세 가지 방식

모든 surface는 [`AuthGate.jsx`](../../src/components/AuthGate.jsx) 뒤에 있으며 [`App.jsx`](../../src/App.jsx)가 theme, auth, page state를 조합한다.

## Product invariants

- 저장 작업은 로그인된 사용자를 요구한다.
- 금액은 KRW와 USD를 지원하고, 조회 화면은 외부 USD/KRW 환율 실패 시 기본값을 사용한다.
- 배당 row는 `input_method`와 선택적인 `confidence_score`로 유입 경로를 추적한다.
- 사용자별 데이터 격리는 client filter만이 아니라 Supabase RLS에 의존한다.
- 수동 입력 성공 후 지급일은 UTC date가 아니라 사용자의 local calendar date로 reset한다.
- Mobile shell은 header, scrollable main, bottom navigation을 별도 grid row로 유지해 navigation이 chart content를 덮지 않도록 한다.

## Related

- [Architecture](./architecture.md)
- [Data model](./data-model.md)
- [Input pipelines](./input-pipelines.md)
- [UI behavior and QA](./ui-quality-and-behavior.md)
- [Authentication UX](./authentication-ux.md)
- [Known gaps](./known-gaps.md)

## Sources

- [S002 repository baseline](../raw/sources.md)
- [`src/App.jsx`](../../src/App.jsx)
- [`src/components/Layout.jsx`](../../src/components/Layout.jsx)
- [`README.md`](../../README.md)
- [S005 YTD KPI comparison change](../raw/2026-08-09-kpi-ytd-comparison.md)
- [S006 YTD KPI display change](../raw/2026-08-10-kpi-ytd-display.md)
- [S007 OMO UI and QA evidence](../raw/2026-08-23-omo-ui-qa-evidence.md)
