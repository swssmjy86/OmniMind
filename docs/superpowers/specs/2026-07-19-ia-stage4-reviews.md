# 4탭 IA 4단계 — 후기 수집·노출 · 공유 확장 설계

> 작성 2026-07-19. `2026-07-18-omnimind-4tab-ia.md` §6의 4단계(P9 §5.2·§5.3 흡수) 상세화.
> 원칙(P9 §5.2): **실제 후기만** 노출, 적으면 섹션 숨김 — 빈 상태를 꾸미지 않는다.
> 가짜 후기·부풀린 카운트 금지. 공포·조급 카피 금지.

## 1. 데이터 (마이그레이션 0011)

P9 §6.1의 `reading_reviews` 그대로: rating 1~5 check, comment ≤200, **unique(reading_id)**
(풀이 1건당 후기 1개), RLS 본인 select/insert만(update/delete 없음 — 후기는 정정 대신
새 풀이에 새 후기).

**공개 노출 경로:** anon 정책을 열지 않는다. 서버 컴포넌트가 **admin 클라이언트**로
익명 필드만(rating·comment·product·created_at) 집계 조회해 렌더한다 — 작성자 식별
정보(user_id·reading_id)는 응답 어디에도 내리지 않는다(P9 §6.1 RLS 노트의 구현).

## 2. 수집

- **지점:** 풀이를 실제로 연 뒤 — ① 열람 직후(UnlockReading·MatchDeepForm 결과 하단)
  ② 재방문 캐시 렌더 화면 하단(총운·크레딧 4종·궁합 심층 지난 기록).
- 열람 직후 부착을 위해 `UnlockResult`·`cacheAndCharge`에 `readingId` 전파(insert 시
  `.select("id")`, dedup 시 기존 행 id, uncached·비캐시 템플릿본은 null → 후기 미노출).
  **머니 패스 로직 불변** — id 반환만 추가하고 기존 단위 테스트 5분기를 확장해 고정.
- UI `ReviewPrompt`(클라이언트): 별 1~5 탭 + 한 줄(선택, ≤200) + "남기기".
  이미 남긴 풀이면 내 후기 표시(별점·코멘트) — 수집 강요·재요청 없음.
- 액션 `submitReview(readingId, rating, comment)`: 본인 reading 소유 확인은 RLS insert
  정책(`auth.uid() = user_id`)과 reading 소유 검증으로. 검증은 순수 함수 분리.

## 3. 노출

| 위치 | 내용 | 조건 |
|---|---|---|
| 상품 페이지 하단(총운·4종·궁합 심층) | 해당 product 별점 평균(소수 1자리)·개수 + 최근 코멘트 2개(익명, 날짜만) | 해당 product 후기 ≥ 1 |
| 홈 '고객리뷰' | 전체 최근 코멘트 3개 + 전체 평균·개수 | 전체 코멘트 후기 ≥ 3 |

- 조회 헬퍼 `src/lib/reviews/summary.ts`(서버 전용, admin): `productReviewSummary(product)`,
  `homeReviewHighlights()`. admin 키 미설정·조회 실패 → null → 섹션 숨김(홈·상품 무영향).
- 코멘트 없는 별점-만 후기는 평균·개수에만 반영, 코멘트 목록에는 미노출.

## 4. 공유 확장 (P9 §5.3)

- **api/card 무변경**: 기존 `mode=profile` 카드가 임의 섹션 배열을 이미 지원한다.
  풀이 화면(총운·크레딧 4종 캐시 렌더)에 기존 `ShareSheet` 부착 —
  `profileCardQuery(ctx, `${nickname}님의 ${상품명}`.slice(0,20), sections)` + `via="reading"`.
- 궁합 심층은 상대 정보가 얽혀 1단계 보류(개인정보 — 상대 동의 없는 공유 카드 지양, 기록).

## 5. 테스트

- 후기 검증 순수 함수: rating 범위·comment 길이·trim
- cacheAndCharge 확장: 기존 5분기 각각에서 readingId 반환값 단언(회귀 고정)
- ReviewPrompt: 별점 선택·남기기 활성화·성공 시 감사 표시·이미 남긴 상태 렌더
- 노출 컴포넌트(동기): 후기 0건 → null 렌더 / ≥1 상품 요약 / 홈 ≥3 조건
- 톤 가드: 새 카피 전부
- 수동 스모크: 후기 남기기 → unique 제약(중복 시 내 후기 표시) → 상품·홈 노출

## 6. 비목표

- 후기 수정·삭제 UI(후속) / 관리자 모더레이션(오픈 전 과제로 기록) / 궁합 심층 공유 카드
- 후기 보상(크레딧 지급 등) — 유인책은 반응 보고
