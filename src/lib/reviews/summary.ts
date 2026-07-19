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

/**
 * 상품별 요약 — 해당 product 후기 ≥1일 때만 값.
 *
 * PostgREST FK 임베드(`readings!inner(product)`)는 이 리포지토리에서 실사용 전례가
 * 없어 런타임 검증이 어렵다 — 대신 2단 조회. 순서가 중요하다(리뷰 반영):
 * **해당 product의 readings id를 먼저** 좁힌 뒤 그 id들의 후기를 최신순으로 읽는다.
 * 전역 최신 N건에서 걸러내는 역순서는 전체 후기가 N을 넘는 순간 저빈도 상품의
 * 실제 후기가 창 밖으로 밀려 "후기 ≥1이면 노출" 원칙이 조용히 깨진다.
 * (readings 상한 1000은 상품별 창 — 초과 시에도 최신 풀이의 후기부터 반영된다.)
 */
export async function productReviewSummary(product: string): Promise<ReviewSummary | null> {
  try {
    const admin = createAdminSupabase();
    const { data: readings } = await admin
      .from("readings")
      .select("id")
      .eq("product", product)
      .order("created_at", { ascending: false })
      .limit(1000)
      .returns<{ id: string }[]>();
    const ids = (readings ?? []).map((r) => r.id);
    if (ids.length === 0) return null;

    const { data: reviews } = await admin
      .from("reading_reviews")
      .select("rating, comment, created_at")
      .in("reading_id", ids)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<ReviewLite[]>();
    return summarize(reviews ?? [], 2);
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
      .limit(100)
      .returns<ReviewLite[]>();
    const s = summarize(data ?? [], 3);
    return s && s.comments.length >= 3 ? s : null;
  } catch {
    return null;
  }
}
