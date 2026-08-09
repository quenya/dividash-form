---
title: DiviDash Overview
type: overview
status: current
updated: 2026-08-09
source_refs: [S002, S005]
tags: [product, navigation, react]
---

# DiviDash Overview

DiviDash는 인증된 사용자가 배당금 내역을 입력하고, 월·연·계좌·종목 단위로 분석하며, 목표와 장기 시뮬레이션을 관리하는 React 기반 대시보드다.

## User surfaces

[`Layout.jsx`](../../src/components/Layout.jsx)는 여섯 개의 상위 navigation surface를 제공한다.

1. 대시보드: KPI와 월별·연도별·계좌별·종목별 시각화. 올해 누적 KPI의 전년 비교는 작년 같은 월까지의 누적값을 사용한다.
2. 캘린더: 지급일 중심의 배당 내역 탐색
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

## Related

- [Architecture](./architecture.md)
- [Data model](./data-model.md)
- [Input pipelines](./input-pipelines.md)
- [Known gaps](./known-gaps.md)

## Sources

- [S002 repository baseline](../raw/sources.md)
- [`src/App.jsx`](../../src/App.jsx)
- [`src/components/Layout.jsx`](../../src/components/Layout.jsx)
- [`README.md`](../../README.md)
