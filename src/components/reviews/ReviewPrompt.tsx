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
    // exists인데 저장본(initial)이 없으면 — 방금 입력한 값은 저장되지 않았으므로 "내 후기"처럼
    // 보여주지 않는다(다른 기기/세션의 실제 후기와 다를 수 있다 — 최종 리뷰 반영). 안내만.
    const shown = saved ?? (state === "done" ? { rating, comment: comment.trim() || null } : null);
    return (
      <section className="mt-4 rounded-card bg-warm-surface p-4">
        <p className="text-xs text-text-soft">
          {state === "done"
            ? "따뜻한 후기, 감사히 받았어요 🌿"
            : state === "exists"
              ? "이미 이 풀이의 후기를 받았어요 🌿"
              : "내가 남긴 후기"}
        </p>
        {shown && (
          <p className="mt-1 text-sm text-text-main">
            <span aria-hidden>{"★".repeat(shown.rating)}</span>
            <span className="sr-only">{shown.rating}점</span>
            {shown.comment && <span className="ml-2">{shown.comment}</span>}
          </p>
        )}
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
