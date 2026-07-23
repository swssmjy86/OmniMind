import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { GUEST_READING_ACCESS } from "@/lib/consult/quota";
import { readingInputHash, withTraits } from "@/lib/readings/hash";
import { profileTraits, traitsMissing } from "@/lib/readings/profile-traits";
import { ensureCurrentProfile } from "@/lib/readings/ensure-profile";
import { assembleChongun } from "@/lib/interpret/content/chongun";
import { PROFILE_CONTEXT_VERSION } from "@/lib/engine/index";
import { currentDaeun } from "@/lib/engine/daeun";
import { toKstParts } from "@/lib/engine/kst";
import { PERSONAS } from "@/lib/persona/personas";
import SajuChart from "@/components/profile/SajuChart";
import GuestReadingView from "@/components/saju/GuestReadingView";
import LoginRequiredNotice from "@/components/saju/LoginRequiredNotice";
import ProfileTraitsGate from "@/components/saju/ProfileTraitsGate";
import ShareSheet from "@/components/share/ShareSheet";
import ReviewPrompt from "@/components/reviews/ReviewPrompt";
import ReviewHighlights from "@/components/reviews/ReviewHighlights";
import { productReviewSummary } from "@/lib/reviews/summary";
import { profileCardQuery } from "@/lib/share/card-copy";
import type { ProfileRow, ReadingRow } from "@/lib/db/types";
import type { InterpretationSection } from "@/lib/interpret/types";

export const metadata: Metadata = {
  title: "총운 — 옴니마인드",
  description: "여덟 글자에 담긴 인생 전반의 흐름.",
};

export const dynamic = "force-dynamic";

/**
 * 총운 풀이 — 비로그인: 게스트 뷰(입력 시트 → 즉시 계산, GUEST_READING_ACCESS) /
 * 로그인·프로필 없음: 온보딩 유도 / 로그인+프로필·보조축 없음: 특성 시트 관문 /
 * 로그인+프로필: readings 캐시 경유(같은 입력이면 재생성 없음 — P9 §6.2).
 */
export default async function ChongunPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const seoon = PERSONAS.seoon;
  const header = (
    <>
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        총운
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        <span aria-hidden>📜</span> {seoon.name} · {seoon.greeting}
      </p>
    </>
  );

  if (!user) {
    if (GUEST_READING_ACCESS) {
      return (
        <main className="fade-rise p-6">
          {header}
          <GuestReadingView product="chongun" title="총운" />
        </main>
      );
    }
    return (
      <main className="fade-rise p-6">
        {header}
        <LoginRequiredNotice message="총운을 보려면" />
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("user_id", user!.id).maybeSingle<ProfileRow>();

  if (!profile) {
    return (
      <main className="fade-rise p-6">
        {header}
        <section className="mt-6 rounded-card border border-accent-coral/30 bg-warm-surface p-5">
          <p className="text-text-soft">
            총운을 풀려면 먼저 <span className="text-text-main">당신의 여덟 글자</span>가 필요해요.
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

  // 보조축(MBTI·혈액형) 미입력 — 풀이 대신 입력 시트 관문(2026-07-23 스펙).
  if (traitsMissing(profile)) {
    return (
      <main className="fade-rise p-6">
        {header}
        <ProfileTraitsGate personaId="seoon" />
      </main>
    );
  }

  const ctx = await ensureCurrentProfile(supabase, profile);
  const traits = profileTraits(profile);

  // 현재 대운 간지 — 캐시 키에 포함(대운이 바뀌면 자연 재생성, 스펙 §3). 보조축도 값이
  // 있을 때만 키에 섞인다(withTraits) — 과거 캐시·후기를 지키는 조건부 래핑.
  const t = toKstParts(new Date());
  const age = Math.max(0, t.y - Number(profile.birth_date.slice(0, 4)));
  const season = ctx.daeun ? currentDaeun(ctx.daeun, age) : null;
  const hash = readingInputHash(withTraits(ctx, traits), season?.ganzhi ?? "none");

  // 캐시 조회 → 없으면 조립해 insert(P9 §6.2). 조회·저장 실패는 조용히 새 조립으로 폴백.
  let sections: InterpretationSection[] | null = null;
  let readingId: string | null = null;
  const { data: cached } = await supabase
    .from("readings").select("*")
    .eq("user_id", user!.id).eq("product", "chongun").eq("input_hash", hash)
    .gte("context_version", PROFILE_CONTEXT_VERSION)
    .maybeSingle<ReadingRow>();
  if (cached) {
    sections = cached.sections;
    readingId = cached.id;
  }

  if (!sections) {
    sections = assembleChongun(ctx, profile.nickname, age, traits);
    const { data: inserted } = await supabase.from("readings").insert({
      user_id: user!.id, product: "chongun", input_hash: hash,
      context_version: PROFILE_CONTEXT_VERSION, sections,
    }).select("id").single<{ id: string }>();
    readingId = inserted?.id ?? null;
  }

  // 내 후기(readingId 있을 때만) + 총운 후기 요약 — 둘 다 실패해도 화면은 그대로(P9 §12)
  const [{ data: myReview }, chongunSummary] = await Promise.all([
    readingId
      ? supabase.from("reading_reviews").select("rating, comment")
          .eq("reading_id", readingId).maybeSingle<{ rating: number; comment: string | null }>()
      : Promise.resolve({ data: null }),
    productReviewSummary("chongun"),
  ]);

  return (
    <main className="fade-rise p-6">
      {header}
      <div className="mt-6">
        <SajuChart ctx={ctx} />
      </div>
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
        query={profileCardQuery(ctx, `${profile.nickname}님의 총운`.slice(0, 20), sections)}
        via="reading"
        label="풀이 카드"
      />
      {readingId && <ReviewPrompt readingId={readingId} initial={myReview ?? null} />}
      <ReviewHighlights summary={chongunSummary} heading="이 풀이의 후기" />
      <Link href="/me" className="mt-6 block text-center text-sm text-text-soft underline">
        내 프로필·공유 카드 보기
      </Link>
    </main>
  );
}
