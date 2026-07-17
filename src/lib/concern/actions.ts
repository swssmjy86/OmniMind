"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { computeDaily } from "@/lib/engine/daily";
import { toKstParts, kstPartsToInstant } from "@/lib/engine/kst";
import {
  assembleConcern, concernPrompt, isConcernCategory,
} from "@/lib/interpret/content/concern";
import { respond } from "@/lib/interpret/interpret";
import { OpenRouterProvider } from "@/lib/interpret/openrouter-provider";
import { recordEvent } from "@/lib/metrics/events";
import type { ProfileRow } from "@/lib/db/types";
import type { InterpretationSection } from "@/lib/interpret/types";
import { CONCERN_MAX_LENGTH } from "./constants";
import { consultAccess, UNLIMITED, FREE_DAILY_CONSULT } from "@/lib/consult/quota";

export type ConcernResult =
  | {
      ok: true; id: string; sections: InterpretationSection[]; source: "llm" | "template";
      remaining: number; usedCredit: boolean;
    }
  | { ok: false; reason: "auth" | "no-profile" | "limit" | "error"; remaining?: number };

/**
 * 고민 입력 → 프로필+오늘 운기 종합 조언(P6). 템플릿이 항상 답하고,
 * LLM이 가능하면 '당신에게' 개인화 문단을 더한다. interpretations(kind=advice)에 보관.
 * 하루 1회 무료(P8), 그 이상은 consult_credits를 소비하며 유료 모델로 답한다.
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
    const now = new Date();
    const t = toKstParts(now);
    const dayStart = kstPartsToInstant({ y: t.y, mo: t.mo, d: t.d, h: 0, mi: 0 }).toISOString();
    const { count } = await supabase
      .from("interpretations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("kind", "advice").gte("created_at", dayStart);
    const used = count ?? 0;

    const access = consultAccess(profile.premium_until, profile.consult_credits ?? 0, used, now);
    if (!access.allowed) return { ok: false, reason: "limit", remaining: 0 };

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
    // 크레딧을 쓰는 상담이면 유료 모델로(더 깊고 구체적인 '당신에게' 문단).
    const r = await respond(
      {
        profile: profile.profile_context,
        nickname: profile.nickname,
        history: [],
        message: concernPrompt(input, concern),
      },
      {
        template: { chat: async () => "" },
        llm: access.usesCredit ? new OpenRouterProvider({ premium: true }) : undefined,
      },
    );
    const source: "llm" | "template" = r.source === "llm" && r.text ? "llm" : "template";
    if (source === "llm") sections.push({ title: "당신에게", body: r.text });

    const { data: row } = await supabase.from("interpretations").insert({
      user_id: user.id, kind: "advice", target_date: null, body: sections, source,
    }).select("id").single();

    // 상담 1회 = 실제 조언이 나간 것으로 간주(템플릿 폴백이어도 크레딧을 쓴다).
    let creditsAfter = profile.consult_credits ?? 0;
    if (access.usesCredit) {
      const { data: remainingAfter } = await supabase.rpc("consume_consult_credit");
      if (typeof remainingAfter === "number") creditsAfter = remainingAfter;
    }

    await recordEvent("concern_advice", { category, source });

    const remaining = access.remaining === UNLIMITED
      ? UNLIMITED
      : Math.max(0, FREE_DAILY_CONSULT - (used + 1)) + creditsAfter;

    return {
      ok: true, id: row?.id ?? "", sections, source, remaining, usedCredit: access.usesCredit,
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export type DeleteResult = { ok: boolean };

/** 고민 상담 로그 개별 삭제 — 본인 것만(advice 종류로 제한). */
export async function deleteConcernLog(id: string): Promise<DeleteResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const { error } = await supabase
      .from("interpretations").delete().eq("id", id).eq("user_id", user.id).eq("kind", "advice");
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

/** 고민 상담 로그 전체 삭제 — 본인 것만(advice 종류로 제한). */
export async function deleteAllConcernLogs(): Promise<DeleteResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const { error } = await supabase
      .from("interpretations").delete().eq("user_id", user.id).eq("kind", "advice");
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
