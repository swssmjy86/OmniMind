# 4탭 IA 2단계 — 총운 풀이 · readings 캐싱 · readingAccess 설계

> 작성 2026-07-19. `2026-07-18-omnimind-4tab-ia.md` §6의 2단계를 상세화한다.
> 근거: P9 설계서 §5.1(엿보기·블러), §6.1~6.3(데이터 모델·캐싱·접근 규칙), §2.2(티어).
> **무료 상품(총운)으로 열람·캐싱·잠금 파이프라인을 결제 없이 검증**하고, 3단계 크레딧은
> 검증된 구조 위에 얹는다(P9 §10의 핵심 전략 그대로).

## 1. 범위

| 항목 | 내용 |
|---|---|
| 접근 규칙 | `readingAccess(product, state)` — **`consult/quota.ts`에 추가**(새 모듈 금지, P9 §6.3) |
| 데이터 | `readings` 테이블(마이그레이션 0010 — P9 §6.1의 readings만, reading_reviews는 4단계) |
| 캐싱 | 같은 입력 → 저장본 반환·재생성 없음. `input_hash` + `context_version`(P9 §6.2) |
| 화면 | `/saju/chongun` — 비로그인 엿보기(잠김) / 로그인+프로필 전체 풀이 |
| 카탈로그 | `chongun.href: "/me" → "/saju/chongun"` |

## 2. 접근 규칙 (`readingAccess`)

```ts
type ReadingProduct = "chongun" | "career" | "love" | "wealth" | "match" | "marriage";
interface ReadingUserState { loggedIn: boolean; credits: number; premiumUntil?: string | null; now: Date }
interface ReadingAccess { allowed: boolean; lockReason: "login" | "credit" | null; consumesCredit: boolean }
```

판정 순서(전 상품 공통 — 3단계가 그대로 쓴다):
1. 비로그인 → `{ allowed: false, lockReason: "login" }` (심층은 "로그인하면 무료" 훅 — P9 §2.2)
2. `chongun` → 로그인이면 무료 허용
3. 크레딧 상품: 레거시 프리미엄(`premium_until` 미래) → 허용·차감 없음(무제한 유지) → 크레딧 > 0 → 허용·`consumesCredit: true` → 아니면 `{ allowed: false, lockReason: "credit" }`

프로필 없음은 접근 규칙 차원이 아니라 화면이 온보딩으로 유도한다(계산 입력 부재).
**크레딧 차감 실행은 3단계** — 2단계에서 `consumesCredit`는 판정만 존재한다.

## 3. `readings` 캐싱

- 마이그레이션 `0010_stage2_readings.sql`: P9 §6.1의 `readings` 테이블 그대로 + RLS
  본인 행만 select/insert.
- `input_hash` = sha256(canonical JSON of `{ v: PROFILE_CONTEXT_VERSION, ctx: profile_context, season: 현재 대운 간지 | "none" }`).
  대운 간지를 포함하는 이유: 총운의 '운의 계절' 섹션은 대운이 바뀌면 내용이 바뀐다 —
  경계를 넘으면 해시가 달라져 자연 재생성된다.
- 조회: `(user_id, product, input_hash)` 일치 **및** `context_version >= PROFILE_CONTEXT_VERSION`
  → 저장본 반환(생성 0회). 불일치 → 새로 조립해 insert(P9 §6.2).
- 쓰기는 사용자 세션(RLS insert own) — admin 불필요.

## 4. 총운 본문 (`assembleChongun`)

`src/lib/interpret/content/chongun.ts` — 순수 조립(LLM 없음, 템플릿 항상 동작):

```ts
assembleChongun(ctx: ProfileContext, nickname: string, age: number | null): InterpretationSection[]
```

- 기존 `assembleProfile(ctx, nickname)` 섹션 전부(해석 축 위계 §3 준수 — 이미 검증된 구현)
- - '운의 계절' 섹션: `currentDaeun(ctx.daeun, age)` + `daeunSeasonText` — `/me`와 동일한
  3분기(진행 중 대운 / 첫 대운 이전 / 성별 미상) 문구를 섹션으로 담는다.
- 페르소나 인사(서온 greeting)는 **캐시에 넣지 않는다** — 표현 계층은 화면이 렌더(P9 §2.3).

## 5. 화면 (`/saju/chongun`, 서온)

| 상태 | 내용 |
|---|---|
| 비로그인 | 서온 인사 + **엿보기 4장**(타고난 그릇 · 오행의 풍경 · 재능의 흐름 · 운의 계절 — 제목+한 줄 소개 공개, 본문은 **서버 비노출** 자리표시자) + CTA "로그인하고 무료로 열람" |
| 로그인·프로필 없음 | 서온 인사 + 온보딩 유도 |
| 로그인+프로필 | 서온 인사 + `SajuChart` + 캐시 경유 섹션 렌더 + `/me` 링크 |

엿보기 티저 문구는 일반 소개(개인화 아님 — 비로그인은 프로필이 없어 개인화 티저 자체가
불가능하다). 블러는 `teaser-bar` 자리표시자 재사용.

## 6. 테스트 (P9 §11 대응)

- `readingAccess`: 티어(비로그인/로그인) × 상품 6종 × 크레딧 유/무 × 레거시 프리미엄 전수
- `input_hash`: 같은 입력 → 같은 해시 / ctx·version·대운 간지 변화 → 다른 해시
- `assembleChongun`: assembleProfile 섹션 포함 + 운의 계절 3분기 + 톤 가드 + 팔자 문장이 보조 문장보다 앞(§3.2 — assembleProfile이 보장, 회귀 확인)
- 엿보기: 비로그인 응답에 본문 **부재**(제목·소개만) — 컴포넌트 테스트
- 캐싱 DB 경로는 수동 스모크(같은 프로필 재방문 → created_at 불변)

## 7. 비목표

- 크레딧 차감 실행·유료 LLM(3단계) / 후기(4단계) / LLM 개인화 문단(기존 프로필 캐시와 별개 — 추후)
- `/me` 개편(유지 — 총운과 공존, 프로필 관리·공유 성격)
