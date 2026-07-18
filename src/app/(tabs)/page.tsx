import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { currentMilestone, isMilestoneToday } from "@/lib/interpret/milestone";
import { PRODUCTS, ACCESS_LABEL } from "@/lib/persona/products";
import { FAQ_ITEMS } from "@/app/faq/page";
import AdSlot from "@/components/ads/AdSlot";
import type { ProfileRow } from "@/lib/db/types";

export const dynamic = "force-dynamic"; // 세션에 따라 매번 렌더

/**
 * 홈(4탭 IA 스펙 §2) — 6종 풀이 그리드(→ 사주팔자 탭) + 고객리뷰(실후기 생기는
 * 4단계까지 숨김 — P9 §5.2 "빈 상태를 꾸미지 않는다") + FAQ 발췌.
 * 마음·고민 진입은 홈에 없다(확정 결정 7 — 잠금 해제 화면에만).
 */
export default async function HomePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  async function signOut() {
    "use server";
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
    redirect("/");
  }

  let profile: ProfileRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    profile = data ?? null;
  }

  let companionDays = 0;
  if (profile) {
    const start = new Date(profile.created_at);
    const now = new Date();
    companionDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
  }
  const badge = currentMilestone(companionDays);
  const justReached = Boolean(isMilestoneToday(companionDays));

  const grid = PRODUCTS.filter((p) => p.id !== "today");

  return (
    <main className="fade-rise p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          옴니마인드
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
      <p className="mt-1 text-sm text-text-soft">오늘 밤도 당신의 이야기를 켜 두었어요.</p>

      {/* 6종 풀이 그리드 — 클릭하면 사주팔자 탭으로(확정 결정: 홈 → 사주팔자 이동) */}
      <section className="mt-6" aria-label="풀이 종류">
        <div className="grid grid-cols-2 gap-3">
          {grid.map((p) => (
            <Link
              key={p.id}
              href="/saju"
              className="press rounded-card bg-warm-surface p-4"
            >
              <p className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
                {p.title}
              </p>
              <p className="mt-1 text-xs text-text-soft">{p.tagline}</p>
              <p className="mt-2 text-[11px] text-moon-gold">{ACCESS_LABEL[p.access]}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 프로필 없으면 개인화 유도 */}
      {!profile && (
        <section className="mt-6 rounded-card border border-accent-coral/30 bg-warm-surface p-5">
          <p className="text-text-soft">
            {user ? (
              <>반가워요. 이제 <span className="text-text-main">당신의 조각들</span>을 이어볼까요?</>
            ) : (
              <>나의 사주로 <span className="text-text-main">더 깊은 오늘</span>을 받아볼까요?</>
            )}
          </p>
          <Link
            href="/onboarding"
            className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
          >
            나를 알아보기 ✨
          </Link>
          {!user && (
            <Link href="/login" className="mt-3 block text-center text-sm text-text-soft underline">
              이미 함께했던 분이라면 — 다시 이어보기 (로그인)
            </Link>
          )}
        </section>
      )}

      {/* 고객리뷰 — 실제 후기가 쌓이는 4단계까지 섹션 자체를 렌더하지 않는다(P9 §5.2) */}

      {/* 자주묻는질문 발췌 3문항 */}
      <section className="mt-8" aria-label="자주 묻는 질문">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          자주 묻는 질문
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {FAQ_ITEMS.slice(0, 3).map((item) => (
            <details key={item.q} className="rounded-card bg-warm-surface p-4">
              <summary className="cursor-pointer text-sm font-medium text-text-main">
                {item.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-text-soft">{item.a}</p>
            </details>
          ))}
        </div>
        <Link href="/faq" className="mt-3 block text-center text-sm text-text-soft underline">
          전체 질문 보기
        </Link>
      </section>

      <AdSlot />

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
