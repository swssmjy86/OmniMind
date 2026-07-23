import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { computeDaily } from "@/lib/engine/daily";
import { assembleDaily } from "@/lib/interpret/content/daily";
import { toKstParts } from "@/lib/engine/kst";
import { PERSONAS } from "@/lib/persona/personas";
import DailyRecorder from "@/components/DailyRecorder";
import PersonaIntro from "@/components/persona/PersonaIntro";
import ShareSheet from "@/components/share/ShareSheet";
import TodayFreeFlow from "@/components/today/TodayFreeFlow";
import { dailyCardQuery } from "@/lib/share/card-copy";
import { getTodayAstroEvents } from "@/lib/kasi/astro-events-cache";
import type { ProfileRow, InterpretationRow } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "오늘의운세 — 옴니마인드",
  description: "매일 새로 흐르는 오늘의 기운 — 달지기가 밤마다 등불을 켜 두어요.",
};

export const dynamic = "force-dynamic"; // 날짜·세션에 따라 매번 렌더

/**
 * 오늘의운세 탭(스펙 §3, 2026-07-24 개정) — 로그인+프로필이면 전체(심화+띠 관계+마음 챗
 * 진입), 아니면 무료 공통 일진 + 입력 팝업 → 개인화(일간·띠·AI 이야기)까지 블러 없이
 * 전부 공개(TodayFreeFlow). 로그인은 보관함 저장·마음 챗 보너스로만 유도한다.
 */
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ input?: string }>;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  // 홈 "나를 알아보기" 경유(?input=1) — 저장된 생년월일이 있어도 입력 팝업을 띄운다.
  const forceInput = (await searchParams).input === "1";

  const todayKst = toKstParts(new Date());
  const todayDateStr = `${todayKst.y}-${String(todayKst.mo).padStart(2, "0")}-${String(todayKst.d).padStart(2, "0")}`;
  // best-effort(사용자 무관, 날짜당 전역 캐시) — 실패해도 이 섹션만 조용히 생략된다.
  const astroEvents = await getTodayAstroEvents(todayKst);

  let profile: ProfileRow | null = null;
  let cachedDaily: InterpretationRow | null = null;
  if (user) {
    const [profileRes, cachedRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>(),
      supabase.from("interpretations").select("*")
        .eq("user_id", user.id).eq("kind", "daily").eq("target_date", todayDateStr)
        .maybeSingle<InterpretationRow>(),
    ]);
    profile = profileRes.data ?? null;
    cachedDaily = cachedRes.data ?? null;
  }

  // ── 전체 뷰: 로그인+프로필 — 심화 일진 + 띠 관계 + 마음 챗 진입 ──
  if (profile) {
    const daily = computeDaily(
      { y: todayKst.y, mo: todayKst.mo, d: todayKst.d },
      profile.profile_context.dayMaster.element,
      profile.profile_context.dayMaster.stem,
    );
    const guide = assembleDaily(daily, profile.nickname, profile.profile_context.pillars);
    const llmParagraph =
      cachedDaily?.body.find((s) => s.title === "오늘, 당신만을 위한 이야기")?.body ?? null;

    return (
      <main className="fade-rise p-6">
        <PersonaIntro
          personaId="dalzigi"
          eyebrow={`🏮 ${PERSONAS.dalzigi.name} · 오늘의운세`}
          line={PERSONAS.dalzigi.homeLine}
          src="/videos/dalzigi-intro.mp4"
        />
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          오늘의운세
        </h1>
        <section className="persona-card mt-5 rounded-card bg-warm-surface p-6">
          <span aria-hidden className="persona-star" style={{ top: "12%", right: "10%" }} />
          <span aria-hidden className="persona-star" style={{ top: "26%", right: "24%" }} />
          <span aria-hidden className="persona-star" style={{ top: "16%", right: "38%" }} />
          <p className="text-xs text-text-soft">
            <span aria-hidden>🏮</span> {PERSONAS.dalzigi.name} · 오늘의운세
          </p>
          <p className="mt-2 font-[family-name:var(--font-serif-kr)] text-lg leading-relaxed text-primary-green">
            {guide.headline}
          </p>
          <p className="mt-3 leading-relaxed text-text-main">{guide.mind}</p>
          {guide.personal && (
            <p className="mt-3 rounded-card bg-warm-base p-3 text-sm leading-relaxed text-text-main">
              {guide.personal}
            </p>
          )}
          {guide.zodiacSign && (
            <p className="mt-3 rounded-card bg-warm-base p-3 text-sm leading-relaxed text-text-main">
              <span className="text-text-soft">
                {guide.zodiacSign.animal}띠인 당신에게 —{" "}
              </span>
              {guide.zodiacSign.line}
            </p>
          )}
          {llmParagraph && (
            <p className="mt-3 rounded-card border border-primary-green/20 bg-warm-base p-3 text-sm leading-relaxed text-text-main">
              🌿 {llmParagraph}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            <span className="rounded-full bg-warm-base px-3 py-1.5 text-sm text-text-soft">
              오늘의 색 · {guide.color}
            </span>
            <span className="rounded-full bg-warm-base px-3 py-1.5 text-sm text-text-soft">
              {guide.keyword}
            </span>
          </div>
          <p className="mt-4 text-sm text-text-soft">🍀 행운 포인트 — {guide.lucky}</p>
          <div className="mt-4 rounded-card bg-warm-base p-3 text-xs leading-relaxed text-text-soft">
            <p>🌙 {guide.skyLines.moon}</p>
            <p className="mt-1">☀️ {guide.skyLines.riseSet}</p>
            <p className="mt-1">{guide.skyLines.altitude}</p>
          </div>
          {astroEvents && astroEvents.length > 0 && (
            <div className="mt-3 rounded-card bg-warm-base p-3 text-xs leading-relaxed text-text-soft">
              <p className="text-text-main">✨ 오늘의 천문현상</p>
              {astroEvents.map((e, i) => (
                <p key={i} className="mt-1">
                  {e.title}
                  {e.time ? ` (${e.time})` : ""}
                </p>
              ))}
            </div>
          )}

          <details className="mt-4 text-xs text-text-soft">
            <summary className="cursor-pointer">이 풀이의 근거</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>일진은 천문 산술로 계산해 한국천문연구원 공표값 467건과 대조해 확인했어요.</li>
              <li>절기는 태양의 실제 위치로 구해 미국 해군천문대 공표값과 대조해요.</li>
              <li>계산에는 AI가 관여하지 않아요 — 문장을 다듬는 일만 맡아요.</li>
            </ul>
            <Link href="/sources" className="mt-2 inline-block underline">
              전체 근거 보기
            </Link>
          </details>
        </section>

        {/* 마음 챗 진입 — 잠금 해제된 화면에만 노출(확정 결정 7) */}
        <Link
          href="/mind"
          className="press mt-4 block rounded-card bg-warm-surface p-4 text-center text-sm text-text-main"
        >
          💬 오늘 마음에 남는 게 있다면 — 마음 챗
        </Link>

        <DailyRecorder />
        <ShareSheet
          query={dailyCardQuery(profile.profile_context, guide, llmParagraph)}
          via="daily"
          label="오늘의 나 카드"
        />
        <Link href="/archive" className="mt-4 block text-center text-sm text-text-soft underline">
          지난 기록 보기 (보관함)
        </Link>
      </main>
    );
  }

  // ── 무료 뷰: 공통 일진만 서버 계산 — 개인화 결과는 이 응답에 없다 ──
  const daily = computeDaily({ y: todayKst.y, mo: todayKst.mo, d: todayKst.d });
  const guide = assembleDaily(daily);

  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        오늘의운세
      </h1>
      <p className="mt-1 text-sm text-text-soft">
        <span aria-hidden>🏮</span> {PERSONAS.dalzigi.homeLine}
      </p>
      {/* 인트로 영상은 TodayFreeFlow가 직접 띄운다 — 입력 시트를 영상이 걷힌 뒤에
          팝업으로 띄우는 조율이 필요해서(서버 컴포넌트라 콜백을 못 넘긴다). */}
      <TodayFreeFlow
        headline={guide.headline}
        mind={guide.mind}
        color={guide.color}
        keyword={guide.keyword}
        lucky={guide.lucky}
        sky={guide.skyLines}
        astroEvents={astroEvents}
        intro={{
          personaId: "dalzigi",
          eyebrow: `🏮 ${PERSONAS.dalzigi.name} · 오늘의운세`,
          line: PERSONAS.dalzigi.homeLine,
          src: "/videos/dalzigi-intro.mp4",
        }}
        forceInput={forceInput}
      />
    </main>
  );
}
