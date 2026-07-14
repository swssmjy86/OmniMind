import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { computeDaily } from "@/lib/engine/daily";
import { assembleDaily } from "@/lib/interpret/content/daily";
import { currentMilestone } from "@/lib/interpret/milestone";
import { toKstParts } from "@/lib/engine/kst";
import DailyRecorder from "@/components/DailyRecorder";
import type { ProfileRow } from "@/lib/db/types";

export const dynamic = "force-dynamic"; // 날짜·세션에 따라 매번 렌더

export default async function HomePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  // 저장된 프로필(로그인 + 마이그레이션 적용 시). 실패는 조용히 무시.
  let profile: ProfileRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    profile = data ?? null;
  }

  const todayKst = toKstParts(new Date()); // 서버 UTC → KST 오늘
  const daily = computeDaily(
    { y: todayKst.y, mo: todayKst.mo, d: todayKst.d },
    profile?.profile_context.dayMaster.element,
  );
  const guide = assembleDaily(daily, profile?.nickname);

  // 동행일: 프로필 생성일 ~ 오늘
  let companionDays = 0;
  if (profile) {
    const start = new Date(profile.created_at);
    const now = new Date();
    companionDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
  }
  const badge = currentMilestone(companionDays);

  return (
    <main className="p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          오늘의 이야기
        </h1>
        {companionDays > 0 && (
          <span className="flex items-center gap-1 text-xs text-text-soft">
            함께한 지 {companionDays}일째
            {badge && (
              <span className="rounded-full bg-warm-surface px-2 py-0.5 text-primary-green">
                {badge.emoji} {badge.label}
              </span>
            )}
          </span>
        )}
      </div>

      {/* 오늘의 기운 */}
      <section className="mt-5 rounded-card bg-warm-surface p-6">
        <p className="font-[family-name:var(--font-serif-kr)] text-lg leading-relaxed text-primary-green">
          {guide.headline}
        </p>
        <p className="mt-3 leading-relaxed text-text-main">{guide.mind}</p>
        {guide.personal && (
          <p className="mt-3 rounded-card bg-warm-base p-3 text-sm leading-relaxed text-text-main">
            {guide.personal}
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
      </section>

      {profile && (
        <>
          <DailyRecorder />
          <Link href="/history" className="mt-4 block text-center text-sm text-text-soft underline">
            지난 이야기 보기
          </Link>
        </>
      )}

      {/* 프로필 없으면 개인화 유도 */}
      {!profile && (
        <section className="mt-4 rounded-card border border-accent-coral/30 bg-warm-surface p-5">
          <p className="text-text-soft">
            나의 사주로 <span className="text-text-main">더 깊은 오늘의 기운</span>을 받아볼까요?
          </p>
          <Link
            href="/onboarding"
            className="mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
          >
            나를 알아보기 ✨
          </Link>
        </section>
      )}
    </main>
  );
}
