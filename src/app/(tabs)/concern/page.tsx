import { createServerSupabase } from "@/lib/supabase/server";
import ProfileNeeded from "@/components/profile/ProfileNeeded";
import { toKstParts, kstPartsToInstant } from "@/lib/engine/kst";
import { consultAccess } from "@/lib/consult/quota";
import ConcernRoom, { type PastAdvice } from "@/components/concern/ConcernRoom";
import type { ProfileRow, InterpretationRow } from "@/lib/db/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "고민 상담 — 옴니마인드",
  description: "이직·이별·선택 앞에서 — 성향과 운의 흐름을 함께 짚어 조언을 건네요.",
};

export const dynamic = "force-dynamic";

export default async function ConcernPage() {
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
        title="고민"
        message="마음이 흔들리는 순간, 함께 생각해드릴게요. 먼저 당신의 결을 알아야 더 깊이 도울 수 있어요."
        note="로그인하면 하루 한 번, 고민 상담을 무료로 나눌 수 있어요."
      />
    );
  }

  // 지난 조언 + 오늘 사용량(KST 자정 기준, created_at으로 계산)
  const { data: rows } = await supabase
    .from("interpretations").select("*")
    .eq("user_id", user!.id).eq("kind", "advice")
    .order("created_at", { ascending: false }).limit(10)
    .returns<InterpretationRow[]>();

  const now = new Date();
  const t = toKstParts(now);
  const dayStart = kstPartsToInstant({ y: t.y, mo: t.mo, d: t.d, h: 0, mi: 0 }).toISOString();
  const usedToday = (rows ?? []).filter((r) => r.created_at >= dayStart).length;
  const access = consultAccess(profile.premium_until, profile.consult_credits ?? 0, usedToday, now);

  const past: PastAdvice[] = (rows ?? []).map((r) => {
    const p = toKstParts(new Date(r.created_at));
    return {
      id: r.id,
      date: `${p.y}.${String(p.mo).padStart(2, "0")}.${String(p.d).padStart(2, "0")}`,
      sections: r.body,
    };
  });

  return (
    <ConcernRoom
      nickname={profile.nickname}
      remaining={access.remaining}
      past={past}
    />
  );
}
