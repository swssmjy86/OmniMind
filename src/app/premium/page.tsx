import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isPremium } from "@/lib/chat/quota";
import { toKstParts } from "@/lib/engine/kst";
import { PASS_PRICE, PASS_DAYS } from "@/lib/payment/constants";
import PayButton from "@/components/premium/PayButton";
import type { ProfileRow } from "@/lib/db/types";

export const dynamic = "force-dynamic";

function kstDateLabel(iso: string): string {
  const t = toKstParts(new Date(iso));
  return `${t.y}년 ${t.mo}월 ${t.d}일`;
}

export default async function PremiumPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
  if (!profile) redirect("/onboarding");

  const now = new Date();
  const premium = isPremium(profile.premium_until, now);

  return (
    <main className="flex min-h-dvh flex-col gap-8 p-6">
      <header>
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          마음, 더 깊이
        </h1>
        <p className="mt-2 text-text-soft">
          하루 열 번의 약속 너머, 언제든 마음을 꺼내놓을 수 있는 자리를 열어두었어요.
        </p>
      </header>

      {premium && profile.premium_until ? (
        <section className="rounded-card border border-text-soft/15 bg-warm-surface p-5">
          <p className="text-sm text-text-soft">지금 함께하고 있어요</p>
          <p className="mt-1 font-medium">
            {kstDateLabel(profile.premium_until)}까지 마음 이야기 무제한 ✨
          </p>
          <p className="mt-3 text-sm text-text-soft">
            지금 이용권을 더하면 남은 날 위에 {PASS_DAYS}일이 그대로 이어져요.
          </p>
        </section>
      ) : (
        <section className="rounded-card border border-text-soft/15 bg-warm-surface p-5">
          <p className="font-medium">프리미엄 {PASS_DAYS}일 이용권</p>
          <ul className="mt-3 space-y-1.5 text-sm text-text-soft">
            <li>· 마음 이야기 하루 제한 없이, 마음껏</li>
            <li>· 당신의 사주·성향을 기억한 채 이어지는 대화</li>
          </ul>
          <p className="mt-4 text-lg font-medium">{PASS_PRICE.toLocaleString()}원</p>
        </section>
      )}

      <PayButton />

      <Link href="/mind" className="text-center text-sm text-text-soft underline underline-offset-4">
        마음으로 돌아가기
      </Link>
    </main>
  );
}
