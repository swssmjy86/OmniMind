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
