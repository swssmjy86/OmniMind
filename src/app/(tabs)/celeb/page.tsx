import type { Metadata } from "next";
import ProfileNeeded from "@/components/profile/ProfileNeeded";
import { createServerSupabase } from "@/lib/supabase/server";
import { isPremium, FREE_FOR_ALL, GUEST_READING_ACCESS } from "@/lib/consult/quota";
import { PERSONAS } from "@/lib/persona/personas";
import CelebMatchView from "@/components/celeb/CelebMatchView";
import GuestCelebGate from "@/components/celeb/GuestCelebGate";
import LoginRequiredNotice from "@/components/saju/LoginRequiredNotice";
import type { ProfileRow } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "유명인 궁합 — 옴니마인드",
  description: "그 사람과 나의 결은 어떻게 만날까 — 널리 알려진 이들과 사주로 맞춰보는 자리.",
};

export const dynamic = "force-dynamic";

/**
 * 유명인 사주 궁합 탭(2026-07-26) — 보관함이 쓰던 네 번째 탭 자리를 이어받는다.
 * 계산은 기존 궁합 심층 경로 그대로(새 엔진 없음), 상대만 유명인 상수에서 온다.
 */
export default async function CelebPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const yeonri = PERSONAS.yeonri;
  const header = (
    <>
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        유명인 궁합
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        {yeonri.name} · 그 사람과 나의 결이 어떻게 만나는지 함께 들여다봐요.
      </p>
    </>
  );

  if (!user) {
    return (
      <main className="fade-rise p-6">
        {header}
        {GUEST_READING_ACCESS ? <GuestCelebGate /> : <LoginRequiredNotice message="궁합을 보려면" />}
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();

  if (!profile) {
    return (
      <ProfileNeeded
        header={header}
        message={
          <>
            맞춰보려면 먼저 <span className="text-text-main">당신의 여덟 글자</span>가 필요해요.
          </>
        }
      />
    );
  }

  // FREE_FOR_ALL(무료 전환)이면 화면도 무제한으로 — readingAccess가 실제로 그렇게 판정하므로,
  // 여기서 어긋나면 "잠긴 것처럼 보이는데 실제로는 열리는" 불일치가 생긴다(match-deep와 동일).
  const premium = isPremium(profile.premium_until, new Date()) || FREE_FOR_ALL;

  return (
    <main className="fade-rise p-6">
      {header}
      <CelebMatchView remaining={profile.consult_credits ?? 0} unlimited={premium} />
    </main>
  );
}
