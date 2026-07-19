# 4탭 IA 3단계 — 크레딧 풀이 5종 설계

> 작성 2026-07-19. `2026-07-18-omnimind-4tab-ia.md` §6의 3단계 상세화.
> 사용자 확정: **전 풀이 1크레딧**(1,000원, 재열람 무료), **구버전 프로필 재계산 트리거 포함**.
> 배포는 두 번에 나눈다 — **3a: 파이프라인 + 자기 프로필 4종**(직업·연애·재물·결혼),
> **3b: 궁합 심층**(상대 입력 필요 — 별도 플랜). 각각 독립 배포 가능.

## 1. 과금 파이프라인 (3a·3b 공통)

- 접근: 기존 `readingAccess`(2단계) 그대로 — 크레딧 상품은 로그인+크레딧>0(또는 레거시
  프리미엄 무제한)일 때 허용, `consumesCredit` 판정.
- **차감 실행(신규)**: 서버 액션 `unlockReading(product)` —
  ① 캐시 히트 → 차감 없이 반환(재열람 무료 약속 이행 — /terms §3·FAQ)
  ② 미스 → 템플릿 조립 → **유료 LLM**(`OpenRouterProvider({premium:true})`) 개인화 문단
  ③ LLM 성공 → readings 캐시 insert → `consume_consult_credit` RPC 차감(생성 성공 후 — P9 §12)
  ④ LLM 실패 → **차감·캐시 없이** 템플릿본 반환(사용자에게 실패를 보이지 않는다, 다음
  시도에서 재생성) — P9 §12 "유료 LLM 실패 → 크레딧을 차감하지 않는다"
- 크레딧 부족: 잠금 화면에 잔여 표시 + `/premium/credits` 충전 링크.
- 레거시 프리미엄: 차감 없이 열람(무제한 유지). LLM은 동일하게 프리미엄 모델.

## 2. 재계산 트리거 (사용자 확정 — 포함)

`src/lib/readings/ensure-profile.ts`:
- `engineInputFromProfile(row: ProfileRow): EngineInput` (순수 — birth_time "HH:mm:ss"→"HH:MM")
- `ensureCurrentProfile(supabase, row)`: `profile_context.version < PROFILE_CONTEXT_VERSION`이면
  `computeProfile` 재계산 → profiles 행 갱신(best-effort) → 최신 ctx 반환.
- 적용 지점: 총운(`/saju/chongun`)과 크레딧 풀이(유료 — 구버전 계산값 위 판매 금지).
  `/me`·데일리 적용은 후속(기록).

## 3. 자기 프로필 4종 본문 (3a — `content/credit-readings.ts`)

전 상품 공통 구조(해석 축 위계 §3 — ①~③ 팔자 주축, ④ 보조축 수식):

| # | 섹션 | 재료 |
|---|---|---|
| ① | 상품별 핵심 결 (직업=일의 결/연애=마음의 결/재물=재물의 결/결혼=함께의 결) | `dominantCategory(ctx.tenGods)` 5갈래 × 상품별 텍스트 표 (20종 신규 카피) |
| ② | 오행이 건네는 조언 | `ELEMENT_BALANCE_TEXT(ctx.elements)` 재사용 |
| ③ | 운의 계절 | 총운의 대운 문구 재사용(chongun.ts에서 body 추출 export) + 상품별 도입 한 줄 |
| ④ | 당신에게 드러나는 방식 | 상품별 MBTI E/I 수식(8종) + 혈액형 마무리 절(4종 공용) — `synthesisText` 패턴 |
| ⑤ | 당신만을 위한 이야기 | 유료 LLM 문단(생성 성공 시에만, 캐시에 포함) |

`assembleCareer/Love/Wealth/Marriage(ctx, nickname, age)` — 순수, 템플릿만으로 완전 동작.
보조지표 단독 결론 금지·문장 순서=위계(§3.2), 전 카피 톤 가드 테스트.

## 4. 화면 (3a — `/saju/[product]`, career·love·wealth·marriage)

동적 세그먼트 하나(무효 slug → 404). 페르소나: 직업=서온, 연애·결혼=홍연, 재물=금오.

| 상태 | 내용 |
|---|---|
| 비로그인 | 페르소나 인사 + 엿보기(섹션 제목 ①~⑤ + 자리표시자, 본문 서버 비노출) + "로그인하고 시작하기" |
| 로그인·프로필 없음 | 온보딩 유도 |
| 로그인+프로필, 캐시 있음 | 바로 전체 렌더(차감 없음) |
| 로그인+프로필, 캐시 없음 | 엿보기 + 잔여 크레딧 + **[크레딧 1개로 열기]** 버튼(서버 액션) / 크레딧 0 → 충전 링크 |

- 열람 결과는 액션 응답의 sections를 클라이언트가 렌더(LLM 실패 시 비캐시 템플릿본도 동일
  경로) — 재방문은 서버 캐시 히트 렌더.
- 카탈로그: career·love·wealth·marriage `status: "live"`, `href: "/saju/<id>"`.
- 캐시 키: 2단계와 동일 `readingInputHash(ctx, 대운간지)` — product 열로 구분.

## 5. 3b — 궁합 심층 (별도 플랜, 이 스펙의 범위 정의만)

- 기존 `computeDeepMatch`/`assembleDeepMatch`(초대 수락 흐름에서 검증됨) 재사용.
- `/saju/match-deep`: 상대 생년월일·시(모름 허용)·관계 모드 입력 → 1크레딧 잠금 해제.
- 캐시 키에 상대 입력·모드 포함(상대가 다르면 새 풀이=새 차감, 같은 상대 재열람 무료).
- 카탈로그 `match` 항목을 심층으로 연결(현재 href=/match 무료 궁합인 1단계 임시 상태 해소).
- 무료 `/match`는 유지(훅), 결과 하단에 심층 업셀.

## 6. 테스트 (3a)

- 조립 4종: 위계(①~③ 팔자 먼저·④ 보조 마지막), 카테고리 5갈래 전부 존재, 톤 가드 전 카피
- `engineInputFromProfile`: 시간 변환·timeUnknown·gender 매핑 / ensure: 최신 버전이면 무변환
- unlockReading: 순수 판정 부분은 readingAccess 기존 테스트가 커버 — 액션 자체는 수동 스모크
  (차감 1회·재열람 무차감·LLM 실패 시 무차감은 스모크 체크리스트로)
- ReadingPeek: 본문 비노출 / UnlockReading: 버튼·잔여·충전 링크 분기
- 카탈로그: 4종 live href 갱신 전수

## 7. 비목표

- 후기(4단계) / 상품별 가격 차등(전부 1크레딧 확정) / `/me`·데일리 재계산 적용(후속)
- 크레딧 패키지·결제 변경(기존 `/premium/credits` 재사용)
