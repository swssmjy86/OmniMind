# P4 수동 설정 가이드 (🖐️ 사용자 액션)

> 코드는 전부 준비됨. 아래 항목은 계정·콘솔 작업이라 사용자가 직접 실행해야 한다.
> 완료할 때마다 체크하고, 전부 끝나면 P4 완료 기준(공유 카드 경유 신규 가입 추적)이 온전히 동작한다.

## 1. Supabase 마이그레이션 실행 (P2·P5·P4 공통 선행)

Supabase 대시보드 → SQL Editor에서 순서대로 Run:

- [ ] `supabase/migrations/0001_p2_profiles.sql` — 프로필·해석 저장 (P2 영속화 활성)
- [ ] `supabase/migrations/0002_p5_chat.sql` — 챗 기억·하루 10회 제한 (P5 활성)
- [ ] `supabase/migrations/0003_p4_events.sql` — 성장 지표 events (P4-5 활성)
- [ ] `supabase/migrations/0004_p7_premium.sql` — 프리미엄 `premium_until` 컬럼 (P7 챗 무제한 게이트)

## 2. 카카오톡 채널 알림 (P4-3, 수동 운영)

- [ ] [카카오톡 채널 관리자센터](https://center-pf.kakao.com)에서 채널 개설 (채널명: 옴니마인드)
- [ ] 프로필 링크에 서비스 URL 등록: https://omni-mind-i6uj.vercel.app

**발송 절제 규칙 (설계 §6.3):** 하루 1회 아침(08~10시)만 · 밤 발송 금지 · 재촉 금지.

**아침 발송 문안 템플릿 (톤 가드 통과, 로테이션):**

1. ☀️ 좋은 아침이에요. 오늘의 기운이 도착했어요 — 잠깐 들여다볼까요?
2. 오늘은 어떤 하루가 기다리고 있을까요? 당신의 오늘 이야기가 준비됐어요.
3. 새로운 하루가 시작됐어요. 오늘의 색과 마음가짐을 살짝 확인해볼까요?

> 링크는 `https://omni-mind-i6uj.vercel.app/?ref=channel` 로 — 채널 유입도 지표에 잡힌다.

(선택) PWA 웹푸시는 카카오 채널 운영이 자리 잡은 뒤 검토 — 로드맵 P4-3 Step 2.

## 3. 카카오 AdFit 광고 (P4-4)

- [ ] [AdFit](https://adfit.kakao.com) 가입 → 매체 등록(모바일 웹) → 배너 광고 단위(320×100) 발급
- [ ] Vercel 프로젝트 → Settings → Environment Variables에 `NEXT_PUBLIC_ADFIT_UNIT=<광고단위ID>` 추가 후 재배포

광고 슬롯(`src/components/ads/AdSlot.tsx`)은 홈 최하단에만 붙어 있고, env 미설정이면 아무것도 렌더하지 않는다.

## 4. Vercel Analytics (P4-5)

- [ ] Vercel 대시보드 → 프로젝트 → Analytics 탭 → Enable (무료 티어)

코드(`@vercel/analytics`)는 이미 부착됨. 활성화하면 페이지뷰·재방문이 잡힌다.

## 5. (선택) Gemini API 키 (P5 LLM 개인화)

- [ ] Google AI Studio에서 무료 키 발급 → Vercel env `GEMINI_API_KEY` 추가

없어도 챗은 템플릿 폴백으로 완전 동작한다.

## 확인 방법 (전부 적용 후)

1. 프로필 화면에서 '나의 조각 카드 만들기' → 카드 생성·공유
2. 시크릿 창에서 공유 링크(`?ref=card&via=profile`) 접속 → 온보딩 완료
3. Supabase `events` 테이블에 `onboard_complete` 행의 `props.ref = "card"` 확인 → **P4 완료 기준 충족**
