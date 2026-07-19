# IA 4단계 — 후기 수집·노출 · 공유 확장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스펙 `docs/superpowers/specs/2026-07-19-ia-stage4-reviews.md` 구현 — `reading_reviews` 수집(열람 직후+재방문), 실후기만 노출(상품 하단·홈 고객리뷰), 풀이 공유 카드(api/card 무변경).

**Architecture:** 후기는 본인 RLS로 쓰고, 공개 노출은 서버 admin 집계(익명 필드만)로 읽는다. 열람 직후 수집을 위해 `cacheAndCharge`/`UnlockResult`에 `readingId`만 전파(머니 패스 로직 불변 — 기존 단위 테스트 5분기 확장으로 고정). 공유는 기존 `mode=profile` 카드·ShareSheet 재사용.

**Tech Stack:** Supabase(RLS+admin 집계) · 기존 ShareSheet/api-card · Vitest

## Global Constraints

- **커밋 전 `npm run verify` 통과 필수.** 브랜치 `feat/ia-stage4-reviews`(생성됨).
- **실후기 원칙(P9 §5.2):** 실제 후기만, 조건 미달이면 섹션 자체 미렌더(빈 상태 장식·가짜 카운트 금지). 상품 하단=해당 상품 후기 ≥1, 홈=코멘트 후기 ≥3.
- **익명 노출:** 공개 조회는 admin으로 rating·comment·created_at(+product 조인)만 — user_id·reading_id는 응답에 없다. anon RLS 정책을 열지 않는다.
- **머니 패스 불변:** `cacheAndCharge` 변경은 `.select("id")` 반환 추가뿐 — 분기·차감 로직 무변경, 기존 테스트 전부 통과 + readingId 단언 추가.
- **후기 1건/풀이 1건:** unique(reading_id). 중복 제출은 부드럽게 처리(내 후기 표시).
- **톤 규칙(§5.4)** 새 카피 전부 tone-guard 준수·공포/재촉 금지. 후기 재요청·강요 UI 금지.
- admin 키 미설정·조회 실패 → 노출 섹션 숨김(홈·상품 화면은 항상 동작 — P9 §12).
- 궁합 심층 공유 카드는 보류(상대 동의 없는 공유 지양 — 스펙 §4).

## 파일 구조

```
supabase/migrations/0011_stage4_reading_reviews.sql   [신규]
src/lib/db/types.ts                                    [수정] ReadingReviewRow
src/lib/reviews/validate.ts / .test.ts                 [신규] 별점·코멘트 검증(순수)
src/lib/reviews/actions.ts                             [신규] submitReview
src/lib/metrics/names.ts                               [수정] "review_submit"
src/lib/readings/cache-and-charge.ts / .test.ts        [수정] readingId 반환
src/lib/readings/actions.ts                            [수정] UnlockResult.readingId 전파
src/components/saju/UnlockReading.tsx·MatchDeepForm.tsx [수정] 결과 하단 ReviewPrompt
src/components/reviews/ReviewPrompt.tsx / .test.tsx    [신규] 별점+한 줄 수집(클라이언트)
src/lib/reviews/summary.ts / summary.test.ts           [신규] admin 집계 + 순수 summarize
src/components/reviews/ReviewHighlights.tsx / .test.tsx [신규] 노출(동기 — 요약·코멘트)
src/app/(tabs)/saju/chongun/page.tsx                   [수정] ReviewPrompt·요약·ShareSheet
src/app/(tabs)/saju/[product]/page.tsx                 [수정] 〃
src/app/(tabs)/saju/match-deep/page.tsx                [수정] 지난 기록에 ReviewPrompt·요약
src/app/(tabs)/page.tsx                                [수정] 홈 고객리뷰 섹션
```

---

### Task 1: 마이그레이션 + 검증 + `submitReview`

**Files:**
- Create: `supabase/migrations/0011_stage4_reading_reviews.sql`
- Modify: `src/lib/db/types.ts` (끝에 추가), `src/lib/metrics/names.ts` (SERVER_EVENTS에 `"review_submit"`)
- Create: `src/lib/reviews/validate.ts` / Test: `src/lib/reviews/validate.test.ts`
- Create: `src/lib/reviews/actions.ts`

**Interfaces:**
- Produces:
  - `interface ReadingReviewRow { id: string; reading_id: string; user_id: string; rating: number; comment: string | null; created_at: string }`
  - `const REVIEW_COMMENT_MAX = 200`
  - `validateReview(rating: unknown, comment: unknown): { ok: true; rating: number; comment: string | null } | { ok: false }`
  - `submitReview(readingId: string, rating: number, comment: string): Promise<ReviewResult>` where `type ReviewResult = { ok: true } | { ok: false; reason: "auth" | "invalid" | "not-found" | "exists" | "error" }`

- [ ] **Step 1: 마이그레이션 작성**

`supabase/migrations/0011_stage4_reading_reviews.sql`:

```sql
-- IA 4단계: 풀이 후기(P9 §5.2·§6.1). (0010 이후 실행)
-- 실행: Supabase SQL Editor에 붙여넣고 Run.

create table if not exists public.reading_reviews (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.readings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 200),
  created_at timestamptz not null default now(),
  unique (reading_id)                 -- 풀이 1건당 후기 1개
);

alter table public.reading_reviews enable row level security;

-- 본인 행만 select/insert. 공개 노출은 서버 admin 집계로만(익명 필드) — anon 정책 없음.
-- update/delete 정책도 없음: 후기는 불변(정정은 새 풀이에 새 후기).
drop policy if exists "own reviews: select" on public.reading_reviews;
create policy "own reviews: select" on public.reading_reviews
  for select using (auth.uid() = user_id);
drop policy if exists "own reviews: insert" on public.reading_reviews;
create policy "own reviews: insert" on public.reading_reviews
  for insert with check (auth.uid() = user_id);
```

- [ ] **Step 2: 검증 실패 테스트**

`src/lib/reviews/validate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { REVIEW_COMMENT_MAX, validateReview } from "./validate";

describe("후기 검증 (4단계 스펙 §2)", () => {
  it("별점 1~5 정수만 — 범위 밖·소수·비숫자는 거부", () => {
    for (const r of [1, 3, 5]) expect(validateReview(r, null).ok).toBe(true);
    for (const r of [0, 6, 2.5, "3", null]) expect(validateReview(r, null).ok).toBe(false);
  });

  it("코멘트는 선택 — trim 후 빈 문자열은 null, 상한 초과 거부", () => {
    expect(validateReview(4, "  따뜻했어요  ")).toEqual({ ok: true, rating: 4, comment: "따뜻했어요" });
    expect(validateReview(4, "   ")).toEqual({ ok: true, rating: 4, comment: null });
    expect(validateReview(4, null)).toEqual({ ok: true, rating: 4, comment: null });
    expect(validateReview(4, "가".repeat(REVIEW_COMMENT_MAX + 1)).ok).toBe(false);
    expect(validateReview(4, 123).ok).toBe(false);
  });
});
```

- [ ] **Step 3: 실패 확인 후 구현**

Run: `npx vitest run src/lib/reviews/validate.test.ts` → FAIL (모듈 없음)

`src/lib/reviews/validate.ts`:

```ts
// 후기 입력 검증(4단계 스펙 §2) — 순수 함수. 액션이 insert 전에 반드시 거친다.
export const REVIEW_COMMENT_MAX = 200;

export type ReviewValidation =
  | { ok: true; rating: number; comment: string | null }
  | { ok: false };

export function validateReview(rating: unknown, comment: unknown): ReviewValidation {
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5)
    return { ok: false };
  if (comment == null) return { ok: true, rating, comment: null };
  if (typeof comment !== "string") return { ok: false };
  const trimmed = comment.trim();
  if (trimmed.length > REVIEW_COMMENT_MAX) return { ok: false };
  return { ok: true, rating, comment: trimmed.length > 0 ? trimmed : null };
}
```

Run → PASS (2 tests)

- [ ] **Step 4: 타입·이벤트·액션**

`src/lib/db/types.ts` 끝에:

```ts
/** IA 4단계 풀이 후기(reading_reviews) 한 행 — P9 §6.1. */
export interface ReadingReviewRow {
  id: string;
  reading_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
```

`src/lib/metrics/names.ts` SERVER_EVENTS의 `"reading_unlock"` 줄 아래에:

```ts
  "review_submit", // 4단계 풀이 후기 제출
```

`src/lib/reviews/actions.ts`:

```ts
"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { recordEvent } from "@/lib/metrics/events";
import { validateReview } from "./validate";

export type ReviewResult =
  | { ok: true }
  | { ok: false; reason: "auth" | "invalid" | "not-found" | "exists" | "error" };

/**
 * 풀이 후기 제출(4단계 스펙 §2) — 본인이 연 풀이(readings 본인 행)에만, 풀이당 1개.
 * 중복(unique 위반)은 exists로 부드럽게 — 화면은 내 후기 표시로 전환한다.
 */
export async function submitReview(
  readingId: string,
  rating: number,
  comment: string,
): Promise<ReviewResult> {
  const v = validateReview(rating, comment);
  if (!v.ok || typeof readingId !== "string" || readingId.length === 0)
    return { ok: false, reason: "invalid" };

  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    // 본인 풀이인지 — readings는 본인 select만 허용되므로 남의 풀이는 조회되지 않는다
    const { data: reading } = await supabase
      .from("readings").select("id").eq("id", readingId).eq("user_id", user.id)
      .maybeSingle<{ id: string }>();
    if (!reading) return { ok: false, reason: "not-found" };

    const { error } = await supabase.from("reading_reviews").insert({
      reading_id: readingId, user_id: user.id, rating: v.rating, comment: v.comment,
    });
    if (error) return { ok: false, reason: "exists" }; // unique(reading_id) 등 — 재요청하지 않는다

    await recordEvent("review_submit", { rating: v.rating, hasComment: v.comment !== null });
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}
```

- [ ] **Step 5: 검증·커밋**

```bash
npm run verify
git add supabase/migrations/0011_stage4_reading_reviews.sql src/lib/reviews/ src/lib/db/types.ts src/lib/metrics/names.ts
git commit -m "feat(reviews): reading_reviews 테이블·검증·submitReview — 본인 풀이당 1건"
```

---

### Task 2: `readingId` 전파 (머니 패스 로직 불변)

**Files:**
- Modify: `src/lib/readings/cache-and-charge.ts` / `src/lib/readings/cache-and-charge.test.ts`
- Modify: `src/lib/readings/actions.ts`
- Modify: `src/components/saju/UnlockReading.test.tsx`, `src/components/saju/MatchDeepForm.test.tsx` (mock 반환에 `readingId` 필드 추가 — 단언 변경 없음)

**Interfaces:**
- Produces: `cacheAndCharge` 반환에 `readingId: string | null` 추가(성공 insert=새 id, dedup=기존 행 id, uncached=null). `UnlockResult` ok variant에 `readingId: string | null`(캐시 히트=행 id, LLM 실패 템플릿=null).

- [ ] **Step 1: 기존 테스트 확장(실패 유도)**

`src/lib/readings/cache-and-charge.test.ts`의 각 분기 테스트에 `readingId` 단언 추가:
- insert 성공 분기들(charged·premium·RPC null·RPC throw): mock insert 체인이 `.select("id").single()`로 `{ data: { id: "r-new" }, error: null }`을 돌려주게 바꾸고 `expect(out.readingId).toBe("r-new")`
- dedup: 기존 행 mock에 `id: "r-old"` 포함 → `expect(out.readingId).toBe("r-old")`
- uncached: `expect(out.readingId).toBeNull()`

Run: `npx vitest run src/lib/readings/cache-and-charge.test.ts` → FAIL (readingId 없음)

- [ ] **Step 2: cacheAndCharge 구현 변경**

`src/lib/readings/cache-and-charge.ts`:
- 반환 타입에 `readingId: string | null` 추가.
- insert를 다음으로 교체(에러 분기·이후 로직은 그대로):

```ts
  const { data: inserted, error: insertError } = await supabase
    .from("readings")
    .insert({
      user_id: userId, product, input_hash: hash,
      context_version: PROFILE_CONTEXT_VERSION, sections,
    })
    .select("id")
    .single<{ id: string }>();
```

- 세 반환 지점에 각각 `readingId: existing.id`(dedup) / `readingId: null`(uncached) / `readingId: inserted?.id ?? null`(charged) 추가.

Run: cache-and-charge 테스트 → PASS

- [ ] **Step 3: 액션 전파**

`src/lib/readings/actions.ts`:
- `UnlockResult` ok variant에 `readingId: string | null;` 추가.
- `unlockReading`·`unlockMatchDeep` 각각: 캐시 히트 반환에 `readingId: cached.id`, `cacheAndCharge` 경유 반환에 `readingId: out.readingId`, LLM 실패 템플릿 반환에 `readingId: null`.

- [ ] **Step 4: 컴포넌트 테스트 mock 보정**

`UnlockReading.test.tsx`·`MatchDeepForm.test.tsx`의 `mockResolvedValue({ ok: true, ... })`에 `readingId: "r-1"` 필드 추가(타입 만족용 — 단언은 그대로).

- [ ] **Step 5: 검증·커밋**

Run: `npm run verify` → 통과 (분기·차감 동작 무변경 확인 — 기존 단언 전부 유지)

```bash
git add src/lib/readings/ src/components/saju/UnlockReading.test.tsx src/components/saju/MatchDeepForm.test.tsx
git commit -m "feat(readings): UnlockResult·cacheAndCharge에 readingId 전파 — 열람 직후 후기 수집 준비(로직 불변)"
```

---

### Task 3: `ReviewPrompt` + 결과 화면 부착

**Files:**
- Create: `src/components/reviews/ReviewPrompt.tsx` / Test: `src/components/reviews/ReviewPrompt.test.tsx`
- Modify: `src/components/saju/UnlockReading.tsx`, `src/components/saju/MatchDeepForm.tsx` (결과(sections) 렌더 하단에 `{result.readingId && <ReviewPrompt readingId={result.readingId} />}` — 각 컴포넌트의 결과 상태에 readingId 보관 필요: `setSections` 대신 `setResult({sections, readingId})` 형태로 최소 변경)

**Interfaces:**
- Consumes: `submitReview`(mock 경계)
- Produces: `ReviewPrompt({ readingId, initial }: { readingId: string; initial?: { rating: number; comment: string | null } | null })`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/reviews/ReviewPrompt.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReviewPrompt from "./ReviewPrompt";
import { submitReview } from "@/lib/reviews/actions";

vi.mock("@/lib/reviews/actions", () => ({ submitReview: vi.fn() }));

describe("ReviewPrompt (4단계 스펙 §2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("별 5개와 비활성 남기기 버튼 — 별점 선택 시 활성", () => {
    render(<ReviewPrompt readingId="r-1" />);
    expect(screen.getByText("이 풀이, 어땠나요?")).toBeInTheDocument();
    const stars = screen.getAllByRole("button", { name: /점/ });
    expect(stars).toHaveLength(5);
    expect(screen.getByRole("button", { name: "남기기" })).toBeDisabled();
    fireEvent.click(stars[3]); // 4점
    expect(screen.getByRole("button", { name: "남기기" })).not.toBeDisabled();
  });

  it("제출 성공 → 감사 문구·내 후기 표시", async () => {
    vi.mocked(submitReview).mockResolvedValue({ ok: true });
    render(<ReviewPrompt readingId="r-1" />);
    fireEvent.click(screen.getAllByRole("button", { name: /점/ })[4]);
    fireEvent.change(screen.getByPlaceholderText(/한 줄로 남겨주시면/), {
      target: { value: "따뜻했어요" },
    });
    fireEvent.click(screen.getByRole("button", { name: "남기기" }));
    expect(await screen.findByText(/감사히 받았어요/)).toBeInTheDocument();
    expect(vi.mocked(submitReview)).toHaveBeenCalledWith("r-1", 5, "따뜻했어요");
  });

  it("이미 남긴 풀이(initial) — 폼 없이 내 후기만", () => {
    render(<ReviewPrompt readingId="r-1" initial={{ rating: 4, comment: "좋았어요" }} />);
    expect(screen.getByText(/내가 남긴 후기/)).toBeInTheDocument();
    expect(screen.getByText(/좋았어요/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "남기기" })).not.toBeInTheDocument();
  });

  it("exists 실패 → 이미 남긴 상태로 전환(재요청 없음)", async () => {
    vi.mocked(submitReview).mockResolvedValue({ ok: false, reason: "exists" });
    render(<ReviewPrompt readingId="r-1" />);
    fireEvent.click(screen.getAllByRole("button", { name: /점/ })[2]);
    fireEvent.click(screen.getByRole("button", { name: "남기기" }));
    expect(await screen.findByText(/이미 이 풀이의 후기를 받았어요/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인 후 구현**

Run → FAIL (모듈 없음)

`src/components/reviews/ReviewPrompt.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { submitReview } from "@/lib/reviews/actions";
import { REVIEW_COMMENT_MAX } from "@/lib/reviews/validate";

/**
 * 풀이 후기 수집(4단계 스펙 §2) — 열람한 풀이 하단에서만. 강요·재요청 없음(P9 §5.2).
 * 이미 남긴 풀이(initial)는 내 후기만 보여준다.
 */
export default function ReviewPrompt({
  readingId,
  initial,
}: {
  readingId: string;
  initial?: { rating: number; comment: string | null } | null;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "done" | "exists" | "error">("idle");
  const [pending, startTransition] = useTransition();

  const saved = initial ?? null;
  if (saved || state === "done" || state === "exists") {
    const shown = saved ?? { rating, comment: comment.trim() || null };
    return (
      <section className="mt-4 rounded-card bg-warm-surface p-4">
        <p className="text-xs text-text-soft">
          {state === "done"
            ? "따뜻한 후기, 감사히 받았어요 🌿"
            : state === "exists"
              ? "이미 이 풀이의 후기를 받았어요 🌿"
              : "내가 남긴 후기"}
        </p>
        <p className="mt-1 text-sm text-text-main">
          <span aria-hidden>{"★".repeat(shown.rating)}</span>
          <span className="sr-only">{shown.rating}점</span>
          {shown.comment && <span className="ml-2">{shown.comment}</span>}
        </p>
      </section>
    );
  }

  const submit = () => {
    startTransition(async () => {
      const r = await submitReview(readingId, rating, comment);
      if (r.ok) setState("done");
      else if (r.reason === "exists") setState("exists");
      else setState("error");
    });
  };

  return (
    <section className="mt-4 rounded-card bg-warm-surface p-4">
      <p className="text-sm text-text-main">이 풀이, 어땠나요?</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n}점`}
            onClick={() => setRating(n)}
            className={`press text-2xl ${n <= rating ? "text-moon-gold" : "text-text-soft/40"}`}
          >
            ★
          </button>
        ))}
      </div>
      <input
        type="text"
        value={comment}
        maxLength={REVIEW_COMMENT_MAX}
        onChange={(e) => setComment(e.target.value)}
        placeholder="한 줄로 남겨주시면 큰 힘이 돼요 (선택)"
        className="mt-3 w-full rounded-card border border-text-soft/25 bg-warm-base p-3 text-sm text-text-main"
      />
      <button
        type="button"
        disabled={rating === 0 || pending}
        onClick={submit}
        className="press mt-3 w-full rounded-card bg-warm-base py-2.5 text-sm font-medium text-text-main disabled:opacity-40"
      >
        남기기
      </button>
      {state === "error" && (
        <p className="mt-2 text-xs text-accent-coral">지금은 접수가 어려워요. 다음에 편하게 남겨주셔도 돼요.</p>
      )}
    </section>
  );
}
```

Run → PASS (4 tests)

- [ ] **Step 3: 결과 화면 부착**

`src/components/saju/UnlockReading.tsx`: `sections` 상태를 `{ sections, readingId }` 결과 객체로 최소 변경하고, 결과 렌더 하단에:

```tsx
      {result.readingId && <ReviewPrompt readingId={result.readingId} />}
```

`src/components/saju/MatchDeepForm.tsx`: 동일 패턴.
(두 컴포넌트의 기존 테스트는 mock에 이미 readingId가 있으므로 그대로 통과해야 한다 — 렌더 결과에 ReviewPrompt의 "이 풀이, 어땠나요?"가 추가되는 것은 기존 단언과 충돌하지 않는다.)

- [ ] **Step 4: 검증·커밋**

Run: `npm run verify` → 통과

```bash
git add src/components/reviews/ src/components/saju/UnlockReading.tsx src/components/saju/MatchDeepForm.tsx
git commit -m "feat(reviews): ReviewPrompt — 별점+한 줄 수집, 열람 직후 결과 화면 부착"
```

---

### Task 4: 집계·노출 — 상품 하단 + 홈 고객리뷰

**Files:**
- Create: `src/lib/reviews/summary.ts` / Test: `src/lib/reviews/summary.test.ts` (순수 `summarize`만)
- Create: `src/components/reviews/ReviewHighlights.tsx` / Test: `src/components/reviews/ReviewHighlights.test.tsx`
- Modify: `src/app/(tabs)/saju/chongun/page.tsx`, `src/app/(tabs)/saju/[product]/page.tsx`, `src/app/(tabs)/saju/match-deep/page.tsx` (캐시/전체 렌더 하단에 ReviewPrompt(내 후기 조회) + 상품 요약)
- Modify: `src/app/(tabs)/page.tsx` (고객리뷰 자리 주석 → 실제 섹션)

**Interfaces:**
- Produces:
  - `interface ReviewSummary { count: number; avg: number; comments: { comment: string; date: string }[] }`
  - `summarize(rows: { rating: number; comment: string | null; created_at: string }[], maxComments: number): ReviewSummary | null` (순수 — 0건이면 null, avg 소수 1자리)
  - `productReviewSummary(product: string): Promise<ReviewSummary | null>` (admin, 실패 시 null)
  - `homeReviewHighlights(): Promise<ReviewSummary | null>` (코멘트 3개 미만이면 null)
  - `ReviewHighlights({ summary, heading, sub }: { summary: ReviewSummary | null; heading: string; sub?: string })` — null이면 아무것도 렌더하지 않음

- [ ] **Step 1: summarize 실패 테스트**

`src/lib/reviews/summary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { summarize } from "./summary";

const row = (rating: number, comment: string | null, d: string) => ({
  rating, comment, created_at: `${d}T09:00:00+09:00`,
});

describe("summarize (4단계 스펙 §3 — 순수 집계)", () => {
  it("0건 → null(섹션 숨김 — 빈 상태를 꾸미지 않는다)", () => {
    expect(summarize([], 3)).toBeNull();
  });

  it("평균 소수 1자리·개수·코멘트만 최신순 최대 N", () => {
    const s = summarize(
      [row(5, "좋았어요", "2026-07-19"), row(4, null, "2026-07-18"), row(3, "담담했어요", "2026-07-17")],
      1,
    )!;
    expect(s.count).toBe(3);
    expect(s.avg).toBe(4.0);
    expect(s.comments).toEqual([{ comment: "좋았어요", date: "2026-07-19" }]);
  });

  it("코멘트 없는 별점-만 후기는 평균·개수에만 반영된다", () => {
    const s = summarize([row(5, null, "2026-07-19")], 3)!;
    expect(s.count).toBe(1);
    expect(s.comments).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인 후 구현**

Run → FAIL (모듈 없음)

`src/lib/reviews/summary.ts`:

```ts
// 후기 공개 노출(4단계 스펙 §3) — 서버 전용. 공개 조회는 admin으로 익명 필드만 읽는다
// (user_id·reading_id는 응답에 없다). 조회 실패·admin 키 미설정 → null → 섹션 숨김(P9 §12).
import { createAdminSupabase } from "@/lib/supabase/admin";

export interface ReviewSummary {
  count: number;
  avg: number; // 소수 1자리
  comments: { comment: string; date: string }[];
}

interface ReviewLite {
  rating: number;
  comment: string | null;
  created_at: string;
}

/** 순수 집계 — 0건이면 null. 코멘트는 최신순 최대 maxComments(별점-만 후기는 평균에만). */
export function summarize(rows: ReviewLite[], maxComments: number): ReviewSummary | null {
  if (rows.length === 0) return null;
  const avg = Math.round((rows.reduce((a, r) => a + r.rating, 0) / rows.length) * 10) / 10;
  const comments = [...rows]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .filter((r): r is ReviewLite & { comment: string } => Boolean(r.comment))
    .slice(0, maxComments)
    .map((r) => ({ comment: r.comment, date: r.created_at.slice(0, 10) }));
  return { count: rows.length, avg, comments };
}

/** 상품별 요약 — 해당 product 후기 ≥1일 때만 값. */
export async function productReviewSummary(product: string): Promise<ReviewSummary | null> {
  try {
    const admin = createAdminSupabase();
    const { data } = await admin
      .from("reading_reviews")
      .select("rating, comment, created_at, readings!inner(product)")
      .eq("readings.product", product)
      .order("created_at", { ascending: false })
      .limit(50);
    return summarize((data ?? []) as unknown as ReviewLite[], 2);
  } catch {
    return null;
  }
}

/** 홈 고객리뷰 — 코멘트 후기 3개 이상 쌓였을 때만 값(P9 §5.2). */
export async function homeReviewHighlights(): Promise<ReviewSummary | null> {
  try {
    const admin = createAdminSupabase();
    const { data } = await admin
      .from("reading_reviews")
      .select("rating, comment, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    const s = summarize((data ?? []) as ReviewLite[], 3);
    return s && s.comments.length >= 3 ? s : null;
  } catch {
    return null;
  }
}
```

Run: summarize 테스트 → PASS (3 tests)

- [ ] **Step 3: ReviewHighlights 실패 테스트 → 구현**

`src/components/reviews/ReviewHighlights.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReviewHighlights from "./ReviewHighlights";

describe("ReviewHighlights (4단계 스펙 §3)", () => {
  it("summary null → 아무것도 렌더하지 않는다", () => {
    const { container } = render(<ReviewHighlights summary={null} heading="고객리뷰" />);
    expect(container.firstChild).toBeNull();
  });

  it("평균·개수·코멘트를 익명으로 렌더한다", () => {
    render(
      <ReviewHighlights
        heading="고객리뷰"
        sub="실제로 풀이를 열어본 분들의 이야기예요."
        summary={{
          count: 12, avg: 4.5,
          comments: [{ comment: "따뜻했어요", date: "2026-07-19" }],
        }}
      />,
    );
    expect(screen.getByText("고객리뷰")).toBeInTheDocument();
    expect(screen.getByText(/4\.5/)).toBeInTheDocument();
    expect(screen.getByText(/후기 12개/)).toBeInTheDocument();
    expect(screen.getByText("따뜻했어요")).toBeInTheDocument();
    expect(screen.getByText("2026-07-19")).toBeInTheDocument();
  });
});
```

Run → FAIL → `src/components/reviews/ReviewHighlights.tsx`:

```tsx
import type { ReviewSummary } from "@/lib/reviews/summary";

/** 후기 노출(4단계 스펙 §3) — summary가 없으면(조건 미달·조회 실패) 아무것도 렌더하지 않는다. */
export default function ReviewHighlights({
  summary,
  heading,
  sub,
}: {
  summary: ReviewSummary | null;
  heading: string;
  sub?: string;
}) {
  if (!summary) return null;
  return (
    <section className="mt-8" aria-label={heading}>
      <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
        {heading}
      </h2>
      {sub && <p className="mt-1 text-sm text-text-soft">{sub}</p>}
      <p className="mt-2 text-sm text-text-main">
        <span aria-hidden className="text-moon-gold">★</span> {summary.avg.toFixed(1)}
        <span className="ml-2 text-text-soft">후기 {summary.count}개</span>
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {summary.comments.map((c) => (
          <div key={`${c.date}-${c.comment}`} className="rounded-card bg-warm-surface p-4">
            <p className="text-sm leading-relaxed text-text-main">{c.comment}</p>
            <p className="mt-1 text-xs text-text-soft">{c.date}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

Run → PASS (2 tests)

- [ ] **Step 4: 페이지 부착**

- `src/app/(tabs)/saju/[product]/page.tsx` 캐시 렌더 분기: 섹션 목록 아래에

```tsx
        {(() => null)()}
```
  대신 실제로는 다음을 추가한다 — 페이지 상단에서 데이터 조회:

```tsx
  // 내 후기(있으면 표시 전용) + 상품 후기 요약 — 둘 다 실패해도 화면은 그대로(P9 §12)
  const [{ data: myReview }, productSummary] = await Promise.all([
    supabase.from("reading_reviews").select("rating, comment")
      .eq("reading_id", cached.id).maybeSingle<{ rating: number; comment: string | null }>(),
    productReviewSummary(product),
  ]);
```

  렌더(섹션 목록과 "다른 풀이 보러 가기" 사이):

```tsx
        <ReviewPrompt readingId={cached.id} initial={myReview ?? null} />
        <ReviewHighlights summary={productSummary} heading="이 풀이의 후기" />
```

  import: `ReviewPrompt`, `ReviewHighlights`, `productReviewSummary`.

- `src/app/(tabs)/saju/chongun/page.tsx` 전체 렌더 분기: 캐시 조회로 얻은/생성한 reading의 id가 필요 — 기존 코드가 `cached` 미스 시 insert만 하고 id를 안 받는다. insert를 `.select("id").single<{ id: string }>()`로 바꿔 id를 받고(실패 시 null), `readingId: string | null`로 보관. 섹션 목록 아래(기존 `/me` 링크 위):

```tsx
        {readingId && <ReviewPrompt readingId={readingId} initial={myReview ?? null} />}
        <ReviewHighlights summary={chongunSummary} heading="이 풀이의 후기" />
```

  (`myReview`는 readingId 있을 때만 조회, `chongunSummary = await productReviewSummary("chongun")`.)

- `src/app/(tabs)/saju/match-deep/page.tsx`: 지난 기록 각 details 안 섹션 아래에 `<ReviewPrompt readingId={r.id} initial={reviewsById.get(r.id) ?? null} />` — 상단에서 한 번에 조회:

```tsx
  const pastIds = (past ?? []).map((r) => r.id);
  const { data: myReviews } = pastIds.length
    ? await supabase.from("reading_reviews").select("reading_id, rating, comment").in("reading_id", pastIds)
        .returns<{ reading_id: string; rating: number; comment: string | null }[]>()
    : { data: [] as { reading_id: string; rating: number; comment: string | null }[] };
  const reviewsById = new Map((myReviews ?? []).map((r) => [r.reading_id, { rating: r.rating, comment: r.comment }]));
```

  페이지 하단에 `<ReviewHighlights summary={await productReviewSummary("match")} heading="이 풀이의 후기" />` (변수로 받아 렌더).

- `src/app/(tabs)/page.tsx` 홈: 고객리뷰 자리 주석을 실제 렌더로 교체:

```tsx
      {/* 고객리뷰 — 실제 코멘트 후기 3개 이상일 때만(P9 §5.2) */}
      <ReviewHighlights
        summary={homeSummary}
        heading="고객리뷰"
        sub="실제로 풀이를 열어본 분들의 이야기예요."
      />
```

  상단 데이터: `const homeSummary = await homeReviewHighlights();` + import.

- [ ] **Step 5: 검증·커밋**

Run: `npm run verify` → 통과

```bash
git add -A
git commit -m "feat(reviews): 노출 — 상품 하단 요약·내 후기, 홈 고객리뷰(실후기 3개 이상)"
```

---

### Task 5: 공유 확장 — 풀이 카드

**Files:**
- Modify: `src/app/(tabs)/saju/chongun/page.tsx`, `src/app/(tabs)/saju/[product]/page.tsx` (전체/캐시 렌더에 ShareSheet)

**Interfaces:**
- Consumes: 기존 `ShareSheet`, `profileCardQuery` — api/card 무변경(스펙 §4)

- [ ] **Step 1: 부착**

두 페이지의 섹션 렌더와 ReviewPrompt 사이에:

```tsx
        <ShareSheet
          query={profileCardQuery(ctx, `${profile.nickname}님의 ${제목}`.slice(0, 20), 렌더한 sections)}
          via="reading"
          label="풀이 카드"
        />
```

- chongun: `제목` = `"총운"`, sections = 렌더 중인 `sections`.
- `[product]`: `제목` = `meta.title`, sections = `cached.sections`.
- import: `ShareSheet`, `profileCardQuery`. (`profileCardQuery`가 섹션 길이를 방어적으로 자르므로 LLM 문단이 길어도 안전 — card-copy 주석 참조.)

- [ ] **Step 2: 검증·커밋**

Run: `npm run verify` → 통과. `npm run dev`: 총운·크레딧 풀이에서 공유 시트 → 카드 이미지에 풀이 섹션.

```bash
git add "src/app/(tabs)/saju/chongun/page.tsx" "src/app/(tabs)/saju/[product]/page.tsx"
git commit -m "feat(share): 풀이 결과 공유 카드 — 기존 profile 카드·ShareSheet 재사용(via=reading)"
```

---

### Task 6: 최종 검증 · 머지

- [ ] **Step 1:** `npm run verify` 전체 통과
- [ ] **Step 2:** Supabase에 `0011_stage4_reading_reviews.sql` 적용(사람 몫 — 미적용 시 후기 기능만 조용히 비활성: 제출 error 안내·노출 숨김)
- [ ] **Step 3:** 수동 스모크: ① 풀이 열람 직후 후기 남기기 → 감사 표시 ② 재방문 → 내 후기 표시(중복 불가) ③ 상품 하단 요약(≥1) ④ 홈 고객리뷰(코멘트 3개 미만이면 숨김 확인) ⑤ 공유 카드 이미지 ⑥ 머니 패스 회귀 없음(차감·재열람)
- [ ] **Step 4:** 전체 브랜치 리뷰(머니 패스 readingId 변경 회귀 중점) → `omni-merge`

---

## Self-Review 기록

- **스펙 커버리지:** §1 테이블·RLS·admin 노출(Task 1·4) · §2 수집 지점 2곳·readingId 전파·1건 제한(Task 2·3) · §3 노출 조건(상품 ≥1·홈 코멘트 ≥3, 실패 시 숨김)(Task 4) · §4 공유(api/card 무변경)(Task 5) · §5 테스트 목록 전 항목 · §6 비목표 준수.
- **타입 일관성:** `ReadingReviewRow`(Task 1) ↔ 페이지 조회 필드, `ReviewSummary`(Task 4) ↔ ReviewHighlights props, `UnlockResult.readingId`(Task 2) ↔ UnlockReading/MatchDeepForm 결과 상태(Task 3), `initial` 형태 `{rating, comment}` 통일.
- **머니 패스:** 변경은 insert `.select("id")`와 반환 필드뿐 — 기존 5분기 테스트가 전부 유지된 채 readingId 단언이 추가되므로 회귀가 테스트로 고정된다.
- **조인 문법:** `readings!inner(product)` — Supabase FK 조인. 동작이 다르면 두 쿼리(리뷰→reading_id 목록→readings product 필터)로 대체 가능(Task 4 구현 노트로 허용).
