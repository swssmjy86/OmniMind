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
