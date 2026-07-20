"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { computeProfile } from "@/lib/engine";
import { assembleProfile } from "@/lib/interpret/templates";
import { profileSynthesisPrompt, parseReportSections } from "@/lib/interpret/content/synthesis";
import { respond } from "@/lib/interpret/interpret";
import { OpenRouterProvider } from "@/lib/interpret/openrouter-provider";
import { assertTone } from "@/lib/interpret/tone-guard";
import { recordEvent } from "@/lib/metrics/events";
import { PRODUCT_PERSONA } from "@/lib/persona/products";

export interface CreateProfileInput {
  nickname: string;
  birthDate: string;
  birthTime: string | null;
  timeUnknown: boolean;
  /** 선택 — 있으면 대운까지 계산해 profile_context에 담는다 */
  gender?: "male" | "female" | null;
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
      gender: input.gender ?? undefined,
    });

    const row = {
      user_id: user.id,
      nickname: input.nickname,
      birth_date: input.birthDate,
      birth_time: input.timeUnknown ? null : input.birthTime,
      time_unknown: input.timeUnknown,
      profile_context: context,
      updated_at: new Date().toISOString(),
    };
    // 성별은 0006 마이그레이션 이후에만 존재하는 컬럼 — 실패 시 없이 재시도(방어).
    // 대운 자체는 profile_context에 이미 담겨 있어 컬럼이 없어도 기능은 온전하다.
    let upErr = input.gender
      ? (await supabase.from("profiles").upsert({ ...row, gender: input.gender })).error
      : (await supabase.from("profiles").upsert(row)).error;
    if (upErr && input.gender) {
      upErr = (await supabase.from("profiles").upsert(row)).error;
    }
    if (upErr) return { saved: false, reason: upErr.message };

    const sections = assembleProfile(context, input.nickname);
    assertTone(sections.map((s) => s.body).join("\n"));

    // P8 로그인 전용 — 성격·취향·색·현재/미래·네 가지 운(연애·사업·관계·금전)까지 엮은
    // 심층 리포트(무료 LLM, report 모드로 응답 예산을 크게 잡아 1회 시도). respond()가
    // 내부에서 이미 톤 검증까지 통과한 경우에만 source:"llm"을 돌려주므로, 실패·톤위반·
    // 타임아웃이면 조용히 템플릿 7섹션만 저장된다(3단 해석 엔진 원칙).
    const r = await respond(
      {
        profile: context,
        nickname: input.nickname,
        history: [],
        message: profileSynthesisPrompt(context, input.nickname),
        personaId: PRODUCT_PERSONA.chongun,
      },
      { llm: new OpenRouterProvider({ report: true }), template: { chat: async () => "" } },
    );
    const synthesized = r.source === "llm" && r.text;
    const finalSections = synthesized
      ? [...sections, ...parseReportSections(r.text, "당신의 이야기, 더 깊이")]
      : sections;

    await supabase.from("interpretations").upsert(
      {
        user_id: user.id, kind: "profile", target_date: null, body: finalSections,
        source: synthesized ? "llm" : "template",
      },
      { onConflict: "user_id,kind,target_date" },
    );

    await recordEvent("onboard_complete"); // 유입(ref/via)은 쿠키에서 병합
    return { saved: true };
  } catch (e) {
    return { saved: false, reason: e instanceof Error ? e.message : "unknown" };
  }
}
