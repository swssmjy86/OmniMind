import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { readingAccess } from "@/lib/consult/quota";
import { readingInputHash } from "@/lib/readings/hash";
import { assembleChongun } from "@/lib/interpret/content/chongun";
import { PROFILE_CONTEXT_VERSION } from "@/lib/engine/index";
import { currentDaeun } from "@/lib/engine/daeun";
import { toKstParts } from "@/lib/engine/kst";
import { PERSONAS } from "@/lib/persona/personas";
import SajuChart from "@/components/profile/SajuChart";
import ChongunPeek from "@/components/saju/ChongunPeek";
import type { ProfileRow, ReadingRow } from "@/lib/db/types";
import type { InterpretationSection } from "@/lib/interpret/types";

export const metadata: Metadata = {
  title: "총운 — 옴니마인드",
  description: "여덟 글자에 담긴 인생 전반의 흐름 — 로그인하면 무료.",
};

export const dynamic = "force-dynamic";

/**
 * 총운 풀이(2단계 스펙 §5) — 무료 상품으로 열람·캐싱·잠금 파이프라인을 검증한다.
 * 비로그인: 엿보기(본문 비노출) / 로그인·프로필 없음: 온보딩 유도 /
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

  const access = readingAccess("chongun", {
    loggedIn: Boolean(user),
    credits: 0, // 총운 판정에는 쓰이지 않는다 — 크레딧 상품은 3단계에서 실제 값 전달
    premiumUntil: null,
    now: new Date(),
  });

  if (!access.allowed) {
    // lockReason === "login" — 엿보기 + 로그인 CTA(본문은 이 응답에 없다)
    return (
      <main className="fade-rise p-6">
        {header}
        <ChongunPeek />
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

  const ctx = profile.profile_context;

  // 현재 대운 간지 — 캐시 키에 포함(대운이 바뀌면 자연 재생성, 스펙 §3)
  const t = toKstParts(new Date());
  const age = Math.max(0, t.y - Number(profile.birth_date.slice(0, 4)));
  const season = ctx.daeun ? currentDaeun(ctx.daeun, age) : null;
  const hash = readingInputHash(ctx, season?.ganzhi ?? "none");

  // 캐시 조회 → 없으면 조립해 insert(P9 §6.2). 조회·저장 실패는 조용히 새 조립으로 폴백.
  let sections: InterpretationSection[] | null = null;
  const { data: cached } = await supabase
    .from("readings").select("*")
    .eq("user_id", user!.id).eq("product", "chongun").eq("input_hash", hash)
    .gte("context_version", PROFILE_CONTEXT_VERSION)
    .maybeSingle<ReadingRow>();
  if (cached) sections = cached.sections;

  if (!sections) {
    sections = assembleChongun(ctx, profile.nickname, age);
    await supabase.from("readings").insert({
      user_id: user!.id, product: "chongun", input_hash: hash,
      context_version: PROFILE_CONTEXT_VERSION, sections,
    });
  }

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
      <Link href="/me" className="mt-6 block text-center text-sm text-text-soft underline">
        내 프로필·공유 카드 보기
      </Link>
    </main>
  );
}
