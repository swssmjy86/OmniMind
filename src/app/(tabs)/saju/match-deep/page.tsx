import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { isPremium, FREE_FOR_ALL } from "@/lib/consult/quota";
import { matchDeepSectionTitles } from "@/lib/interpret/content/match-deep";
import { PERSONAS } from "@/lib/persona/personas";
import ReadingPeek from "@/components/saju/ReadingPeek";
import MatchDeepForm from "@/components/saju/MatchDeepForm";
import ReviewPrompt from "@/components/reviews/ReviewPrompt";
import ReviewHighlights from "@/components/reviews/ReviewHighlights";
import { productReviewSummary } from "@/lib/reviews/summary";
import type { ProfileRow, ReadingRow } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "궁합 심층 — 옴니마인드",
  description: "두 사람의 사주 전체가 만나는 이야기 — 상대 정보로 깊이 풀어드려요.",
};

export const dynamic = "force-dynamic";

/** 궁합 심층(3단계 스펙 §5) — 상대 입력형 크레딧 풀이. 지난 기록은 재열람 무료. */
export default async function MatchDeepPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const hongyeon = PERSONAS.hongyeon;
  const header = (
    <>
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        궁합 심층
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        {hongyeon.name} · {hongyeon.greeting}
      </p>
    </>
  );

  if (!user) {
    return (
      <main className="fade-rise p-6">
        {header}
        <ReadingPeek titles={matchDeepSectionTitles("연인")} />
        <Link
          href="/login"
          className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
        >
          로그인하고 시작하기 ✨
        </Link>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();

  if (!profile) {
    return (
      <main className="fade-rise p-6">
        {header}
        <section className="mt-6 rounded-card border border-accent-coral/30 bg-warm-surface p-5">
          <p className="text-text-soft">
            궁합을 보려면 먼저 <span className="text-text-main">당신의 여덟 글자</span>가 필요해요.
          </p>
          <Link
            href="/onboarding"
            className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
          >
            나를 알아보기 ✨
          </Link>
        </section>
      </main>
    );
  }

  // FREE_FOR_ALL(무료 전환)이면 화면도 무제한으로 보여준다 — readingAccess가 실제로
  // 그렇게 판정하므로, 여기서 어긋나면 "잠긴 것처럼 보이는데 실제로는 열리는" 불일치가 생긴다.
  const premium = isPremium(profile.premium_until, new Date()) || FREE_FOR_ALL;
  const credits = profile.consult_credits ?? 0;

  // 지난 심층 궁합 — 재열람 무료(캐시 행 그대로)
  const { data: past } = await supabase
    .from("readings").select("*")
    .eq("user_id", user.id).eq("product", "match")
    .order("created_at", { ascending: false }).limit(10)
    .returns<ReadingRow[]>();

  // 내 후기(지난 기록별) — 실패해도 화면은 그대로(P9 §12)
  const pastIds = (past ?? []).map((r) => r.id);
  const { data: myReviews } = pastIds.length
    ? await supabase.from("reading_reviews").select("reading_id, rating, comment").in("reading_id", pastIds)
        .returns<{ reading_id: string; rating: number; comment: string | null }[]>()
    : { data: [] as { reading_id: string; rating: number; comment: string | null }[] };
  const reviewsById = new Map((myReviews ?? []).map((r) => [r.reading_id, { rating: r.rating, comment: r.comment }]));
  const matchSummary = await productReviewSummary("match");

  return (
    <main className="fade-rise p-6">
      {header}
      <MatchDeepForm remaining={credits} unlimited={premium} />

      {(past ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
            지난 궁합 기록
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {(past ?? []).map((r) => (
              <details key={r.id} className="rounded-card bg-warm-surface p-4">
                <summary className="cursor-pointer text-sm text-text-main">
                  {r.created_at.slice(0, 10)} · {r.sections[0]?.body.slice(0, 24)}…
                </summary>
                <div className="mt-3 space-y-3">
                  {r.sections.map((s, i) => (
                    <div key={`${i}-${s.title}`}>
                      <p className="text-sm font-medium text-primary-green">{s.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-text-main">{s.body}</p>
                    </div>
                  ))}
                </div>
                <ReviewPrompt readingId={r.id} initial={reviewsById.get(r.id) ?? null} />
              </details>
            ))}
          </div>
        </section>
      )}

      <ReviewHighlights summary={matchSummary} heading="이 풀이의 후기" />
    </main>
  );
}
