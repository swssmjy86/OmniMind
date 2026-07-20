import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { isPremium, UNLIMITED, FREE_FOR_ALL } from "@/lib/consult/quota";
import { readingInputHash } from "@/lib/readings/hash";
import { ensureCurrentProfile } from "@/lib/readings/ensure-profile";
import {
  isCreditReadingProduct, readingSectionTitles,
} from "@/lib/interpret/content/credit-readings";
import { PROFILE_CONTEXT_VERSION } from "@/lib/engine/index";
import { currentDaeun } from "@/lib/engine/daeun";
import { toKstParts } from "@/lib/engine/kst";
import { PRODUCTS } from "@/lib/persona/products";
import { PERSONAS } from "@/lib/persona/personas";
import ReadingPeek from "@/components/saju/ReadingPeek";
import UnlockReading from "@/components/saju/UnlockReading";
import ShareSheet from "@/components/share/ShareSheet";
import ReviewPrompt from "@/components/reviews/ReviewPrompt";
import ReviewHighlights from "@/components/reviews/ReviewHighlights";
import { productReviewSummary } from "@/lib/reviews/summary";
import { profileCardQuery } from "@/lib/share/card-copy";
import type { ProfileRow, ReadingRow } from "@/lib/db/types";

export const metadata: Metadata = { title: "사주 풀이 — 옴니마인드" };
export const dynamic = "force-dynamic";

/** 크레딧 풀이 4종(3단계 스펙 §4) — 비로그인 엿보기 / 온보딩 유도 / 캐시 렌더 / 잠금+열기. */
export default async function CreditReadingPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product } = await params;
  if (!isCreditReadingProduct(product)) notFound();

  const meta = PRODUCTS.find((p) => p.id === product)!;
  const persona = PERSONAS[meta.personaId];
  const titles = readingSectionTitles(product);

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const header = (
    <>
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        {meta.title}
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        {persona.name} · {persona.greeting}
      </p>
    </>
  );

  // 비로그인 — 엿보기 + 로그인 CTA(본문은 이 응답에 없다)
  if (!user) {
    return (
      <main className="fade-rise p-6">
        {header}
        <ReadingPeek titles={titles} />
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
            이 풀이를 열려면 먼저 <span className="text-text-main">당신의 여덟 글자</span>가 필요해요.
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

  const now = new Date();
  const ctx = await ensureCurrentProfile(supabase, profile);
  const t = toKstParts(now);
  const age = Math.max(0, t.y - Number(profile.birth_date.slice(0, 4)));
  const season = ctx.daeun ? currentDaeun(ctx.daeun, age) : null;
  const hash = readingInputHash(ctx, season?.ganzhi ?? "none");

  // 재열람 — 캐시 히트는 차감 없이 바로 렌더(P9 §6.2)
  const { data: cached } = await supabase
    .from("readings").select("*")
    .eq("user_id", user.id).eq("product", product).eq("input_hash", hash)
    .gte("context_version", PROFILE_CONTEXT_VERSION)
    .maybeSingle<ReadingRow>();

  if (cached) {
    // 내 후기(있으면 표시 전용) + 상품 후기 요약 — 둘 다 실패해도 화면은 그대로(P9 §12)
    const [{ data: myReview }, productSummary] = await Promise.all([
      supabase.from("reading_reviews").select("rating, comment")
        .eq("reading_id", cached.id).maybeSingle<{ rating: number; comment: string | null }>(),
      productReviewSummary(product),
    ]);

    return (
      <main className="fade-rise p-6">
        {header}
        <div className="mt-6 space-y-4">
          {cached.sections.map((s, i) => (
            <section key={`${i}-${s.title}`} className="rounded-card bg-warm-surface p-5">
              <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
                {s.title}
              </h2>
              <p className="mt-2 leading-relaxed text-text-main">{s.body}</p>
            </section>
          ))}
        </div>
        <ShareSheet
          query={profileCardQuery(ctx, `${profile.nickname}님의 ${meta.title}`.slice(0, 20), cached.sections)}
          via="reading"
          label="풀이 카드"
        />
        <ReviewPrompt readingId={cached.id} initial={myReview ?? null} />
        <ReviewHighlights summary={productSummary} heading="이 풀이의 후기" />
        <Link href="/saju" className="mt-6 block text-center text-sm text-text-soft underline">
          다른 풀이 보러 가기
        </Link>
      </main>
    );
  }

  // FREE_FOR_ALL(무료 전환)이면 화면도 무제한으로 보여준다 — readingAccess가 실제로
  // 그렇게 판정하므로, 여기서 어긋나면 "잠긴 것처럼 보이는데 실제로는 열리는" 불일치가 생긴다.
  const premium = isPremium(profile.premium_until, now) || FREE_FOR_ALL;
  const credits = profile.consult_credits ?? 0;

  return (
    <main className="fade-rise p-6">
      {header}
      <ReadingPeek titles={titles} />
      <UnlockReading
        product={product}
        remaining={premium ? UNLIMITED : credits}
        unlimited={premium}
      />
    </main>
  );
}
