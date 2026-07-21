import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { isPremium, UNLIMITED, FREE_FOR_ALL, GUEST_READING_ACCESS } from "@/lib/consult/quota";
import { readingInputHash } from "@/lib/readings/hash";
import { ensureCurrentProfile } from "@/lib/readings/ensure-profile";
import {
  isCreditReadingProduct, readingSectionTitles,
} from "@/lib/interpret/content/credit-readings";
import { unlockReading } from "@/lib/readings/actions";
import { PROFILE_CONTEXT_VERSION } from "@/lib/engine/index";
import { currentDaeun } from "@/lib/engine/daeun";
import { toKstParts } from "@/lib/engine/kst";
import { PRODUCTS } from "@/lib/persona/products";
import { PERSONAS } from "@/lib/persona/personas";
import GuestReadingView from "@/components/saju/GuestReadingView";
import LoginRequiredNotice from "@/components/saju/LoginRequiredNotice";
import ReadingPeek from "@/components/saju/ReadingPeek";
import UnlockReading from "@/components/saju/UnlockReading";
import ShareSheet from "@/components/share/ShareSheet";
import ReviewPrompt from "@/components/reviews/ReviewPrompt";
import ReviewHighlights from "@/components/reviews/ReviewHighlights";
import { productReviewSummary } from "@/lib/reviews/summary";
import { profileCardQuery } from "@/lib/share/card-copy";
import type { ProfileRow, ReadingRow } from "@/lib/db/types";
import type { InterpretationSection } from "@/lib/interpret/types";

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

  if (!user) {
    if (GUEST_READING_ACCESS) {
      return (
        <main className="fade-rise p-6">
          {header}
          <GuestReadingView product={product} title={meta.title} />
        </main>
      );
    }
    return (
      <main className="fade-rise p-6">
        {header}
        <LoginRequiredNotice message="이 풀이를 보려면" />
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

  let sections: InterpretationSection[] | null = null;
  let readingId: string | null = null;
  if (cached) {
    sections = cached.sections;
    readingId = cached.id;
  } else if (FREE_FOR_ALL) {
    // 무료 전환이면 블러+클릭 잠금 없이 곧바로 계산해 보여준다(§블러 기능 삭제 결정,
    // 2026-07-21). ReadingPeek/UnlockReading은 지우지 않고 아래 폴백으로 남겨둔다 —
    // 유료 전환 시 이 분기만 걷어내면 그대로 되돌아간다.
    const r = await unlockReading(product);
    if (r.ok) {
      sections = r.sections;
      readingId = r.readingId;
    }
  }

  if (sections) {
    // 내 후기(readingId 있을 때만) + 상품 후기 요약 — 둘 다 실패해도 화면은 그대로(P9 §12)
    const [{ data: myReview }, productSummary] = await Promise.all([
      readingId
        ? supabase.from("reading_reviews").select("rating, comment")
            .eq("reading_id", readingId).maybeSingle<{ rating: number; comment: string | null }>()
        : Promise.resolve({ data: null }),
      productReviewSummary(product),
    ]);

    return (
      <main className="fade-rise p-6">
        {header}
        <div className="mt-6 space-y-4">
          {sections.map((s, i) => (
            <section key={`${i}-${s.title}`} className="rounded-card bg-warm-surface p-5">
              <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
                {s.title}
              </h2>
              <p className="mt-2 leading-relaxed text-text-main">{s.body}</p>
            </section>
          ))}
        </div>
        <ShareSheet
          query={profileCardQuery(ctx, `${profile.nickname}님의 ${meta.title}`.slice(0, 20), sections)}
          via="reading"
          label="풀이 카드"
        />
        {readingId && <ReviewPrompt readingId={readingId} initial={myReview ?? null} />}
        <ReviewHighlights summary={productSummary} heading="이 풀이의 후기" />
        <Link href="/saju" className="mt-6 block text-center text-sm text-text-soft underline">
          다른 풀이 보러 가기
        </Link>
      </main>
    );
  }

  // FREE_FOR_ALL이 꺼져 있거나(유료 전환 후) 위 즉시 계산이 실패했을 때만 도달하는 폴백.
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
