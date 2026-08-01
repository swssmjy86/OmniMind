"use client";

import { useEffect, useState } from "react";
import { loadLocalProfile, type LocalProfile } from "@/lib/profile/local";
import ProfileNeeded from "@/components/profile/ProfileNeeded";
import ConcernRoom from "./ConcernRoom";

/**
 * 고민 상담 진입 게이트 — 로컬 프로필이 있으면 ConcernRoom을, 없으면 온보딩 유도를 렌더한다.
 */
export default function ConcernGate() {
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
        title="고민"
        message="마음이 흔들리는 순간, 함께 생각해드릴게요. 먼저 당신의 결을 알아야 더 깊이 도울 수 있어요."
      />
    );
  }
  return <ConcernRoom nickname={state.nickname} profile={state.ctx} />;
}
