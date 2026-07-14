import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { assembleProfile } from "@/lib/interpret/templates";
import SajuChart from "@/components/profile/SajuChart";
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
            className="mt-6 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
          >
            나를 알아보기 ✨
          </Link>
          {user && (
            <form action={signOut} className="mt-4">
              <button className="text-sm text-text-soft underline">잠시 떠나기 (로그아웃)</button>
            </form>
          )}
        </div>
      </main>
    );
  }

  const ctx = profile.profile_context;

  return (
    <main className="p-6 pb-24">
      <p className="text-text-soft">온전한 나</p>
      <h1 className="mt-1 font-[family-name:var(--font-serif-kr)] text-3xl text-primary-green">
        {profile.nickname}님의 이야기
      </h1>

      <div className="mt-6">
        <SajuChart ctx={ctx} />
      </div>

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

      <form action={signOut} className="mt-8">
        <button className="text-sm text-text-soft underline">잠시 떠나기 (로그아웃)</button>
      </form>
    </main>
  );
}
