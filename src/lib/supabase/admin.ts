import { createClient } from "@supabase/supabase-js";

/**
 * service role 클라이언트 — RLS를 우회한다. 서버 전용.
 * 결제 승인처럼 "서버가 외부 검증을 마친 뒤에만 일어나는 쓰기"에만 사용하고,
 * 절대 클라이언트 번들로 import되면 안 된다 (SUPABASE_SERVICE_ROLE_KEY는 NEXT_PUBLIC이 아님).
 */
export function createAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY 미설정");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
