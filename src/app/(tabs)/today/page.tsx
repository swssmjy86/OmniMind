import type { Metadata } from "next";
import { computeDaily } from "@/lib/engine/daily";
import { assembleDaily } from "@/lib/interpret/content/daily";
import { toKstParts } from "@/lib/engine/kst";
import { PERSONAS } from "@/lib/persona/personas";
import { PERSONA_VIDEOS } from "@/lib/persona/videos";
import TodayFreeFlow from "@/components/today/TodayFreeFlow";
import { getTodayAstroEvents } from "@/lib/kasi/astro-events-cache";

export const metadata: Metadata = {
  title: "오늘의운세 — 옴니마인드",
  description: "매일 새로 흐르는 오늘의 기운 — 달지기가 밤마다 등불을 켜 두어요.",
};

export const dynamic = "force-dynamic"; // 날짜에 따라 매번 렌더

/**
 * 오늘의운세 탭 — 익명. 무료 공통 일진 + 입력 팝업 → 개인화(일간·띠·AI 이야기)까지 전부
 * 공개(TodayFreeFlow). 생년월일은 기기(localStorage)에 저장되고 개인화는 클라이언트가 계산한다.
 */
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ input?: string }>;
}) {
  // 홈 "나를 알아보기" 경유(?input=1) — 저장된 생년월일이 있어도 입력 팝업을 띄운다.
  const forceInput = (await searchParams).input === "1";

  const todayKst = toKstParts(new Date());
  // best-effort(사용자 무관, 날짜당 전역 캐시) — 실패해도 이 섹션만 조용히 생략된다.
  const astroEvents = await getTodayAstroEvents(todayKst);

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
          src: PERSONA_VIDEOS.dalzigi,
        }}
        forceInput={forceInput}
      />
    </main>
  );
}
