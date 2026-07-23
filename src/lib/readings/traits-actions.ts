"use server";

// 풀이 입력 시트(특성 모드) — 로그인 사용자의 MBTI·혈액형을 profiles에 저장한다.
// 컬럼(mbti·blood_type)은 0014 마이그레이션에서 nullable로 남겨둔 것을 재사용한다.
import { createServerSupabase } from "@/lib/supabase/server";
import { normalizeMbti, isBloodType } from "@/lib/interpret/content/traits";

export async function saveProfileTraits(
  input: { mbti: string; blood: string },
): Promise<{ ok: boolean }> {
  try {
    const mbti = normalizeMbti(input.mbti);
    if (!mbti || !isBloodType(input.blood)) return { ok: false };

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    const { error } = await supabase
      .from("profiles")
      .update({ mbti, blood_type: input.blood, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
