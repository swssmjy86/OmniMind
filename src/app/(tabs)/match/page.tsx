import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import MatchForm from "@/components/match/MatchForm";
import { SLUG_TO_MODE, type MatchMe } from "@/lib/engine/match";
import type { ProfileRow, ConnectionRow } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/** P7 궁합 "우리의 조합" — 내 프로필 × 상대(생년월일 + MBTI 선택). */
export default async function MatchPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: ProfileRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    profile = data ?? null;
  }

  if (!profile) {
    return (
      <main className="p-6">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          우리의 조합
        </h1>
        <p className="mt-4 text-text-soft">
          두 사람의 결을 이으려면, 먼저 당신의 결부터 알아야 해요.
        </p>
        <Link
          href="/onboarding"
          className="press mt-6 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
        >
          나를 알아보기 ✨
        </Link>
      </main>
    );
  }

  const ctx = profile.profile_context;
  const me: MatchMe = {
    element: ctx.dayMaster.element,
    zodiac: ctx.zodiac,
    mbti: ctx.mbti.type,
    dayGanzhi: ctx.pillars.day, // 천간합·일지 합충(간지의 인연)까지 읽는다
  };

  // P7-2 — 내가 초대했거나 수락한 연결 목록(마이그레이션 0005 전이면 조용히 빈 목록).
  const { data: conns } = await supabase
    .from("connections").select("*")
    .or(`inviter_id.eq.${user!.id},invitee_id.eq.${user!.id}`)
    .order("created_at", { ascending: false }).limit(20)
    .returns<ConnectionRow[]>();
  const connections = conns ?? [];

  return (
    <main className="p-6 pb-24">
      <Link href="/me" className="text-sm text-text-soft">
        ← 온전한 나
      </Link>
      <h1 className="mt-2 font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        우리의 조합
      </h1>
      <p className="mt-2 leading-relaxed text-text-soft">
        연인, 친구, 동료 — 소중한 사람의 생년월일을 알려주시면, 두 분의 결이 만나는 방식을
        읽어드릴게요.
      </p>
      <MatchForm me={me} nickname={profile.nickname} />

      {connections.length > 0 && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
            이어진 조합
          </h2>
          <div className="mt-3 space-y-2">
            {connections.map((c) => {
              const iAmInviter = c.inviter_id === user!.id;
              const otherName = iAmInviter ? c.invitee_nickname : c.inviter_nickname;
              return (
                <Link
                  key={c.id}
                  href={`/connect/${c.token}`}
                  className="flex items-center justify-between rounded-card bg-warm-surface px-4 py-3"
                >
                  <span className="text-text-main">
                    {c.status === "accepted"
                      ? `${otherName}님과의 ${SLUG_TO_MODE[c.mode]} 조합`
                      : `${SLUG_TO_MODE[c.mode]} 초대장 — 기다리는 중`}
                  </span>
                  <span className="text-sm text-text-soft">
                    {c.status === "accepted" ? "보기 →" : "🍃"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
