// P4-5 성장 지표 기록 — best-effort. 지표는 서비스 동작을 절대 막지 않는다.
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import { REF_COOKIE, parseRefCookie } from "@/lib/share/ref";

export type EventProps = Record<string, string | number | boolean | null>;

/**
 * 이벤트를 events 테이블에 기록한다. 유입 쿠키(om_ref)가 있으면 ref/via를 병합해
 * "공유 카드 경유 가입"을 추적한다(P4 완료 기준). 실패는 조용히 무시.
 */
export async function recordEvent(name: string, props: EventProps = {}): Promise<void> {
  try {
    const jar = await cookies();
    const raw = jar.get(REF_COOKIE)?.value;
    const ref = raw ? parseRefCookie(decodeURIComponent(raw)) : null;

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("events").insert({
      user_id: user?.id ?? null,
      name,
      props: { ...props, ...(ref ? { ref: ref.ref, via: ref.via } : {}) },
    });
  } catch {
    // 스키마 미적용·네트워크 오류 등 — 지표 실패는 무시
  }
}
