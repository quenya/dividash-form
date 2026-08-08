---
title: Dividend Input Pipelines
type: workflow
status: current
updated: 2026-08-06
source_refs: [S002]
tags: [manual, ocr, text-parsing, confidence]
---

# Dividend Input Pipelines

세 입력 방식은 서로 다른 추출 단계를 거치지만 최종적으로 [`insertDividend.js`](../../src/api/insertDividend.js)에 수렴한다.

| Mode | Entry | Extraction | Stored provenance |
|---|---|---|---|
| Manual | `DividendForm` | 사용자가 필드를 직접 작성 | `manual`, confidence 없음 |
| OCR | `OCRUpload` | Google Vision 또는 mock data 후 한국 배당 문구 parsing | `ocr`, 추출 confidence |
| Text | `TextAnalysis` | 현재는 외부 LLM이 아니라 로컬 정규식 parsing | `llm`, parsing confidence |

## Manual

[`DividendForm.jsx`](../../src/components/DividendForm.jsx)는 과거 row에서 회사명과 계좌명을 가져와 입력을 보조한다. Submit 시 공통 insert service를 사용하고 성공 후 최근 내역을 다시 읽는다.

## OCR

[`ocrService.js`](../../src/api/ocrService.js)는 Google Vision `TEXT_DETECTION` 요청과 한국 증권사 텍스트 parsing을 구현한다. 하지만 Google project ID가 없으면 즉시 mock data를 반환하며, ID가 있어도 현재 `getGoogleCloudApiKey()`가 server-side 인증 필요 오류를 발생시켜 catch에서 mock으로 fallback한다.

따라서 현재 OCR 화면의 성공이 실제 Vision 호출 성공을 의미하지 않는다. production OCR을 주장하려면 network response와 추출 결과를 별도로 검증해야 한다.

## Text

[`llmService.js`](../../src/api/llmService.js)의 공개 함수는 `fallbackTextParsing`을 직접 호출한다. 파일명과 UI의 `LLM` 표시는 product label이지만 현재 구현에는 OpenAI 또는 다른 LLM network request가 없다.

Parser는 증권사명, ETF·종목명, 금액, 통화, 날짜, 계좌번호, 계좌 유형을 정규식으로 추출하고 발견한 필드 비율에 따라 confidence를 계산한다.

## Shared persistence

공통 insert service는 로그인 user를 요구하고 다음 규칙을 적용한다.

- `user_id`는 UI payload가 아니라 현재 Supabase user에서 가져온다.
- 누락된 통화는 `KRW`, 누락된 method는 `manual`을 사용한다.
- OCR과 text 화면은 추출 confidence를 `confidence_score`로 매핑한다.
- 최종 격리는 database RLS가 집행한다.

## Related

- [Architecture](./architecture.md)
- [Data model](./data-model.md)
- [Known gaps](./known-gaps.md)

## Sources

- [S002 repository baseline](../raw/sources.md)
- [`src/components/DividendForm.jsx`](../../src/components/DividendForm.jsx)
- [`src/api/ocrService.js`](../../src/api/ocrService.js)
- [`src/api/llmService.js`](../../src/api/llmService.js)
- [`src/api/insertDividend.js`](../../src/api/insertDividend.js)
