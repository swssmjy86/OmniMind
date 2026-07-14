"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { computeProfile } from "@/lib/engine";
import { assembleProfile } from "@/lib/interpret/templates";
import { assertTone } from "@/lib/interpret/tone-guard";
import type { BloodType, Mbti } from "@/lib/engine/types";

export interface CreateProfileInput {
  nickname: string;
  birthDate: string;
  birthTime: string | null;
  timeUnknown: boolean;
  bloodType: BloodType;
  mbti: Mbti;
}

/**
 * 로그인 사용자면 프로필을 계산·저장(영속화)한다. 서버에서 재계산(무결성).
 * 비로그인/스키마 미적용 등은 조용히 skip — 온보딩 미리보기는 항상 동작한다.
 * 반환: 저장 성공 여부(화면 표시는 클라이언트 계산 결과를 그대로 사용).
 */
export async function saveProfile(
  input: CreateProfileInput,
): Promise<{ saved: boolean; reason?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { saved: false, reason: "not-authenticated" };

    const context = computeProfile({
      birthDate: input.birthDate,
      birthTime: input.timeUnknown ? null : input.birthTime,
      timeUnknown: input.timeUnknown,
      bloodType: input.bloodType,
      mbti: input.mbti,
    });

    const { error: upErr } = await supabase.from("profiles").upsert({
      user_id: user.id,
      nickname: input.nickname,
      birth_date: input.birthDate,
      birth_time: input.timeUnknown ? null : input.birthTime,
      time_unknown: input.timeUnknown,
      blood_type: input.bloodType,
      mbti: input.mbti,
      profile_context: context,
      updated_at: new Date().toISOString(),
    });
    if (upErr) return { saved: false, reason: upErr.message };

    const sections = assembleProfile(context, input.nickname);
    assertTone(sections.map((s) => s.body).join("\n"));
    await supabase.from("interpretations").upsert(
      { user_id: user.id, kind: "profile", target_date: null, body: sections, source: "template" },
      { onConflict: "user_id,kind,target_date" },
    );

    return { saved: true };
  } catch (e) {
    return { saved: false, reason: e instanceof Error ? e.message : "unknown" };
  }
}
