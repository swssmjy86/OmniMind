import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { currentDaeun } from "@/lib/engine/daeun";
import { daeunSeasonText } from "@/lib/interpret/content/daeun";
import { toKstParts } from "@/lib/engine/kst";
import { assembleProfile } from "@/lib/interpret/templates";
import { profileCardQuery } from "@/lib/share/card-copy";
import SajuChart from "@/components/profile/SajuChart";
import ShareSheet from "@/components/share/ShareSheet";
import type { ProfileRow, InterpretationRow } from "@/lib/db/types";

export default async function MePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function signOut() {
    "use server";
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
    redirect("/login");
  }

  // 저장된 프로필 조회(로그인 + 마이그레이션 적용 시). 실패는 조용히 무시.
  let profile: ProfileRow | null = null;
  let sections: { title: string; body: string }[] = [];
  if (user) {
    const { data } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    profile = data ?? null;
    if (profile) {
      const { data: interp } = await supabase
        .from("interpretations").select("*")
        .eq("user_id", user.id).eq("kind", "profile").maybeSingle<InterpretationRow>();
      sections = interp?.body ?? assembleProfile(profile.profile_context, profile.nickname);
    }
  }

  if (!profile) {
    return (
      <main className="p-6">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          온전한 나
        </h1>
        <div className="mt-4">
          <p className="text-text-soft">
            {user
              ? `반가워요, ${user.user_metadata?.name ?? "당신"}님. 당신의 조각들을 이어볼까요?`
              : "사주·MBTI·혈액형·별자리를 종합해 '온전한 나'를 만나보세요."}
          </p>
          <Link
            href="/onboarding"
            className="press mt-6 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
          >
            나를 알아보기 ✨
          </Link>
          {user && (
            <form action={signOut} className="mt-4">
              <button className="press text-sm text-text-soft underline">잠시 떠나기 (로그아웃)</button>
            </form>
          )}
        </div>
      </main>
    );
  }

  const ctx = profile.profile_context;

  // 운의 계절(대운) — 성별을 알 때만. 만 나이 근사(햇수 나이 - 1 보정 없이 연 단위).
  let seasonCard: { ganzhi: string; fromAge: number; toAge: number } | null = null;
  if (ctx.daeun) {
    const t = toKstParts(new Date());
    const birthYear = Number(profile.birth_date.slice(0, 4));
    const age = Math.max(0, t.y - birthYear);
    seasonCard = currentDaeun(ctx.daeun, age);
  }

  return (
    <main className="fade-rise p-6 pb-24">
      <p className="text-text-soft">온전한 나</p>
      <h1 className="mt-1 font-[family-name:var(--font-serif-kr)] text-3xl text-primary-green">
        {profile.nickname}님의 이야기
      </h1>

      <div className="mt-6">
        <SajuChart ctx={ctx} />
      </div>

      {/* 운의 계절 — 10년 단위 큰 흐름(대운) */}
      {seasonCard && (
        <section className="mt-4 rounded-card bg-warm-surface p-5">
          <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
            운의 계절
          </h2>
          <p className="mt-2 leading-relaxed text-text-main">
            지금 당신은 <span className="font-medium">{seasonCard.ganzhi}</span> 대운을 지나고
            있어요 — {seasonCard.fromAge}세부터 {seasonCard.toAge}세까지, 10년의 큰 계절이에요.{" "}
            {daeunSeasonText(seasonCard.ganzhi)}
          </p>
        </section>
      )}
      {!seasonCard && ctx.daeun && (
        <section className="mt-4 rounded-card bg-warm-surface p-5">
          <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
            운의 계절
          </h2>
          <p className="mt-2 leading-relaxed text-text-main">
            당신의 첫 대운은 {ctx.daeun.startAge}세에 시작돼요. 아직은 타고난 결이 자라나는
            계절이에요.
          </p>
        </section>
      )}
      {!ctx.daeun && (
        <p className="mt-4 rounded-card bg-warm-surface p-4 text-sm text-text-soft">
          성별을 알려주시면 10년 단위 운의 흐름(대운)까지 읽어드려요 —{" "}
          <Link href="/onboarding" className="underline">
            이야기 다시 잇기
          </Link>
        </p>
      )}

      <div className="mt-6 space-y-4">
        {sections.map((s) => (
          <section key={s.title} className="rounded-card bg-warm-surface p-5">
            <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
              {s.title}
            </h2>
            <p className="mt-2 leading-relaxed text-text-main">{s.body}</p>
          </section>
        ))}
      </div>

      <ShareSheet
        query={profileCardQuery(ctx, profile.nickname, sections)}
        via="profile"
        label="나의 조각 카드"
      />

      {/* P7 궁합 — 우리의 조합 입구 */}
      <Link
        href="/match"
        className="press mt-4 block w-full rounded-card border border-primary-green/30 bg-warm-surface py-3.5 text-center font-medium text-primary-green"
      >
        우리의 조합 보기 — 연인·친구·동료 🍃
      </Link>

      <form action={signOut} className="mt-8">
        <button className="press text-sm text-text-soft underline">잠시 떠나기 (로그아웃)</button>
      </form>
    </main>
  );
}
