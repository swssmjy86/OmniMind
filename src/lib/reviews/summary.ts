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
 * 없어 런타임 검증이 어렵다(테스트 환경에 라이브 Supabase가 없음) — 대신
 * reading_reviews(최근 200건) → reading_id 목록 → readings에서 해당 product인
 * id만 골라 교집합을 취하는 2단 조회로 안전하게 구현한다. 전체 후기가 200건을
 * 넘어가면 오래된 저빈도 상품의 후기가 누락될 수 있으나(초기 단계엔 무시 가능한
 * 리스크), FK 임베드 오조회로 페이지가 깨지는 것보다 안전하다.
 */
export async function productReviewSummary(product: string): Promise<ReviewSummary | null> {
  try {
    const admin = createAdminSupabase();
    const { data: reviews } = await admin
      .from("reading_reviews")
      .select("rating, comment, created_at, reading_id")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<(ReviewLite & { reading_id: string })[]>();
    const rows = reviews ?? [];
    if (rows.length === 0) return null;

    const ids = [...new Set(rows.map((r) => r.reading_id))];
    const { data: readings } = await admin
      .from("readings")
      .select("id")
      .eq("product", product)
      .in("id", ids)
      .returns<{ id: string }[]>();
    const matchIds = new Set((readings ?? []).map((r) => r.id));
    const filtered = rows.filter((r) => matchIds.has(r.reading_id));
    return summarize(filtered, 2);
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
