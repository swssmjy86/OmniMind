"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { computeDaily } from "@/lib/engine/daily";
import { toKstParts, kstPartsToInstant } from "@/lib/engine/kst";
import {
  assembleConcern, concernPrompt, isConcernCategory,
} from "@/lib/interpret/content/concern";
import { respond } from "@/lib/interpret/interpret";
import { recordEvent } from "@/lib/metrics/events";
import type { ProfileRow } from "@/lib/db/types";
import type { InterpretationSection } from "@/lib/interpret/types";
import { CONCERN_DAILY_LIMIT, CONCERN_MAX_LENGTH } from "./constants";

export type ConcernResult =
  | { ok: true; sections: InterpretationSection[]; source: "llm" | "template"; remaining: number }
  | { ok: false; reason: "auth" | "no-profile" | "limit" | "error"; remaining?: number };

/**
 * 고민 입력 → 프로필+오늘 운기 종합 조언(P6). 템플릿이 항상 답하고,
 * LLM이 가능하면 '당신에게' 개인화 문단을 더한다. interpretations(kind=advice)에 보관.
 * 하루 CONCERN_DAILY_LIMIT회 제한(챗 쿼터와 별도).
 */
export async function submitConcern(category: string, text: string): Promise<ConcernResult> {
  const concern = text.trim().slice(0, CONCERN_MAX_LENGTH);
  if (!concern || !isConcernCategory(category)) return { ok: false, reason: "error" };

  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    if (!profile) return { ok: false, reason: "no-profile" };

    // 오늘(KST) 사용량 — advice는 target_date가 없어 created_at으로 센다.
    const t = toKstParts(new Date());
    const dayStart = kstPartsToInstant({ y: t.y, mo: t.mo, d: t.d, h: 0, mi: 0 }).toISOString();
    const { count } = await supabase
      .from("interpretations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("kind", "advice").gte("created_at", dayStart);
    const used = count ?? 0;
    if (used >= CONCERN_DAILY_LIMIT) return { ok: false, reason: "limit", remaining: 0 };

    const daily = computeDaily(
      { y: t.y, mo: t.mo, d: t.d },
      profile.profile_context.dayMaster.element,
      profile.profile_context.dayMaster.stem,
    );
    const input = {
      profile: profile.profile_context,
      daily,
      category,
      nickname: profile.nickname,
    };
    const sections: InterpretationSection[] = [
      { title: "고민", body: concern },
      ...assembleConcern(input),
    ];

    // LLM 개인화(1단계) — 실패하면 빈 문자열 템플릿으로 떨어져 조용히 생략된다.
    const r = await respond(
      {
        profile: profile.profile_context,
        nickname: profile.nickname,
        history: [],
        message: concernPrompt(input, concern),
      },
      { template: { chat: async () => "" } },
    );
    const source: "llm" | "template" = r.source === "llm" && r.text ? "llm" : "template";
    if (source === "llm") sections.push({ title: "당신에게", body: r.text });

    await supabase.from("interpretations").insert({
      user_id: user.id, kind: "advice", target_date: null, body: sections, source,
    });
    await recordEvent("concern_advice", { category, source });

    return { ok: true, sections, source, remaining: CONCERN_DAILY_LIMIT - (used + 1) };
  } catch {
    return { ok: false, reason: "error" };
  }
}
