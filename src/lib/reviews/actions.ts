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
