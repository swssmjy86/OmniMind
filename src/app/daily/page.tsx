import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { computeDaily } from "@/lib/engine/daily";
import { assembleDaily } from "@/lib/interpret/content/daily";
import { toKstParts } from "@/lib/engine/kst";
import {
  HEAVENLY_STEMS, EARTHLY_BRANCHES, ELEMENTS, stemElement,
} from "@/lib/engine/constants";
import { yearSign, branchRelation } from "@/lib/engine/year-sign";
import { PERSONAS } from "@/lib/persona/personas";
import DailyRecorder from "@/components/DailyRecorder";
import ShareSheet from "@/components/share/ShareSheet";
import YearForm from "@/components/daily/YearForm";
import DailySignSection from "@/components/daily/DailySignSection";
import { dailyCardQuery } from "@/lib/share/card-copy";
import type { ProfileRow, InterpretationRow } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "오늘의 일진 — 옴니마인드",
  description: "출생 년도만으로 띠와 오늘의 일진을 풀어드려요. 누구나 무료.",
};

export const dynamic = "force-dynamic"; // 날짜·세션·쿼리에 따라 매번 렌더

/**
 * 오늘의 일진(설계서 §2) — 3상태 분기:
 * ① 프로필 있는 로그인 사용자 → 일간 기반 심화(홈에서 이사)
 * ② ?year=YYYY 유효 → 띠 일진 상세
 * ③ 그 외 → 달지기 인사 + 년도 입력 폼
 */
export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const todayKst = toKstParts(new Date());
  const todayDateStr = `${todayKst.y}-${String(todayKst.mo).padStart(2, "0")}-${String(todayKst.d).padStart(2, "0")}`;

  // ① 프로필 심화 — 홈에 있던 일진 섹션이 그대로 이사(설계서 §2·§3)
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

  if (profile) {
    const daily = computeDaily(
      { y: todayKst.y, mo: todayKst.mo, d: todayKst.d },
      profile.profile_context.dayMaster.element,
      profile.profile_context.dayMaster.stem,
    );
    const guide = assembleDaily(daily, profile.nickname);
    const llmParagraph =
      cachedDaily?.body.find((s) => s.title === "오늘, 당신만을 위한 이야기")?.body ?? null;

    return (
      <main className="fade-rise p-6">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          오늘의 일진
        </h1>
        <section className="persona-card mt-5 rounded-card bg-warm-surface p-6">
          <span aria-hidden className="persona-star" style={{ top: "12%", right: "10%" }} />
          <span aria-hidden className="persona-star" style={{ top: "26%", right: "24%" }} />
          <span aria-hidden className="persona-star" style={{ top: "16%", right: "38%" }} />
          <p className="text-xs text-text-soft">
            <span aria-hidden>🏮</span> {PERSONAS.dalzigi.name} · 오늘의 일진 — 누구나 무료
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

          {/* 이 풀이의 근거(§7.3) — 핵심 3줄 + 전체 보기 */}
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

        <DailyRecorder />
        <ShareSheet
          query={dailyCardQuery(profile.profile_context, guide)}
          via="daily"
          label="오늘의 나 카드"
        />
        <Link href="/history" className="mt-4 block text-center text-sm text-text-soft underline">
          지난 이야기 보기
        </Link>
      </main>
    );
  }

  // ② 띠 일진 — ?year 유효성: 1900 ≤ year ≤ 올해(KST)
  const parsed = yearParam ? Number(yearParam) : NaN;
  const validYear =
    Number.isInteger(parsed) && parsed >= 1900 && parsed <= todayKst.y ? parsed : null;

  if (validYear) {
    const sign = yearSign(validYear);
    // 년간 십성 개인화 — 기존 computeDaily 재사용(설계서 §4): 년간을 내 천간으로 넘긴다
    const daily = computeDaily(
      { y: todayKst.y, mo: todayKst.mo, d: todayKst.d },
      ELEMENTS[stemElement(sign.stem)],
      HEAVENLY_STEMS[sign.stem],
    );
    const guide = assembleDaily(daily);
    const todayBranch = EARTHLY_BRANCHES.indexOf(
      daily.dayGanzhi[1] as (typeof EARTHLY_BRANCHES)[number],
    );
    const relation = branchRelation(sign.branch, todayBranch);

    return (
      <main className="fade-rise p-6">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          오늘의 일진
        </h1>
        <DailySignSection year={validYear} sign={sign} relation={relation} guide={guide} />
        <p className="mt-4 text-center text-sm">
          <Link href="/daily" className="text-text-soft underline">
            다른 년도로 보기
          </Link>
        </p>
      </main>
    );
  }

  // ③ 입력 폼 — 달지기 인사. year 파라미터가 있었는데 무효면 부드러운 안내(설계서 §2)
  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        오늘의 일진
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-text-soft">
        <span aria-hidden>🏮</span> {PERSONAS.dalzigi.greeting} 태어난 해만 알려주시면, 띠와
        오늘의 기운을 함께 볼 수 있어요.
      </p>
      <YearForm currentYear={todayKst.y} invalid={Boolean(yearParam)} />
    </main>
  );
}
