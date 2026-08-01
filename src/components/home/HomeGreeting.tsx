"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { loadLocalProfile, firstSeenAt } from "@/lib/profile/local";
import { currentMilestone, isMilestoneToday } from "@/lib/interpret/milestone";
import { PERSONAS } from "@/lib/persona/personas";
import { PERSONA_IMAGES } from "@/lib/persona/images";

/**
 * 홈 인사 — 로컬 프로필(기기 저장)에 따라 함께한 날수 배지와, 프로필이 없을 때의 오늘의운세
 * 유도 배너를 렌더한다. draft를 클라이언트에서만 읽을 수 있어 분리한 작은 클라이언트 조각.
 */
export default function HomeGreeting() {
  const [ready, setReady] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [companionDays, setCompanionDays] = useState(0);

  useEffect(() => {
    const p = loadLocalProfile();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasProfile(Boolean(p));
    if (p) {
      const days = Math.max(1, Math.floor((Date.now() - firstSeenAt()) / 86_400_000) + 1);
      setCompanionDays(days);
    }
    setReady(true);
  }, []);

  const badge = currentMilestone(companionDays);
  const justReached = Boolean(isMilestoneToday(companionDays));
  const [dalzigiLine1, dalzigiLine2] = PERSONAS.dalzigi.homeLine.split(/(?<=\.)\s+/);

  return (
    <>
      <div className="flex items-baseline justify-between">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          옴니마인드
        </h1>
        {companionDays > 0 && (
          <span className="flex items-center gap-1 text-xs text-text-soft">
            함께한 지 {companionDays}일째
            {badge && (
              <span
                className={`rounded-full bg-warm-surface px-2 py-0.5 text-primary-green ${justReached ? "badge-pop" : ""}`}
              >
                {badge.emoji} {badge.label}
              </span>
            )}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-text-soft">오늘 밤도 당신의 이야기를 켜 두었어요.</p>

      {/* 프로필 없으면 오늘의운세로 유도 — 달지기 배너(버튼 없이 카드 전체가 입구).
          ?input=1 — 인트로 영상이 걷힌 뒤 생년월일 팝업을 (이미 저장돼 있어도) 띄운다. */}
      {ready && !hasProfile && (
        <Link
          href="/today?input=1"
          className="press relative isolate mt-6 flex min-h-44 flex-col overflow-hidden rounded-card border border-accent-coral/30 bg-warm-surface p-5"
        >
          <span aria-hidden className="absolute inset-0 z-[-1]">
            <Image
              src={PERSONA_IMAGES.dalzigi.full}
              alt=""
              fill
              unoptimized
              className="object-cover"
              style={{ objectPosition: "50% 47%", transform: "scale(1.15)", transformOrigin: "0% 47%" }}
            />
            <span className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--warm-surface)_92%,transparent)_0%,color-mix(in_srgb,var(--warm-surface)_50%,transparent)_50%,color-mix(in_srgb,var(--warm-surface)_8%,transparent)_100%)]" />
          </span>
          <p className="max-w-[70%] text-[15px] font-medium leading-relaxed text-text-main">
            &ldquo;{dalzigiLine1}
            {dalzigiLine2 && (
              <>
                <br />
                <span className="text-moon-gold">{dalzigiLine2}</span>
              </>
            )}
            &rdquo;
          </p>
        </Link>
      )}
    </>
  );
}
