import { createClient } from "@supabase/supabase-js";

/**
 * anon 클라이언트 — RLS를 그대로 따른다(세션·쿠키·인증 없음). 익명 앱에서 "공개 SELECT
 * 정책이 허용하는 읽기"에만 쓴다(예: 익명 응원 목록). 쓰기는 여전히 admin(service_role)만
 * 한다. NEXT_PUBLIC 키라 클라이언트 노출도 안전하지만, 여기서는 서버 액션에서만 호출한다.
 */
export function createAnonSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
