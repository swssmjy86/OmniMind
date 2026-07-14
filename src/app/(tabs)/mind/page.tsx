import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { toKstParts } from "@/lib/engine/kst";
import { chatRemaining } from "@/lib/chat/quota";
import MindChat from "@/components/chat/MindChat";
import type { ProfileRow, ChatMessageRow } from "@/lib/db/types";

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
      <main className="p-6">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">마음</h1>
        <p className="mt-4 text-text-soft">
          마음을 나누기 전에, 먼저 당신을 알아볼까요? 당신의 결을 알아야 더 깊이 함께할 수 있어요.
        </p>
        <Link
          href="/onboarding"
          className="mt-6 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
        >
          나를 알아보기 ✨
        </Link>
      </main>
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
  const remaining = chatRemaining(profile.premium_until, counter?.chat_count ?? 0, now);

  return (
    <MindChat
      nickname={profile.nickname}
      initialMessages={(msgs ?? []).map((m) => ({ role: m.role, content: m.content }))}
      remaining={remaining}
    />
  );
}
