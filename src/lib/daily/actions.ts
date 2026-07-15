"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { computeDaily } from "@/lib/engine/daily";
import { assembleDaily, dailyToSections } from "@/lib/interpret/content/daily";
import { toKstParts } from "@/lib/engine/kst";
import type { ProfileRow } from "@/lib/db/types";

/**
 * 오늘의 데일리를 interpretations에 1회 캐시(자정 이후 첫 방문 시 생성, 재방문 0회).
 * 로그인+프로필+마이그레이션이 있어야 동작. 그 외엔 조용히 no-op(미리보기는 홈에서 항상 표시).
 * unique(user_id,kind,target_date)로 하루 1행 보장.
 */
export async function recordTodayDaily(): Promise<void> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    if (!profile) return;

    const t = toKstParts(new Date());
    const daily = computeDaily(
      { y: t.y, mo: t.mo, d: t.d },
      profile.profile_context.dayMaster.element,
      profile.profile_context.dayMaster.stem,
    );

    // 이미 오늘 것이 있으면 생성 skip(무료 쿼터 보호 패턴; 템플릿도 동일 규칙 적용).
    const { data: existing } = await supabase
      .from("interpretations").select("id")
      .eq("user_id", user.id).eq("kind", "daily").eq("target_date", daily.date).maybeSingle();
    if (existing) return;

    const guide = assembleDaily(daily, profile.nickname);
    await supabase.from("interpretations").insert({
      user_id: user.id, kind: "daily", target_date: daily.date,
      body: dailyToSections(guide), source: "template",
    });
  } catch {
    // best-effort — 실패해도 홈 데일리 표시엔 영향 없음
  }
}
