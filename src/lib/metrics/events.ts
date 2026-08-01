// 성장 지표 기록 — best-effort. 지표는 서비스 동작을 절대 막지 않는다.
// 익명 앱이라 사용자 식별 없이(user_id 없음) 이벤트만 남긴다. 유입 쿠키(om_ref)가 있으면
// ref/via를 병합해 "공유 카드 경유 방문"을 추적한다. 서버 전용 admin 클라이언트로 익명 insert.
import { cookies } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { REF_COOKIE, parseRefCookie } from "@/lib/share/ref";

export type EventProps = Record<string, string | number | boolean | null>;

/** 이벤트를 events 테이블에 익명으로 기록한다. 실패는 조용히 무시. */
export async function recordEvent(name: string, props: EventProps = {}): Promise<void> {
  try {
    const jar = await cookies();
    const raw = jar.get(REF_COOKIE)?.value;
    const ref = raw ? parseRefCookie(decodeURIComponent(raw)) : null;

    const supabase = createAdminSupabase();
    await supabase.from("events").insert({
      user_id: null,
      name,
      props: { ...props, ...(ref ? { ref: ref.ref, via: ref.via } : {}) },
    });
  } catch {
    // 스키마 미적용·네트워크 오류 등 — 지표 실패는 무시
  }
}
