import { createServerSupabase } from "@/lib/supabase/server";
import ProfileNeeded from "@/components/profile/ProfileNeeded";
import { toKstParts } from "@/lib/engine/kst";
import { consultAccess } from "@/lib/consult/quota";
import MindChat from "@/components/chat/MindChat";
import type { ProfileRow, ChatMessageRow } from "@/lib/db/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "마음 챗 — 옴니마인드",
  description: "나의 사주·성향을 기억한 채 곁에서 이야기를 들어주는 대화 동반자.",
};

export const dynamic = "force-dynamic";

export default async function MindPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: ProfileRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    profile = data ?? null;
  }

  if (!profile) {
    return (
      <ProfileNeeded
        title="마음"
        message="마음을 나누기 전에, 먼저 당신을 알아볼까요? 당신의 결을 알아야 더 깊이 함께할 수 있어요."
        note="로그인하면 하루 한 번, 마음 이야기를 무료로 나눌 수 있어요."
      />
    );
  }

  const { data: msgs } = await supabase
    .from("chat_messages").select("*")
    .eq("user_id", user!.id).order("created_at", { ascending: true }).limit(50)
    .returns<ChatMessageRow[]>();

  const now = new Date();
  const t = toKstParts(now);
  const day = `${t.y}-${String(t.mo).padStart(2, "0")}-${String(t.d).padStart(2, "0")}`;
  const { data: counter } = await supabase
    .from("usage_counters").select("chat_count")
    .eq("user_id", user!.id).eq("day", day).maybeSingle<{ chat_count: number }>();
  const access = consultAccess(profile.premium_until, profile.consult_credits ?? 0, counter?.chat_count ?? 0, now);

  return (
    <MindChat
      nickname={profile.nickname}
      initialMessages={(msgs ?? []).map((m) => ({ id: m.id, role: m.role, content: m.content }))}
      remaining={access.remaining}
    />
  );
}
