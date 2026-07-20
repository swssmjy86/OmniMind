import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isPremium, FREE_FOR_ALL } from "@/lib/consult/quota";
import { toKstParts } from "@/lib/engine/kst";
import { PASS_DAYS, CREDIT_PACKAGES } from "@/lib/payment/constants";
import CreditPayButton from "@/components/premium/CreditPayButton";
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

  // 무료 전환(2026-07-21) — 결제 화면 자체를 숨긴다. 코드는 그대로 두어 나중에
  // FREE_FOR_ALL을 끄면 바로 되돌아온다.
  if (FREE_FOR_ALL) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          지금은 모두 무료예요
        </h1>
        <p className="text-text-soft">
          로그인만 하면 마음·고민 상담을 포함해 모든 풀이를 마음껏 이용할 수 있어요.
        </p>
        <Link href="/mind" className="mt-2 text-sm text-text-soft underline underline-offset-4">
          마음으로 돌아가기
        </Link>
      </main>
    );
  }

  const now = new Date();
  const legacyPremium = isPremium(profile.premium_until, now);
  const credits = profile.consult_credits ?? 0;

  return (
    <main className="flex min-h-dvh flex-col gap-8 p-6">
      <header>
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          마음, 더 깊이
        </h1>
        <p className="mt-2 text-text-soft">
          로그인하면 마음·고민 이야기를 하루 한 번씩 무료로 나눌 수 있어요. 그 이상은 상담
          크레딧으로 이어가요 — 크레딧을 쓰는 상담은 더 깊고 전문적인 답을 드려요.
        </p>
      </header>

      {legacyPremium && profile.premium_until && (
        <section className="rounded-card border border-text-soft/15 bg-warm-surface p-5">
          <p className="text-sm text-text-soft">지금 함께하고 있어요</p>
          <p className="mt-1 font-medium">
            {kstDateLabel(profile.premium_until)}까지 마음·고민 이야기 무제한 ✨
          </p>
          <p className="mt-3 text-sm text-text-soft">
            예전에 시작한 {PASS_DAYS}일 이용권이에요. 기간이 끝나면 이후로는 아래 상담
            크레딧으로 이어갈 수 있어요.
          </p>
        </section>
      )}

      <section className="rounded-card border border-text-soft/15 bg-warm-surface p-5">
        <p className="text-sm text-text-soft">지금 남은 상담 크레딧</p>
        <p className="mt-1 text-lg font-medium">{credits}회</p>
      </section>

      <section className="flex flex-col gap-3">
        <p className="font-medium">상담 크레딧 더하기</p>
        <ul className="space-y-1.5 text-sm text-text-soft">
          <li>· 마음·고민 상담 1회당 크레딧 1회 차감</li>
          <li>· 크레딧을 쓰는 상담은 더 깊고 구체적인 전문 상담 수준으로 답해요</li>
        </ul>
        <div className="mt-2 flex flex-col gap-2">
          {CREDIT_PACKAGES.map((pkg) => (
            <CreditPayButton key={pkg.id} pkg={pkg} />
          ))}
        </div>
      </section>

      <Link href="/mind" className="text-center text-sm text-text-soft underline underline-offset-4">
        마음으로 돌아가기
      </Link>
    </main>
  );
}
