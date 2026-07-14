"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { respond } from "@/lib/interpret/interpret";
import { toKstParts } from "@/lib/engine/kst";
import type { ProfileRow, ChatMessageRow } from "@/lib/db/types";
import type { ChatMsg } from "@/lib/interpret/provider";
import { DAILY_LIMIT } from "./constants";
import { isPremium, UNLIMITED } from "./quota";

export type SendResult =
  | { ok: true; reply: string; source: "llm" | "template"; remaining: number }
  | { ok: false; reason: "auth" | "no-profile" | "limit" | "error"; remaining?: number };

/** 사용자 메시지 → 프로필 맥락 respond() → 저장 → 잔여 횟수. 하루 10회 제한. */
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
    // P7 프리미엄은 하루 제한 없이 통과("마음 이야기 무제한").
    const premium = isPremium(profile.premium_until, now);
    if (!premium && used >= DAILY_LIMIT) return { ok: false, reason: "limit", remaining: 0 };

    const { data: recent } = await supabase
      .from("chat_messages").select("role,content")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10)
      .returns<Pick<ChatMessageRow, "role" | "content">[]>();
    const history: ChatMsg[] = (recent ?? []).reverse().map((m) => ({ role: m.role, content: m.content }));

    const r = await respond({
      profile: profile.profile_context,
      nickname: profile.nickname,
      history,
      message: text,
    });

    await supabase.from("chat_messages").insert([
      { user_id: user.id, role: "user", content: text, source: null },
      { user_id: user.id, role: "assistant", content: r.text, source: r.source },
    ]);
    await supabase.from("usage_counters").upsert(
      { user_id: user.id, day, chat_count: used + 1 },
      { onConflict: "user_id,day" },
    );

    return {
      ok: true, reply: r.text, source: r.source,
      remaining: premium ? UNLIMITED : DAILY_LIMIT - (used + 1),
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}
