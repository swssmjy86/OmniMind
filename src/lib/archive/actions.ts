"use server";

import { createServerSupabase } from "@/lib/supabase/server";

export type DeleteResult = { ok: boolean };

/** 오늘의운세 기록 개별 삭제 — 본인 것만(kind='daily'로 제한, concern actions와 동형). */
export async function deleteDailyLog(id: string): Promise<DeleteResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const { error } = await supabase
      .from("interpretations").delete().eq("id", id).eq("user_id", user.id).eq("kind", "daily");
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

/** 오늘의운세 기록 전체 삭제 — 본인 것만(kind='daily'로 제한). */
export async function deleteAllDailyLogs(): Promise<DeleteResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const { error } = await supabase
      .from("interpretations").delete().eq("user_id", user.id).eq("kind", "daily");
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
