"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { respond } from "@/lib/interpret/interpret";
import { OpenRouterProvider } from "@/lib/interpret/openrouter-provider";
import { toKstParts } from "@/lib/engine/kst";
import type { ProfileRow, ChatMessageRow } from "@/lib/db/types";
import type { ChatMsg } from "@/lib/interpret/provider";
import { consultAccess, isPremium, UNLIMITED, FREE_DAILY_CONSULT } from "@/lib/consult/quota";

export type SendResult =
  | {
      ok: true; reply: string; source: "llm" | "template"; remaining: number; usedCredit: boolean;
      userMessageId: string | null; assistantMessageId: string | null;
    }
  | { ok: false; reason: "auth" | "no-profile" | "limit" | "error"; remaining?: number };

/**
 * 사용자 메시지 → 프로필 맥락 respond() → 저장 → 잔여 횟수(P8).
 * 하루 1회 무료(로그인), 그 이상은 consult_credits를 소비하며 유료 모델로 응답한다.
 * 레거시 30일 이용권(premium_until) 보유자는 무제한.
 */
export async function sendMessage(message: string): Promise<SendResult> {
  const text = message.trim();
  if (!text) return { ok: false, reason: "error" };

  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    if (!profile) return { ok: false, reason: "no-profile" };

    const now = new Date();
    const t = toKstParts(now);
    const day = `${t.y}-${String(t.mo).padStart(2, "0")}-${String(t.d).padStart(2, "0")}`;

    const { data: counter } = await supabase
      .from("usage_counters").select("chat_count")
      .eq("user_id", user.id).eq("day", day).maybeSingle<{ chat_count: number }>();
    const used = counter?.chat_count ?? 0;

    const access = consultAccess(profile.premium_until, profile.consult_credits ?? 0, used, now);
    if (!access.allowed) return { ok: false, reason: "limit", remaining: 0 };

    const { data: recent } = await supabase
      .from("chat_messages").select("role,content")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10)
      .returns<Pick<ChatMessageRow, "role" | "content">[]>();
    const history: ChatMsg[] = (recent ?? []).reverse().map((m) => ({ role: m.role, content: m.content }));

    const r = await respond(
      { profile: profile.profile_context, nickname: profile.nickname, history, message: text },
      access.usesCredit ? { llm: new OpenRouterProvider({ premium: true }) } : {},
    );

    // insert 배열 순서(user→assistant)는 그대로 반환 행 순서로 유지된다.
    const { data: inserted } = await supabase.from("chat_messages").insert([
      { user_id: user.id, role: "user", content: text, source: null },
      { user_id: user.id, role: "assistant", content: r.text, source: r.source },
    ]).select("id");
    await supabase.from("usage_counters").upsert(
      { user_id: user.id, day, chat_count: used + 1 },
      { onConflict: "user_id,day" },
    );

    // 상담 1회 = 실제 응답이 나간 것으로 간주(템플릿 폴백이어도 크레딧을 쓴다).
    let creditsAfter = profile.consult_credits ?? 0;
    if (access.usesCredit) {
      const { data: remainingAfter } = await supabase.rpc("consume_consult_credit");
      if (typeof remainingAfter === "number") creditsAfter = remainingAfter;
    }

    const premium = isPremium(profile.premium_until, now);
    const remaining = premium
      ? UNLIMITED
      : Math.max(0, FREE_DAILY_CONSULT - (used + 1)) + creditsAfter;

    return {
      ok: true, reply: r.text, source: r.source, remaining, usedCredit: access.usesCredit,
      userMessageId: inserted?.[0]?.id ?? null,
      assistantMessageId: inserted?.[1]?.id ?? null,
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export type DeleteResult = { ok: boolean };

/** 마음 대화 로그 개별 삭제 — 본인 것만. */
export async function deleteChatMessage(id: string): Promise<DeleteResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const { error } = await supabase
      .from("chat_messages").delete().eq("id", id).eq("user_id", user.id);
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

/** 마음 대화 로그 전체 삭제 — 본인 것만. */
export async function deleteAllChatMessages(): Promise<DeleteResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const { error } = await supabase.from("chat_messages").delete().eq("user_id", user.id);
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
