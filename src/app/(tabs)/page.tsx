import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { currentMilestone, isMilestoneToday } from "@/lib/interpret/milestone";
import AdSlot from "@/components/ads/AdSlot";
import type { ProfileRow } from "@/lib/db/types";
import ProductShelf from "@/components/home/ProductShelf";

export const dynamic = "force-dynamic"; // 날짜·세션에 따라 매번 렌더

export default async function HomePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  async function signOut() {
    "use server";
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
    redirect("/"); // 로그아웃 후에도 홈 — 비로그인 상태 화면으로 자연스럽게 전환
  }

  let profile: ProfileRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    profile = data ?? null;
  }

  // 동행일: 프로필 생성일 ~ 오늘
  let companionDays = 0;
  if (profile) {
    const start = new Date(profile.created_at);
    const now = new Date();
    companionDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
  }
  const badge = currentMilestone(companionDays);
  // 배지 자체는 도달 이후 계속 보이는 상태 표시라, 팝인은 "바로 그날"에만 재생한다 —
  // 방문할 때마다 매번 튀면 "드문 축하"가 아니라 잦은 소음이 된다(모션 재설계 제안 #5).
  const justReached = Boolean(isMilestoneToday(companionDays));

  return (
    <main className="fade-rise p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          오늘의 이야기
        </h1>
        {companionDays > 0 && (
          <span className="flex items-center gap-1 text-xs text-text-soft">
            함께한 지 {companionDays}일째
            {badge && (
              <span
                className={`rounded-full bg-warm-surface px-2 py-0.5 text-primary-green ${justReached ? "badge-pop" : ""}`}
              >
                {badge.emoji} {badge.label}
              </span>
            )}
          </span>
        )}
      </div>

      {/* 오늘 밤 한 줄(§4.4) — 밤의 따뜻함 무드의 인사 */}
      <p className="mt-1 text-sm text-text-soft">오늘 밤도 당신의 이야기를 켜 두었어요.</p>

      {/* 프로필 없으면 개인화 유도 — 로그인 여부에 따라 다음 걸음을 다르게 안내 */}
      {!profile && (
        <section className="mt-4 rounded-card border border-accent-coral/30 bg-warm-surface p-5">
          <p className="text-text-soft">
            {user ? (
              <>반가워요. 이제 <span className="text-text-main">당신의 조각들</span>을 이어볼까요?</>
            ) : (
              <>나의 사주로 <span className="text-text-main">더 깊은 오늘의 기운</span>을 받아볼까요?</>
            )}
          </p>
          <Link
            href="/onboarding"
            className="active:scale-[0.97] motion-reduce:active:scale-100 mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white transition hover:opacity-90"
          >
            나를 알아보기 ✨
          </Link>
          {!user && (
            <Link
              href="/login"
              className="mt-3 block text-center text-sm text-text-soft underline"
            >
              이미 함께했던 분이라면 — 다시 이어보기 (로그인)
            </Link>
          )}
        </section>
      )}

      {/* 페르소나 상품 셸프(§4.4) */}
      <ProductShelf />

      {/* 마음 챗 · 고민 진입(§4.4) */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/mind" className="press rounded-card bg-warm-surface p-4 text-center text-sm text-text-main">
          💬 마음 챗
        </Link>
        <Link href="/concern" className="press rounded-card bg-warm-surface p-4 text-center text-sm text-text-main">
          🧭 고민 나누기
        </Link>
      </div>

      {/* 광고는 콘텐츠 흐름이 끝난 가장 아래에만 (§P4-4 비침습 원칙) */}
      <AdSlot />

      {/* 로그인 상태에서만 — 조용한 로그아웃 (/me와 같은 결) */}
      {user && (
        <form action={signOut} className="mt-8 text-center">
          <button className="press text-sm text-text-soft underline">
            잠시 떠나기 (로그아웃)
          </button>
        </form>
      )}
    </main>
  );
}
