---
title: Authentication UX and Password Recovery
type: workflow
status: needs-review
updated: 2026-08-23
source_refs: [S002, S008]
tags: [auth, password-recovery, account-settings, responsive, prototype]
---

# Authentication UX and Password Recovery

## Current main behavior

Current [`AuthGate.jsx`](../../src/components/AuthGate.jsx)는 unauthenticated user에게 sign-in과 sign-up만 제공한다. [`AuthContext.jsx`](../../src/context/AuthContext.jsx)는 session 조회·구독과 sign-in, sign-up, sign-out을 제공한다.

Password-reset request, recovery link handling, password update, authenticated account settings는 current `main`에 없다.

## Unmerged prototype

`.omo/evidence/password-auth/`와 branch `agent/password-reset`은 다음 UX를 구현·검토한 prototype 기록이다.

- Login에서 password-reset request로 이동
- Account existence를 노출하지 않는 reset-request status message
- Supabase `PASSWORD_RECOVERY` event를 사용한 recovery mode
- 새 password와 confirmation의 길이·일치 validation
- Recovery 성공 후 application으로 복귀
- Authenticated account settings에서 login identity 확인과 password 변경
- 375px mobile, 768px tablet, desktop/wide layout intent

Prototype commit `6ac37bc436e3428f37f8aeeacf1140fe4f067d4b`과 branch head `b79ecb108fa81883a0096f515664fc4d069db496`는 current `main`의 ancestor가 아니다. 이 페이지는 shipped behavior가 아니라 재구현 가능한 설계 지식이다.

## Adoption acceptance criteria

### Functional

- Reset request는 Supabase `resetPasswordForEmail`을 호출하고 production origin으로 안전하게 복귀한다.
- Recovery link 진입은 `PASSWORD_RECOVERY` state를 감지하고 일반 authenticated dashboard보다 password form을 우선 표시한다.
- Password update는 최소 길이와 confirmation 일치를 client에서 확인하고 Supabase 결과를 사용자에게 표시한다.
- Signed-in account settings는 현재 login identity를 read-only로 표시하고 dashboard로 돌아가는 명확한 action을 제공한다.

### Security and privacy

- Reset request 결과는 account 존재 여부를 구분하지 않는 동일한 message를 사용한다.
- Email, password, recovery token·fragment, session 값을 log, screenshot filename, Wiki에 기록하지 않는다.
- Exact production alias가 Supabase redirect allowlist에 등록됐는지 확인한다.
- Expired, malformed, reused recovery link와 signed-out update attempt를 실제 browser flow로 검증한다.

### Responsive and accessible

- 375, 768, desktop에서 form이 viewport 안에 들어가며 horizontal overflow가 없어야 한다.
- Mobile account page는 header와 bottom navigation 사이의 scrollable main에 배치한다.
- Status는 `role=status`, validation failure는 `role=alert`처럼 screen-reader에 전달한다.
- Keyboard focus order, submit disabled state, success/error transition을 확인한다.

## Evidence boundary

Screenshot은 visual intent만 증명한다. 실제 email delivery, redirect allowlist, recovery event, session continuity, update result는 fresh end-to-end runtime evidence가 필요하다. Old branch를 current main에 그대로 merge하지 말고 current auth, layout, account master, security policy에 맞춰 재검토한다.

## Related

- [Application architecture](./architecture.md)
- [UI behavior and QA](./ui-quality-and-behavior.md)
- [Deployment and security](./deployment-and-security.md)
- [Known gaps](./known-gaps.md)

## Sources

- [S008 OMO password and account UX prototype](../raw/2026-08-23-omo-password-auth-evidence.md)
- [`src/components/AuthGate.jsx`](../../src/components/AuthGate.jsx)
- [`src/context/AuthContext.jsx`](../../src/context/AuthContext.jsx)
- Prototype commit `6ac37bc436e3428f37f8aeeacf1140fe4f067d4b`
