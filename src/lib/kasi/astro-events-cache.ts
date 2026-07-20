// 천문현상(AstroEventInfoService) 전역 캐시 — 날짜당 1회만 KASI를 호출한다.
// 사용자별이 아니라 "날짜" 하나에 전역으로 귀속되는 데이터라(모든 사용자에게 동일)
// interpretations(user_id 필수)가 아니라 astro_events_cache(0013 마이그레이션)를 쓴다.
//
// best-effort: KASI 장애·키 없음·네트워크 오류 등 무엇이든 실패하면 null을 반환하고
// 호출부(today/page.tsx)는 이 섹션만 조용히 생략한다 — 데일리 화면 전체를 막지 않는다.
import { createAdminSupabase } from "@/lib/supabase/admin";
import { fetchAstroEvents, type AstroEvent } from "./astro-events";

function toDateStr(date: { y: number; mo: number; d: number }): string {
  return `${date.y}-${String(date.mo).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
}

export async function getTodayAstroEvents(
  date: { y: number; mo: number; d: number },
): Promise<AstroEvent[] | null> {
  const targetDate = toDateStr(date);
  try {
    const admin = createAdminSupabase();
    const { data: cached } = await admin
      .from("astro_events_cache")
      .select("events")
      .eq("target_date", targetDate)
      .maybeSingle();
    if (cached) return cached.events as AstroEvent[];

    const events = await fetchAstroEvents(date);
    try {
      // unique(target_date) 충돌(동시 요청 경합)은 무시 — 이미 얻은 조회 결과는 그대로 반환한다.
      await admin.from("astro_events_cache").insert({ target_date: targetDate, events });
    } catch {
      // 캐시 기록 실패는 조용히 넘어간다 — 그 정도 중복 호출은 허용 범위.
    }
    return events;
  } catch {
    return null;
  }
}
