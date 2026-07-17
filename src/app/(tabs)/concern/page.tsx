import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { toKstParts, kstPartsToInstant } from "@/lib/engine/kst";
import { consultAccess } from "@/lib/consult/quota";
import ConcernRoom, { type PastAdvice } from "@/components/concern/ConcernRoom";
import type { ProfileRow, InterpretationRow } from "@/lib/db/types";

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
      <main className="p-6">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">고민</h1>
        <p className="mt-4 text-text-soft">
          마음이 흔들리는 순간, 함께 생각해드릴게요. 먼저 당신의 결을 알아야 더 깊이 도울 수 있어요.
        </p>
        <p className="mt-2 text-xs text-text-soft">
          로그인하면 하루 한 번, 고민 상담을 무료로 나눌 수 있어요.
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
