"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { currentDaeun } from "@/lib/engine/daeun";
import { daeunSeasonText } from "@/lib/interpret/content/daeun";
import { toKstParts } from "@/lib/engine/kst";
import { assembleProfile } from "@/lib/interpret/templates";
import { profileCardQuery } from "@/lib/share/card-copy";
import { loadLocalProfile, type LocalProfile } from "@/lib/profile/local";
import SajuChart from "@/components/profile/SajuChart";
import ShareSheet from "@/components/share/ShareSheet";
import ProfileNeeded from "@/components/profile/ProfileNeeded";

/**
 * 나의 조각 — 익명 로컬. 기기에 저장된 프로필(draft)로 명식·대운·해석 섹션을 계산해 보여준다.
 * 서버·계정 없음. 섹션은 assembleProfile(순수 템플릿)로 매번 조립한다.
 */
export default function MeView() {
  const [state, setState] = useState<"loading" | "none" | LocalProfile>("loading");

  useEffect(() => {
    const p = loadLocalProfile();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(p ?? "none");
  }, []);

  if (state === "loading") {
    return <p className="p-6 text-center text-sm text-text-soft">불러오는 중…</p>;
  }
  if (state === "none") {
    return (
      <ProfileNeeded
        title="온전한 나"
        message="사주와 별자리를 종합해 '온전한 나'를 만나보세요."
      />
    );
  }

  const { ctx, nickname, draft } = state;
  const sections = assembleProfile(ctx, nickname);

  let seasonCard: { ganzhi: string; fromAge: number; toAge: number } | null = null;
  if (ctx.daeun) {
    const t = toKstParts(new Date());
    const age = Math.max(0, t.y - Number(draft.birthDate.slice(0, 4)));
    seasonCard = currentDaeun(ctx.daeun, age);
  }

  return (
    <main className="fade-rise p-6 pb-24">
      <p className="text-text-soft">온전한 나</p>
      <h1 className="mt-1 font-[family-name:var(--font-serif-kr)] text-3xl text-primary-green">
        {nickname}님의 이야기
      </h1>

      <div className="mt-6">
        <SajuChart ctx={ctx} />
      </div>

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
            당신의 첫 대운은{" "}
            {ctx.daeun.startAgePrecise.months > 0
              ? `${ctx.daeun.startAgePrecise.years}세 ${ctx.daeun.startAgePrecise.months}개월`
              : `${ctx.daeun.startAgePrecise.years}세`}{" "}
            무렵부터 시작돼요. 아직은 타고난 결이 자라나는 계절이에요.
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
        {sections.map((s, i) => (
          <section key={`${i}-${s.title}`} className="rounded-card bg-warm-surface p-5">
            <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
              {s.title}
            </h2>
            <p className="mt-2 leading-relaxed text-text-main">{s.body}</p>
          </section>
        ))}
      </div>

      <ShareSheet
        query={profileCardQuery(ctx, nickname, sections)}
        via="profile"
        label="나의 조각 카드"
      />

      <Link
        href="/saju/match-deep"
        className="press mt-4 block w-full rounded-card border border-primary-green/30 bg-warm-surface py-3.5 text-center font-medium text-primary-green"
      >
        우리의 조합 보기 — 연인·친구·동료 🍃
      </Link>
    </main>
  );
}
