import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { computeDeepMatch, SLUG_TO_MODE } from "@/lib/engine/match";
import { assembleDeepMatch } from "@/lib/interpret/content/match";
import { acceptInvite } from "@/lib/match/actions";
import type { ProfileRow, ConnectionRow } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/** P7-2 초대 연결 — 초대장 열람·수락·심층 궁합 결과. */
export default async function ConnectPage({
  params,
}: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: conn } = await supabase
    .from("connections").select("*").eq("token", token).maybeSingle<ConnectionRow>();

  if (!conn) {
    return (
      <Shell title="우리의 조합">
        <p className="mt-4 leading-relaxed text-text-soft">
          이 초대장은 찾을 수 없어요. 이미 시간이 지났거나, 주소가 살짝 어긋났을 수 있어요.
        </p>
        <Link href="/" className="mt-6 block text-center text-sm text-primary-green underline">
          옴니마인드 둘러보기
        </Link>
      </Shell>
    );
  }

  const mode = SLUG_TO_MODE[conn.mode];

  // ── 수락 완료: 두 사람의 심층 궁합 ──
  if (conn.status === "accepted" && conn.invitee_profile && conn.invitee_nickname) {
    const iAmInviter = user?.id === conn.inviter_id;
    const me = iAmInviter ? conn.inviter_profile : conn.invitee_profile;
    const myName = iAmInviter ? conn.inviter_nickname : conn.invitee_nickname;
    const partner = iAmInviter ? conn.invitee_profile : conn.inviter_profile;
    const partnerName = iAmInviter ? conn.invitee_nickname : conn.inviter_nickname;

    const match = computeDeepMatch(me, partner, mode);
    const sections = assembleDeepMatch({
      match, myElement: me.dayMaster.element, myName, partnerName,
    });

    return (
      <Shell title="우리의 조합">
        <p className="mt-1 text-sm text-text-soft">
          {conn.inviter_nickname}님과 {conn.invitee_nickname}님, 두 이야기가 이어졌어요.
        </p>
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
        <Link
          href="/match"
          className="press mt-6 block w-full rounded-card border border-primary-green/30 py-3.5 text-center font-medium text-primary-green"
        >
          우리의 조합으로 돌아가기
        </Link>
      </Shell>
    );
  }

  // ── 대기 중 ──
  const invitedLine = `${conn.inviter_nickname}님이 당신과의 조합을 궁금해해요.`;

  if (user && user.id === conn.inviter_id) {
    return (
      <Shell title="우리의 조합">
        <p className="mt-4 leading-relaxed text-text-soft">
          상대가 아직 도착하지 않았어요. 건네드린 링크로 상대가 자신의 결을 알게 되면, 두 분의
          심층 조합이 여기서 열려요.
        </p>
        <Link href="/match" className="mt-6 block text-center text-sm text-primary-green underline">
          ← 우리의 조합
        </Link>
      </Shell>
    );
  }

  let hasProfile = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles").select("user_id").eq("user_id", user.id).maybeSingle<Pick<ProfileRow, "user_id">>();
    hasProfile = !!profile;
  }

  if (!user || !hasProfile) {
    return (
      <Shell title="우리의 조합">
        <p className="mt-4 leading-relaxed text-text-main">{invitedLine}</p>
        <p className="mt-2 leading-relaxed text-text-soft">
          당신의 결을 먼저 알아본 뒤, 이 초대장 링크로 다시 와주세요. 두 분의 이야기를 깊이
          이어드릴게요.
        </p>
        <Link
          href="/onboarding"
          className="press mt-6 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
        >
          나를 알아보기 ✨
        </Link>
      </Shell>
    );
  }

  async function accept() {
    "use server";
    const res = await acceptInvite(token);
    if (res.ok) redirect(`/connect/${token}`);
    redirect(`/connect/${token}?status=${res.reason}`);
  }

  return (
    <Shell title="우리의 조합">
      <p className="mt-4 leading-relaxed text-text-main">{invitedLine}</p>
      <p className="mt-2 leading-relaxed text-text-soft">
        수락하면 두 분의 사주·별자리가 만나는 방식을 심층으로 읽어드려요. 결과는 두 분만
        볼 수 있어요.
      </p>
      <form action={accept} className="mt-6">
        <button className="press w-full rounded-card bg-accent-coral py-3.5 font-medium text-white">
          {mode}의 조합 잇기 ✨
        </button>
      </form>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="p-6 pb-24">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        {title}
      </h1>
      {children}
    </main>
  );
}
